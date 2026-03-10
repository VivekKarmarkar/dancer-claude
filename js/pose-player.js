import { Skeleton, JOINTS } from './skeleton.js';

export class PosePlayer {
    constructor() {
        this._frames = null;   // poses with {x,y} joints, pre-converted
        this._meta = null;
        this._sampleFps = 0;
    }

    /**
     * Fetch choreography JSON, convert [x,y] arrays → {x,y} objects once,
     * fill missing joints with defaults.
     * Returns the meta object (caller reads meta.audio for the MP3 path).
     */
    async load(jsonUrl) {
        const resp = await fetch(jsonUrl);
        if (!resp.ok) throw new Error(`Failed to load choreography: ${resp.status}`);
        const data = await resp.json();

        this._meta = data.meta;
        this._sampleFps = data.meta.sampleFps;

        const defaults = new Skeleton().getDefaultPose();

        // Pre-convert all frames from [x,y] → {x,y}
        this._frames = data.poses.map(frame => {
            const pose = {};
            for (const joint of JOINTS) {
                const arr = frame.joints[joint];
                if (arr) {
                    pose[joint] = { x: arr[0], y: arr[1] };
                } else {
                    pose[joint] = { x: defaults[joint].x, y: defaults[joint].y };
                }
            }
            pose._t = frame.t;
            return pose;
        });

        return this._meta;
    }

    /**
     * Hot path (~60 fps). Fast index guess via sampleFps, then interpolate
     * between the two surrounding frames.
     */
    getPoseAtTime(time) {
        const frames = this._frames;
        const len = frames.length;

        // Clamp at edges
        if (time <= frames[0]._t) return frames[0];
        if (time >= frames[len - 1]._t) return frames[len - 1];

        // Fast guess: index ≈ time * sampleFps
        let i = Math.floor(time * this._sampleFps);
        // Clamp guess to valid range
        if (i >= len - 1) i = len - 2;
        if (i < 0) i = 0;

        // Correct if guess is off (scan in the right direction)
        while (i < len - 2 && frames[i + 1]._t <= time) i++;
        while (i > 0 && frames[i]._t > time) i--;

        const frameA = frames[i];
        const frameB = frames[i + 1];

        // Interpolation factor between frameA and frameB
        const span = frameB._t - frameA._t;
        const t = span > 0 ? (time - frameA._t) / span : 0;

        return Skeleton.interpolate(frameA, frameB, t);
    }

    isLoaded() {
        return this._frames !== null;
    }

    getDuration() {
        return this._meta ? this._meta.duration : 0;
    }

    unload() {
        this._frames = null;
        this._meta = null;
        this._sampleFps = 0;
    }
}
