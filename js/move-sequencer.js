import { getAllMoves, getMovesByEnergy } from './moves.js';
import { Skeleton, JOINTS } from './skeleton.js';
import { computeBoneLengths, globalToAngles, anglesToGlobal } from './fusion.js';

// Joints belonging to upper vs lower body for layered movement
const UPPER_JOINTS = ['head', 'neck', 'leftShoulder', 'rightShoulder', 'leftElbow', 'rightElbow', 'leftHand', 'rightHand'];
const LOWER_JOINTS = ['hip', 'leftKnee', 'rightKnee', 'leftFoot', 'rightFoot'];

export class MoveSequencer {
    constructor() {
        this.skeleton = new Skeleton();

        // Two independent move layers: upper body and full/lower body
        this.layers = {
            primary: this._createLayer(),   // full-body or legs moves
            arms:    this._createLayer()    // arms-only moves (overlay)
        };

        this.bpm = 120;
        this.energy = 0.3;
        this.beatTimes = [];
        this.beatCount = 0;

        // Groove system — persistent bounce on every beat
        this.groovePhase = 0;         // 0..1 cycles on each beat
        this.grooveIntensity = 0;     // smoothed, ramps up with energy
        this.lastBeatTime = 0;
        this.beatInterval = 0.5;      // seconds between beats (60/bpm)

        // Dynamic amplitude — scales move deltas by energy
        this.amplitudeScale = 1.0;

        // Micro-variation — random offsets per move instance
        this.variationSeed = Math.random();

        // Time tracking
        this._initialized = false;
        this._lastTime = 0;
        this._idlePhase = 0;

        // Fusion: learnt moves + probability slider
        this.fusionProbability = 0;   // 0 = pure freestyle, 1 = pure learnt
        this._learntMoves = [];       // learnt moves converted to sequencer format
        this._learntLoaded = false;

        // Initialize with a move
        this._pickNewMove(this.layers.primary, false);
        this._pickNewMove(this.layers.arms, false, 'arms');
    }

    /**
     * Load learnt moves from manifest, convert to sequencer-compatible format.
     * Each learnt move becomes a move object with keyframes (deltas) + metadata.
     */
    async loadLearntMoves() {
        try {
            const resp = await fetch('library/moves/manifest.json');
            if (!resp.ok) return;
            const manifest = await resp.json();

            const defaultPose = this.skeleton.getDefaultPose();

            for (const entry of manifest) {
                const moveResp = await fetch(`library/moves/${entry.stem}.json`);
                if (!moveResp.ok) continue;
                const data = await moveResp.json();

                // Convert all frames to delta keyframes
                const totalFrames = data.poses.length;
                const keyframes = [{ time: 0.0, pose: {} }]; // start at standing

                for (let i = 0; i < totalFrames; i++) {
                    const raw = data.poses[i];
                    const t = totalFrames > 1 ? i / (totalFrames - 1) : 0;

                    const pose = {};
                    for (const joint of JOINTS) {
                        const arr = raw.joints[joint];
                        if (!arr) continue;
                        const dx = Math.round((arr[0] - defaultPose[joint].x) * 10) / 10;
                        const dy = Math.round((arr[1] - defaultPose[joint].y) * 10) / 10;
                        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
                            pose[joint] = { x: dx, y: dy };
                        }
                    }

                    // Skip if this is the first or last frame (we add standing bookends)
                    if (i > 0 && i < totalFrames - 1) {
                        keyframes.push({ time: t, pose });
                    }
                }

                keyframes.push({ time: 1.0, pose: {} }); // end at standing

                const move = {
                    name: entry.name,
                    energy: data.meta.energy || 'mid',
                    durationBeats: data.meta.durationBeats || 2,
                    type: data.meta.type || 'full-body',
                    fixedDuration: data.meta.duration || 5.0,
                    isLearnt: true,
                    keyframes,
                };

                this._learntMoves.push(move);
            }

            this._learntLoaded = this._learntMoves.length > 0;
            console.log(`Fusion: loaded ${this._learntMoves.length} learnt moves`);
        } catch {
            // No manifest or load error — fusion just won't have learnt moves
        }
    }

    _createLayer() {
        return {
            currentMove: null,
            nextMove: null,
            moveProgress: 0,
            moveStartTime: 0,
            moveDuration: 1,
            isBlending: false,
            blendProgress: 0,
            blendStartTime: 0,
            blendDuration: 0.12,
            lastMoves: [],
            // Per-instance variation
            scaleX: 1.0,
            scaleY: 1.0,
            offsetX: 0,
            mirror: false
        };
    }

    update(analysis, currentTime) {
        if (!this._initialized) {
            this.layers.primary.moveStartTime = currentTime;
            this.layers.arms.moveStartTime = currentTime;
            this._lastTime = currentTime;
            this._initialized = true;
        }

        const dt = currentTime - this._lastTime;
        this._lastTime = currentTime;

        // Smooth energy tracking
        this.energy += (analysis.energy - this.energy) * 0.12;

        // Dynamic amplitude: quiet = 0.5x, normal = 1x, loud = 1.4x
        const targetAmp = 0.5 + this.energy * 0.9;
        this.amplitudeScale += (targetAmp - this.amplitudeScale) * 0.08;

        // BPM estimation from detected beats
        if (analysis.isBeat) {
            this.beatCount++;
            this.beatTimes.push(currentTime);
            this.lastBeatTime = currentTime;
            if (this.beatTimes.length > 8) this.beatTimes.shift();

            if (this.beatTimes.length >= 2) {
                const intervals = [];
                for (let i = 1; i < this.beatTimes.length; i++) {
                    intervals.push(this.beatTimes[i] - this.beatTimes[i - 1]);
                }
                const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                if (avgInterval > 0) {
                    const estimatedBPM = Math.max(60, Math.min(200, 60 / avgInterval));
                    this.bpm += (estimatedBPM - this.bpm) * 0.2;
                    this.beatInterval = 60 / this.bpm;
                }
            }
        }

        // Groove phase — cycles 0..1 on each beat interval
        if (this.beatInterval > 0) {
            const timeSinceBeat = currentTime - this.lastBeatTime;
            this.groovePhase = (timeSinceBeat / this.beatInterval) % 1;
        }
        // Groove intensity ramps with energy but always has a minimum when playing
        const targetGroove = 0.3 + this.energy * 0.7;
        this.grooveIntensity += (targetGroove - this.grooveIntensity) * 0.08;

        // Update both layers
        this._updateLayer(this.layers.primary, analysis, currentTime);
        this._updateLayer(this.layers.arms, analysis, currentTime, 'arms');

        // Occasionally trigger a new arms overlay on beats
        if (analysis.isBeat && this.energy > 0.25 && Math.random() < 0.3) {
            if (this.layers.arms.moveProgress > 0.7 || !this.layers.arms.currentMove) {
                this._pickNewMove(this.layers.arms, false, 'arms');
                this.layers.arms.moveStartTime = currentTime;
                this.layers.arms.moveProgress = 0;
                this._applyVariation(this.layers.arms);
            }
        }

        this._idlePhase += dt * 2;
    }

    _updateLayer(layer, analysis, currentTime, typeFilter) {
        if (!layer.currentMove) return;

        // Compute move duration — learnt moves use fixed 5s, freestyle uses BPM
        if (layer.currentMove.fixedDuration) {
            layer.moveDuration = layer.currentMove.fixedDuration;
        } else {
            layer.moveDuration = (layer.currentMove.durationBeats / this.bpm) * 60;
        }
        if (layer.moveDuration <= 0) layer.moveDuration = 1;

        // Update progress
        layer.moveProgress = (currentTime - layer.moveStartTime) / layer.moveDuration;

        // Start blending when move is ~80% done
        if (layer.moveProgress >= 0.80 && !layer.isBlending) {
            layer.isBlending = true;
            layer.blendStartTime = currentTime;
            layer.blendProgress = 0;

            const isPowerMove = analysis.isBeat && this.energy > 0.65;
            this._pickNextMove(layer, isPowerMove, typeFilter);
        }

        // Update blend
        if (layer.isBlending) {
            layer.blendProgress = Math.min(1, (currentTime - layer.blendStartTime) / layer.blendDuration);

            if (layer.blendProgress >= 1) {
                layer.currentMove = layer.nextMove;
                layer.nextMove = null;
                layer.moveStartTime = currentTime;
                layer.moveProgress = 0;
                layer.isBlending = false;
                layer.blendProgress = 0;
                this._applyVariation(layer);
            }
        }

        // Safety: move fully elapsed
        if (layer.moveProgress >= 1 && !layer.isBlending) {
            this._pickNewMove(layer, false, typeFilter);
            layer.moveStartTime = currentTime;
            layer.moveProgress = 0;
            this._applyVariation(layer);
        }
    }

    getCurrentPose() {
        const defaultPose = this.skeleton.getDefaultPose();
        const finalPose = {};

        // Start from default
        for (const joint of JOINTS) {
            finalPose[joint] = { x: defaultPose[joint].x, y: defaultPose[joint].y };
        }

        // 1. Apply groove bounce — persistent beat-synced dip
        this._applyGroove(finalPose);

        // 2. Apply primary layer (full-body / legs moves)
        const primaryDelta = this._getLayerDelta(this.layers.primary);
        this._applyDelta(finalPose, primaryDelta, JOINTS);

        // 3. Apply arms overlay (only affects upper joints)
        if (this.layers.arms.currentMove && this.layers.arms.currentMove.type === 'arms') {
            const armsDelta = this._getLayerDelta(this.layers.arms);
            this._applyDelta(finalPose, armsDelta, UPPER_JOINTS);
        }

        // 4. Apply subtle secondary motion (head follow-through, arm swing)
        this._applySecondaryMotion(finalPose);

        return finalPose;
    }

    _applyGroove(pose) {
        // Beat bounce: sharp dip down on the beat, smooth rise between beats
        const phase = this.groovePhase;
        const bounceCurve = Math.max(0, Math.cos(phase * Math.PI * 2) * Math.exp(-phase * 3));

        const bounceAmount = this.grooveIntensity * 12 * this.amplitudeScale;
        const dip = bounceCurve * bounceAmount;

        for (const joint of JOINTS) {
            pose[joint].y += dip;
        }

        // Knees bend outward on the dip
        const kneeBend = bounceCurve * this.grooveIntensity * 6;
        pose.leftKnee.x -= kneeBend;
        pose.rightKnee.x += kneeBend;
        pose.leftKnee.y -= kneeBend * 0.5;
        pose.rightKnee.y -= kneeBend * 0.5;

        // Shoulders: subtle counter-bounce
        const shoulderBounce = bounceCurve * this.grooveIntensity * 3;
        pose.leftShoulder.y -= shoulderBounce;
        pose.rightShoulder.y -= shoulderBounce;
    }

    _getLayerDelta(layer) {
        if (!layer.currentMove) return {};

        const progress = Math.max(0, Math.min(1, layer.moveProgress));
        let delta = this._getMovePoseAtProgress(layer.currentMove, progress);

        // Blend with next move if transitioning
        if (layer.isBlending && layer.nextMove) {
            const nextDelta = this._getMovePoseAtProgress(layer.nextMove, 0);
            const t = this._springEase(layer.blendProgress);
            delta = this._mixDeltas(delta, nextDelta, t);
        }

        // Learnt moves are full-fidelity captures — skip variation and amplitude scaling
        if (layer.currentMove && layer.currentMove.isLearnt) {
            return delta;
        }

        // Apply per-instance variation (scale + offset + mirror)
        delta = this._applyDeltaVariation(delta, layer);

        // Apply dynamic amplitude
        for (const joint of JOINTS) {
            if (delta[joint]) {
                delta[joint].x *= this.amplitudeScale;
                delta[joint].y *= this.amplitudeScale;
            }
        }

        return delta;
    }

    _applyDelta(pose, delta, joints) {
        for (const joint of joints) {
            const d = delta[joint];
            if (d) {
                pose[joint].x += d.x;
                pose[joint].y += d.y;
            }
        }
    }

    _applySecondaryMotion(pose) {
        // Head slight delay/follow-through: head lags behind neck direction
        const neckDx = pose.neck.x - 400; // offset from center
        const neckDy = pose.neck.y - 155;
        pose.head.x += neckDx * 0.15;
        pose.head.y += neckDy * 0.1;

        // Subtle hand swing — hands have slight sinusoidal secondary motion
        const swing = Math.sin(this._idlePhase * 1.5) * 3 * this.energy;
        pose.leftHand.x += swing;
        pose.rightHand.x -= swing;
        pose.leftHand.y += Math.cos(this._idlePhase * 1.2) * 2 * this.energy;
        pose.rightHand.y += Math.cos(this._idlePhase * 1.2 + 1) * 2 * this.energy;
    }

    // Spring-like easing: overshoots slightly then settles
    _springEase(t) {
        const c4 = (2 * Math.PI) / 4.5;
        if (t <= 0) return 0;
        if (t >= 1) return 1;
        return 1 - Math.pow(2, -8 * t) * Math.cos(t * c4);
    }

    _getMovePoseAtProgress(move, progress) {
        const keyframes = move.keyframes;
        let kfBefore = keyframes[0];
        let kfAfter = keyframes[keyframes.length - 1];

        for (let i = 0; i < keyframes.length - 1; i++) {
            if (progress >= keyframes[i].time && progress <= keyframes[i + 1].time) {
                kfBefore = keyframes[i];
                kfAfter = keyframes[i + 1];
                break;
            }
        }

        const segmentLength = kfAfter.time - kfBefore.time;
        const localT = segmentLength > 0
            ? (progress - kfBefore.time) / segmentLength
            : 0;

        // Use spring easing for more natural motion with momentum
        const t = this._springEase(localT);

        const delta = {};
        for (const joint of JOINTS) {
            const before = (kfBefore.pose && kfBefore.pose[joint]) || { x: 0, y: 0 };
            const after = (kfAfter.pose && kfAfter.pose[joint]) || { x: 0, y: 0 };
            delta[joint] = {
                x: before.x + (after.x - before.x) * t,
                y: before.y + (after.y - before.y) * t
            };
        }
        return delta;
    }

    _mixDeltas(deltaA, deltaB, t) {
        const result = {};
        for (const joint of JOINTS) {
            const a = deltaA[joint] || { x: 0, y: 0 };
            const b = deltaB[joint] || { x: 0, y: 0 };
            result[joint] = {
                x: a.x + (b.x - a.x) * t,
                y: a.y + (b.y - a.y) * t
            };
        }
        return result;
    }

    _applyVariation(layer) {
        // Random scale 0.85-1.15
        layer.scaleX = 0.85 + Math.random() * 0.3;
        layer.scaleY = 0.9 + Math.random() * 0.2;
        // Random lateral offset ±8px
        layer.offsetX = (Math.random() - 0.5) * 16;
        // 30% chance to mirror the move
        layer.mirror = Math.random() < 0.3;
    }

    _applyDeltaVariation(delta, layer) {
        const result = {};
        for (const joint of JOINTS) {
            const d = delta[joint] || { x: 0, y: 0 };
            let x = d.x * layer.scaleX + layer.offsetX;
            let y = d.y * layer.scaleY;
            // Mirror: flip x deltas
            if (layer.mirror) x = -x;
            result[joint] = { x, y };
        }
        return result;
    }

    _pickNewMove(layer, isPowerMove, typeFilter) {
        const move = this._selectMove(layer, isPowerMove, typeFilter);
        layer.currentMove = move;
        this._trackMove(layer, move);
        this._applyVariation(layer);
    }

    _pickNextMove(layer, isPowerMove, typeFilter) {
        const move = this._selectMove(layer, isPowerMove, typeFilter);
        layer.nextMove = move;
        this._trackMove(layer, move);
    }

    _selectMove(layer, isPowerMove, typeFilter) {
        let energyLevel;
        if (isPowerMove) {
            energyLevel = 'high';
        } else if (this.energy < 0.33) {
            energyLevel = 'low';
        } else if (this.energy < 0.66) {
            energyLevel = 'mid';
        } else {
            energyLevel = 'high';
        }

        // Biased coin flip: with probability p, pick from learnt bucket
        const useLearnt = this._learntLoaded
            && this.fusionProbability > 0
            && Math.random() < this.fusionProbability;

        let candidates;
        if (useLearnt) {
            // Pick from learnt moves, filtered by energy
            candidates = this._learntMoves.filter(m => m.energy === energyLevel);
            // Fall back to all learnt if no energy match
            if (candidates.length === 0) candidates = this._learntMoves;
        } else {
            candidates = getMovesByEnergy(energyLevel);
        }

        // Filter by type if specified
        if (typeFilter) {
            const typed = candidates.filter(m => m.type === typeFilter);
            if (typed.length > 0) candidates = typed;
        }

        // Avoid recent repeats
        const recentNames = layer.lastMoves.map(m => m.name);
        let filtered = candidates.filter(m => !recentNames.includes(m.name));
        if (filtered.length === 0) filtered = candidates;

        return filtered[Math.floor(Math.random() * filtered.length)];
    }

    _trackMove(layer, move) {
        if (!move) return;
        layer.lastMoves.push(move);
        if (layer.lastMoves.length > 3) layer.lastMoves.shift();
    }
}
