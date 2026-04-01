export const JOINTS = [
    'head', 'neck',
    'leftShoulder', 'rightShoulder',
    'leftElbow', 'rightElbow',
    'leftHand', 'rightHand',
    'hip',
    'leftKnee', 'rightKnee',
    'leftFoot', 'rightFoot'
];

export const BONES = [
    ['head', 'neck'],
    ['neck', 'leftShoulder'], ['neck', 'rightShoulder'],
    ['leftShoulder', 'leftElbow'], ['leftElbow', 'leftHand'],
    ['rightShoulder', 'rightElbow'], ['rightElbow', 'rightHand'],
    ['neck', 'hip'],
    ['hip', 'leftKnee'], ['leftKnee', 'leftFoot'],
    ['hip', 'rightKnee'], ['rightKnee', 'rightFoot']
];

export class Skeleton {
    getDefaultPose() {
        return {
            head:           { x: 400, y: 120 },
            neck:           { x: 400, y: 155 },
            leftShoulder:   { x: 360, y: 165 },
            rightShoulder:  { x: 440, y: 165 },
            leftElbow:      { x: 330, y: 220 },
            rightElbow:     { x: 470, y: 220 },
            leftHand:       { x: 310, y: 270 },
            rightHand:      { x: 490, y: 270 },
            hip:            { x: 400, y: 280 },
            leftKnee:       { x: 375, y: 360 },
            rightKnee:      { x: 425, y: 360 },
            leftFoot:       { x: 365, y: 440 },
            rightFoot:      { x: 435, y: 440 }
        };
    }

    static interpolate(poseA, poseB, t) {
        // Ease-in-out smoothstep
        const tSmooth = t * t * (3 - 2 * t);

        const result = {};
        for (const joint of JOINTS) {
            const a = poseA[joint];
            const b = poseB[joint];
            result[joint] = {
                x: a.x + (b.x - a.x) * tSmooth,
                y: a.y + (b.y - a.y) * tSmooth
            };
        }
        return result;
    }

    draw(ctx, pose, style = {}) {
        const strokeColor = style.strokeColor || '#ffffff';
        const lineWidth = style.lineWidth || 3;
        const headRadius = style.headRadius || 15;
        const headFill = style.headFill || null;
        const glow = style.glow || false;

        ctx.save();

        // Apply glow effect if enabled
        if (glow) {
            ctx.shadowColor = strokeColor;
            ctx.shadowBlur = 10;
        }

        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = lineWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        // Draw bones
        for (const [jointA, jointB] of BONES) {
            const a = pose[jointA];
            const b = pose[jointB];
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
        }

        // Draw head
        const head = pose.head;
        ctx.beginPath();
        ctx.arc(head.x, head.y, headRadius, 0, Math.PI * 2);
        if (headFill) {
            ctx.fillStyle = headFill;
            ctx.fill();
        }
        ctx.stroke();

        ctx.restore();
    }
}
