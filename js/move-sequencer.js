import { getAllMoves, getMovesByEnergy } from './moves.js';
import { Skeleton, JOINTS } from './skeleton.js';

export class MoveSequencer {
    constructor() {
        this.skeleton = new Skeleton();
        this.currentMove = null;
        this.nextMove = null;
        this.moveProgress = 0;        // 0..1 progress through current move
        this.moveStartTime = 0;
        this.moveDuration = 0;         // duration in seconds (computed from BPM + durationBeats)
        this.blendProgress = 0;        // 0..1 for blending between moves (0 = no blend)
        this.blendDuration = 0.15;     // seconds to blend between moves
        this.blendStartTime = 0;
        this.isBlending = false;

        this.bpm = 120;
        this.energy = 0.3;
        this.lastMoves = [];           // track last 3 moves to avoid repetition
        this.beatCount = 0;
        this.beatTimes = [];           // timestamps of recent beats for BPM estimation

        // Idle sway state
        this._idlePhase = 0;

        // Start with a random low-energy move
        this._pickNewMove(false);
        this.moveStartTime = performance.now() / 1000;
        this._recomputeDuration();
    }

    /**
     * Recompute the current move's duration in seconds from BPM.
     */
    _recomputeDuration() {
        if (this.currentMove) {
            this.moveDuration = (this.currentMove.durationBeats / this.bpm) * 60;
        }
    }

    /**
     * Main update — call once per frame.
     * @param {Object} analysis  Audio analysis: { energy: number, isBeat: boolean, ... }
     * @param {number} currentTime  Current time in seconds (e.g. performance.now() / 1000)
     */
    update(analysis, currentTime) {
        // 1. Smooth energy tracking (low-pass filter)
        this.energy += (analysis.energy - this.energy) * 0.1;

        // 2. BPM estimation from beat intervals
        if (analysis.isBeat) {
            this.beatCount++;
            this.beatTimes.push(currentTime);

            // Keep only the last 8 beats for averaging
            if (this.beatTimes.length > 8) {
                this.beatTimes.shift();
            }

            // Need at least 2 beats to compute an interval
            if (this.beatTimes.length >= 2) {
                const intervals = [];
                for (let i = 1; i < this.beatTimes.length; i++) {
                    intervals.push(this.beatTimes[i] - this.beatTimes[i - 1]);
                }
                const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                if (avgInterval > 0) {
                    const estimatedBPM = 60 / avgInterval;
                    // Clamp to sensible range
                    const clampedBPM = Math.max(60, Math.min(200, estimatedBPM));
                    // Smooth BPM changes — don't jump wildly
                    this.bpm += (clampedBPM - this.bpm) * 0.2;
                    this._recomputeDuration();
                }
            }
        }

        // 3. Update move progress
        if (this.moveDuration > 0) {
            this.moveProgress = (currentTime - this.moveStartTime) / this.moveDuration;
        }

        // 4. If move is ending (progress >= 0.85), start blending to the next move
        if (this.moveProgress >= 0.85 && !this.isBlending) {
            this.isBlending = true;
            this.blendStartTime = currentTime;
            this.blendProgress = 0;

            // Decide whether this is a power move trigger
            const isPowerMove = analysis.isBeat && this.energy > 0.7;
            this._pickNextMove(isPowerMove);
        }

        // 5. If blending, update blend progress
        if (this.isBlending) {
            this.blendProgress = Math.min(
                1,
                (currentTime - this.blendStartTime) / this.blendDuration
            );

            // Blend complete — switch to the next move
            if (this.blendProgress >= 1) {
                this.currentMove = this.nextMove;
                this.nextMove = null;
                this.moveStartTime = currentTime;
                this.moveProgress = 0;
                this.isBlending = false;
                this.blendProgress = 0;
                this._recomputeDuration();
            }
        }

        // 6. If the move has fully elapsed without a blend starting (safety net)
        if (this.moveProgress >= 1 && !this.isBlending) {
            this._pickNewMove(false);
            this.moveStartTime = currentTime;
            this.moveProgress = 0;
            this._recomputeDuration();
        }

        // Advance idle phase for subtle sway when no move is active
        this._idlePhase += 0.02;
    }

    /**
     * Return the current pose to render this frame.
     * @returns {Object} Pose object with all JOINTS having {x, y} absolute positions
     */
    getCurrentPose() {
        const defaultPose = this.skeleton.getDefaultPose();

        if (!this.currentMove) {
            return this._applyIdleSway(defaultPose);
        }

        // Get the current move's delta at current progress
        const clampedProgress = Math.max(0, Math.min(1, this.moveProgress));
        const currentDelta = this._getMovePoseAtProgress(this.currentMove, clampedProgress);

        let finalDelta;

        if (this.isBlending && this.nextMove) {
            // Get the next move's delta at t=0 (its starting pose, which should be near default)
            // As blend progresses we ease from currentDelta into nextDelta-at-start
            const nextDelta = this._getMovePoseAtProgress(this.nextMove, 0);

            // Smoothstep the blend for a nice transition
            const t = this.blendProgress;
            const tSmooth = t * t * (3 - 2 * t);

            finalDelta = {};
            for (const joint of JOINTS) {
                const cd = currentDelta[joint] || { x: 0, y: 0 };
                const nd = nextDelta[joint] || { x: 0, y: 0 };
                finalDelta[joint] = {
                    x: cd.x + (nd.x - cd.x) * tSmooth,
                    y: cd.y + (nd.y - cd.y) * tSmooth
                };
            }
        } else {
            finalDelta = currentDelta;
        }

        // Apply deltas to default pose
        const finalPose = {};
        for (const joint of JOINTS) {
            const d = finalDelta[joint] || { x: 0, y: 0 };
            finalPose[joint] = {
                x: defaultPose[joint].x + d.x,
                y: defaultPose[joint].y + d.y
            };
        }

        return finalPose;
    }

    /**
     * Interpolate between the two keyframes surrounding a given progress value.
     * Returns a delta object (offsets from default pose) for every joint.
     * @param {Object} move  A move definition from moves.js
     * @param {number} progress  0..1
     * @returns {Object}  { jointName: {x, y}, ... } deltas
     */
    _getMovePoseAtProgress(move, progress) {
        const keyframes = move.keyframes;

        // Find the two keyframes that surround `progress`
        let kfBefore = keyframes[0];
        let kfAfter = keyframes[keyframes.length - 1];

        for (let i = 0; i < keyframes.length - 1; i++) {
            if (progress >= keyframes[i].time && progress <= keyframes[i + 1].time) {
                kfBefore = keyframes[i];
                kfAfter = keyframes[i + 1];
                break;
            }
        }

        // Compute local t within this keyframe segment
        const segmentLength = kfAfter.time - kfBefore.time;
        const localT = segmentLength > 0
            ? (progress - kfBefore.time) / segmentLength
            : 0;

        // Smoothstep for nice easing between keyframes
        const t = localT * localT * (3 - 2 * localT);

        // Collect all joints mentioned in either keyframe
        const allJoints = new Set([
            ...Object.keys(kfBefore.pose || {}),
            ...Object.keys(kfAfter.pose || {})
        ]);

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

    /**
     * Pick a new move and set it as currentMove (used during initialization and safety resets).
     * @param {boolean} isPowerMove  If true, always pick a high-energy move
     */
    _pickNewMove(isPowerMove) {
        const move = this._selectMove(isPowerMove);
        this.currentMove = move;
        this._trackMove(move);
    }

    /**
     * Pick a new move and set it as nextMove (used during blending).
     * @param {boolean} isPowerMove  If true, always pick a high-energy move
     */
    _pickNextMove(isPowerMove) {
        const move = this._selectMove(isPowerMove);
        this.nextMove = move;
        this._trackMove(move);
    }

    /**
     * Core move selection logic. Picks a move based on energy and avoids recent repeats.
     * @param {boolean} isPowerMove
     * @returns {Object} A move definition
     */
    _selectMove(isPowerMove) {
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

        const candidates = getMovesByEnergy(energyLevel);

        // Filter out the last 3 moves to avoid repetition
        const recentNames = this.lastMoves.map(m => m.name);
        let filtered = candidates.filter(m => !recentNames.includes(m.name));

        // If nothing left after filtering, use all candidates for that energy
        if (filtered.length === 0) {
            filtered = candidates;
        }

        // Pick a random move from the filtered set
        const pick = filtered[Math.floor(Math.random() * filtered.length)];
        return pick;
    }

    /**
     * Record a move in the history, keeping only the last 3.
     * @param {Object} move
     */
    _trackMove(move) {
        if (!move) return;
        this.lastMoves.push(move);
        if (this.lastMoves.length > 3) {
            this.lastMoves.shift();
        }
    }

    /**
     * Add a very subtle idle sway to a pose (used when no move is active or no audio).
     * @param {Object} pose
     * @returns {Object} Pose with subtle sway applied
     */
    _applyIdleSway(pose) {
        const swayX = Math.sin(this._idlePhase) * 3;
        const swayY = Math.sin(this._idlePhase * 0.7) * 2;

        const result = {};
        for (const joint of JOINTS) {
            result[joint] = {
                x: pose[joint].x + swayX,
                y: pose[joint].y + swayY
            };
        }
        return result;
    }
}
