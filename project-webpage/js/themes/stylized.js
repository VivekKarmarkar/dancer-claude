export class StylizedTheme {
    drawBackground(ctx, canvas) {
        // Solid dark background
        ctx.fillStyle = '#1a1a2e';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Gradient dance floor at bottom 30%
        const floorTop = 350;
        const floorGrad = ctx.createLinearGradient(0, floorTop, 0, canvas.height);
        floorGrad.addColorStop(0, 'transparent');
        floorGrad.addColorStop(0.4, '#16213e');
        floorGrad.addColorStop(1, '#0f3460');
        ctx.fillStyle = floorGrad;
        ctx.fillRect(0, floorTop, canvas.width, canvas.height - floorTop);

        // Soft radial spotlight
        const spotlight = ctx.createRadialGradient(400, 250, 0, 400, 250, 300);
        spotlight.addColorStop(0, 'rgba(255, 255, 255, 0.03)');
        spotlight.addColorStop(1, 'transparent');
        ctx.fillStyle = spotlight;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    getSkeletonStyle(analysis) {
        return {
            strokeColor: '#00d4ff',
            lineWidth: 4,
            headRadius: 16,
            headFill: '#00d4ff',
            glow: true
        };
    }

    drawEffects(ctx, canvas, analysis, pose) {
        // Shadow beneath figure
        if (pose && pose.hip) {
            const footY = pose.hip.y + 170;
            ctx.beginPath();
            ctx.ellipse(pose.hip.x, footY, 50, 8, 0, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.fill();
        }
    }
}
