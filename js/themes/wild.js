import { Skeleton, JOINTS } from '../skeleton.js';

export class WildTheme {
    constructor() {
        this.particles = [];
        this.trails = [];
        this.hue = 0;
        this.beatRipples = [];
        this.flashAlpha = 0;
        this.skeleton = new Skeleton();
    }

    drawBackground(ctx, canvas) {
        // Semi-transparent clear for motion blur trail effect
        ctx.fillStyle = 'rgba(10, 10, 10, 0.25)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
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

        this._updateAndDrawParticles(ctx, analysis, pose);
        this._updateAndDrawBeatRipples(ctx, analysis, pose);
        this._updateAndDrawTrails(ctx, pose);
        this._updateAndDrawBeatFlash(ctx, canvas, analysis);
    }

    // ── Particles ──────────────────────────────────────────────

    _updateAndDrawParticles(ctx, analysis, pose) {
        // Spawn on beat
        if (analysis.isBeat) {
            const count = 15 + Math.floor(Math.random() * 11); // 15-25
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
                    vy: Math.sin(angle) * speed - 2, // upward bias
                    alpha: 0.8 + Math.random() * 0.2,
                    color: `hsl(${particleHue}, 100%, 65%)`,
                    size: 2 + Math.random() * 4
                });
            }
        }

        // Update and draw
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.x += p.vx;
            p.y += p.vy;
            p.vy += 0.3; // gravity
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

    // ── Beat Ripples ───────────────────────────────────────────

    _updateAndDrawBeatRipples(ctx, analysis, pose) {
        // Spawn on beat
        if (analysis.isBeat && this.beatRipples.length < 10) {
            const cx = pose.hip ? pose.hip.x : 400;
            const cy = pose.hip ? pose.hip.y : 280;
            this.beatRipples.push({
                x: cx,
                y: cy,
                radius: 10,
                alpha: 0.8
            });
        }

        // Update and draw
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

    // ── Pose Trail (afterimages) ───────────────────────────────

    _updateAndDrawTrails(ctx, pose) {
        // Deep copy current pose into trails
        const poseCopy = {};
        for (const joint of JOINTS) {
            if (pose[joint]) {
                poseCopy[joint] = { x: pose[joint].x, y: pose[joint].y };
            }
        }
        this.trails.push(poseCopy);

        // Keep only last 5
        if (this.trails.length > 5) {
            this.trails.shift();
        }

        // Draw afterimages (skip the most recent which is current pose)
        const trailCount = this.trails.length - 1;
        for (let i = 0; i < trailCount; i++) {
            // Oldest trail = lowest alpha, newest = highest
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

    // ── Beat Drop Flash ────────────────────────────────────────

    _updateAndDrawBeatFlash(ctx, canvas, analysis) {
        // Trigger on high-energy beats
        if (analysis.isBeat && analysis.energy > 0.7) {
            this.flashAlpha = 0.25;
        }

        // Decay
        this.flashAlpha *= 0.85;

        // Draw
        if (this.flashAlpha > 0.01) {
            ctx.globalAlpha = this.flashAlpha;
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.globalAlpha = 1;
        }
    }
}
