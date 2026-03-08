export class MinimalTheme {
    drawBackground(ctx, canvas) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    getSkeletonStyle(analysis) {
        return {
            strokeColor: '#000000',
            lineWidth: 3,
            headRadius: 15,
            headFill: null,
            glow: false
        };
    }

    drawEffects(ctx, canvas, analysis, pose) {
        // No effects — minimal is minimal
    }
}
