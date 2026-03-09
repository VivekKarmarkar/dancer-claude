import { Skeleton, JOINTS } from '../skeleton.js';

export class WildTheme {
    constructor() {
        this.particles = [];
        this.trails = [];
        this.hue = 0;
        this.beatRipples = [];
        this.flashAlpha = 0;
        this.skeleton = new Skeleton();
        this._needsFullClear = true;

        // Spotlight system — 3 colored spots sweeping across the stage
        this.spotlights = [
            { x: 200, targetX: 200, hue: 0, intensity: 0.5, speed: 0.7 },
            { x: 400, targetX: 400, hue: 120, intensity: 0.5, speed: 1.0 },
            { x: 600, targetX: 600, hue: 240, intensity: 0.5, speed: 0.85 }
        ];

        // Laser system
        this.lasers = [];
        this._laserTimer = 0;

        // Wash light state
        this._washR = 0;
        this._washG = 0;
        this._washB = 0;

        // Strobe state
        this._strobeAlpha = 0;
        this._strobeCooldown = 0;

        // Time tracking for animations
        this._time = 0;
    }

    drawBackground(ctx, canvas) {
        // Full clear on first frame after theme switch
        if (this._needsFullClear) {
            ctx.fillStyle = 'rgb(10, 10, 10)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            this._needsFullClear = false;
            return;
        }

        // Semi-transparent clear for motion blur trail effect
        ctx.fillStyle = 'rgba(10, 10, 10, 0.25)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    resetClear() {
        this._needsFullClear = true;
        this.trails = [];
        this.particles = [];
        this.beatRipples = [];
        this.lasers = [];
    }

    getSkeletonStyle(analysis) {
        this.hue = (this.hue + analysis.energy * 3) % 360;
        return {
            strokeColor: `hsl(${this.hue}, 100%, 60%)`,
            lineWidth: 4,
            headRadius: 16,
            headFill: `hsl(${this.hue}, 100%, 60%)`,
            glow: true
        };
    }

    drawEffects(ctx, canvas, analysis, pose) {
        if (!pose) return;

        this._time += 1 / 60;

        // Background lighting (drawn behind everything)
        this._drawWashLights(ctx, canvas, analysis);
        this._drawSpotlights(ctx, canvas, analysis);

        // Existing effects
        this._updateAndDrawParticles(ctx, analysis, pose);
        this._updateAndDrawBeatRipples(ctx, analysis, pose);
        this._updateAndDrawTrails(ctx, pose);

        // Foreground lighting (drawn on top)
        this._drawLasers(ctx, canvas, analysis);
        this._drawStrobe(ctx, canvas, analysis);
    }

    // ── Wash Lights ──────────────────────────────────────────
    // Background color that shifts with frequency bands

    _drawWashLights(ctx, canvas, analysis) {
        // Map frequency bands to RGB — bass=red, mid=green, treble=blue
        const targetR = analysis.bass * 60;
        const targetG = analysis.mid * 40;
        const targetB = analysis.treble * 70;

        // Smooth toward targets
        this._washR += (targetR - this._washR) * 0.15;
        this._washG += (targetG - this._washG) * 0.15;
        this._washB += (targetB - this._washB) * 0.15;

        const r = Math.floor(this._washR);
        const g = Math.floor(this._washG);
        const b = Math.floor(this._washB);

        if (r > 1 || g > 1 || b > 1) {
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.3)`;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    // ── Spotlights ───────────────────────────────────────────
    // Colored beams from the top edge, sweeping left/right

    _drawSpotlights(ctx, canvas, analysis) {
        for (const spot of this.spotlights) {
            // On beat, pick a new random target and boost intensity
            if (analysis.isBeat) {
                spot.targetX = 100 + Math.random() * (canvas.width - 200);
                spot.intensity = 0.6 + analysis.energy * 0.4;
                spot.hue = (spot.hue + 30 + Math.random() * 60) % 360;
            }

            // Continuous drift — slowly wander even without beats
            spot.targetX += Math.sin(this._time * spot.speed * 0.5) * 1.5;
            spot.targetX = Math.max(50, Math.min(canvas.width - 50, spot.targetX));

            // Glide toward target
            spot.x += (spot.targetX - spot.x) * 0.04 * spot.speed;

            // Intensity follows energy continuously, beats just boost it
            const baseIntensity = 0.1 + analysis.energy * 0.3;
            spot.intensity = Math.max(spot.intensity * 0.97, baseIntensity);
            if (spot.intensity < 0.03) continue;

            // Slowly shift hue even without beats
            spot.hue = (spot.hue + analysis.energy * 0.5) % 360;

            // Draw cone of light from top
            const gradient = ctx.createRadialGradient(
                spot.x, -20, 0,
                spot.x, canvas.height * 0.7, canvas.width * 0.3
            );
            gradient.addColorStop(0, `hsla(${spot.hue}, 100%, 60%, ${spot.intensity * 0.25})`);
            gradient.addColorStop(0.5, `hsla(${spot.hue}, 100%, 50%, ${spot.intensity * 0.08})`);
            gradient.addColorStop(1, 'transparent');

            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    }

    // ── Lasers ───────────────────────────────────────────────
    // Diagonal lines shooting across the canvas on beats

    _drawLasers(ctx, canvas, analysis) {
        this._laserTimer += 1 / 60;

        // Spawn lasers on beats, or occasionally from sustained energy
        const spawnLaser = (analysis.isBeat && analysis.energy > 0.3) ||
            (analysis.energy > 0.4 && Math.random() < 0.03);
        if (spawnLaser && this.lasers.length < 12) {
            const count = (analysis.isBeat && analysis.energy > 0.6) ? 3 : 1;
            for (let i = 0; i < count; i++) {
                const fromTop = Math.random() > 0.5;
                const goingRight = Math.random() > 0.5;
                const laserHue = Math.random() * 360;

                this.lasers.push({
                    // Start from a random point on the top or side edge
                    x1: fromTop ? Math.random() * canvas.width : (goingRight ? 0 : canvas.width),
                    y1: fromTop ? 0 : Math.random() * canvas.height * 0.5,
                    // End point — diagonal across
                    x2: fromTop
                        ? (goingRight ? Math.random() * canvas.width * 0.5 + canvas.width * 0.5 : Math.random() * canvas.width * 0.5)
                        : (goingRight ? canvas.width : 0),
                    y2: canvas.height * 0.5 + Math.random() * canvas.height * 0.5,
                    hue: laserHue,
                    alpha: 0.7 + Math.random() * 0.3,
                    width: 1 + Math.random() * 2
                });
            }
        }

        // Draw and decay
        for (let i = this.lasers.length - 1; i >= 0; i--) {
            const l = this.lasers[i];
            l.alpha -= 0.03;

            if (l.alpha <= 0) {
                this.lasers.splice(i, 1);
                continue;
            }

            ctx.save();
            ctx.globalAlpha = l.alpha;
            ctx.strokeStyle = `hsl(${l.hue}, 100%, 60%)`;
            ctx.lineWidth = l.width;
            ctx.shadowColor = `hsl(${l.hue}, 100%, 60%)`;
            ctx.shadowBlur = 8;
            ctx.beginPath();
            ctx.moveTo(l.x1, l.y1);
            ctx.lineTo(l.x2, l.y2);
            ctx.stroke();
            ctx.restore();
        }
    }

    // ── Strobe ───────────────────────────────────────────────
    // Sharp white flash on high-energy beats

    _drawStrobe(ctx, canvas, analysis) {
        this._strobeCooldown -= 1 / 60;

        // Trigger on high-energy beats with cooldown to avoid seizure-inducing flashing
        if (analysis.isBeat && analysis.energy > 0.4 && this._strobeCooldown <= 0) {
            this._strobeAlpha = 0.2 + analysis.energy * 0.35;
            this._strobeCooldown = 0.15; // minimum gap between strobes
        }

        // Fast decay
        this._strobeAlpha *= 0.75;

        if (this._strobeAlpha > 0.01) {
            ctx.globalAlpha = this._strobeAlpha;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;
        }
    }

    // ── Particles ──────────────────────────────────────────

    _updateAndDrawParticles(ctx, analysis, pose) {
        if (analysis.isBeat) {
            const count = 15 + Math.floor(Math.random() * 11);
            const cx = pose.hip ? pose.hip.x : 400;
            const cy = pose.hip ? pose.hip.y : 280;

            for (let i = 0; i < count && this.particles.length < 200; i++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = 1.5 + Math.random() * 4;
                const particleHue = Math.random() * 360;
                this.particles.push({
                    x: cx + (Math.random() - 0.5) * 60,
                    y: cy + (Math.random() - 0.5) * 60,
                    vx: Math.cos(angle) * speed,
                    vy: Math.sin(angle) * speed - 2,
                    alpha: 0.8 + Math.random() * 0.2,
                    color: `hsl(${particleHue}, 100%, 65%)`,
                    size: 2 + Math.random() * 4
                });
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.3;
            p.alpha -= 0.02;

            if (p.alpha <= 0) {
                this.particles.splice(i, 1);
                continue;
            }

            ctx.globalAlpha = p.alpha;
            ctx.fillStyle = p.color;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
    }

    // ── Beat Ripples ───────────────────────────────────────

    _updateAndDrawBeatRipples(ctx, analysis, pose) {
        if (analysis.isBeat && this.beatRipples.length < 10) {
            const cx = pose.hip ? pose.hip.x : 400;
            const cy = pose.hip ? pose.hip.y : 280;
            this.beatRipples.push({
                x: cx, y: cy, radius: 10, alpha: 0.8
            });
        }

        for (let i = this.beatRipples.length - 1; i >= 0; i--) {
            const r = this.beatRipples[i];
            r.radius += 3;
            r.alpha -= 0.02;

            if (r.alpha <= 0) {
                this.beatRipples.splice(i, 1);
                continue;
            }

            ctx.globalAlpha = r.alpha;
            ctx.strokeStyle = `hsl(${this.hue}, 100%, 60%)`;
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;
    }

    // ── Pose Trail (afterimages) ─────────────────────────────

    _updateAndDrawTrails(ctx, pose) {
        const poseCopy = {};
        for (const joint of JOINTS) {
            if (pose[joint]) {
                poseCopy[joint] = { x: pose[joint].x, y: pose[joint].y };
            }
        }
        this.trails.push(poseCopy);

        if (this.trails.length > 5) {
            this.trails.shift();
        }

        const trailCount = this.trails.length - 1;
        for (let i = 0; i < trailCount; i++) {
            const alpha = 0.03 + (i / Math.max(trailCount - 1, 1)) * 0.12;
            const trailHue = (this.hue - (trailCount - i) * 15 + 360) % 360;

            ctx.globalAlpha = alpha;
            this.skeleton.draw(ctx, this.trails[i], {
                strokeColor: `hsl(${trailHue}, 100%, 60%)`,
                lineWidth: 3,
                headRadius: 14,
                headFill: `hsl(${trailHue}, 100%, 60%)`,
                glow: false
            });
        }
        ctx.globalAlpha = 1;
    }
}
