/**
 * Fusion — convert learnt choreography poses into freestyle-compatible deltas
 * using relative joint angles as the invariant representation.
 *
 * Pipeline:  learnt [x,y] → relative angles → new [x,y] (freestyle proportions) → deltas
 */

import { JOINTS } from './skeleton.js';

// ---------------------------------------------------------------------------
// Kinematic chains — ordered parent→child sequences
// ---------------------------------------------------------------------------
// The skeleton tree is rooted at hip. The spine goes up, limbs branch off.
//
//              head
//               |
//              neck
//             / | \
//      lShldr  |  rShldr
//        |    hip    |
//      lElb  / \   rElb
//        | lKn rKn   |
//      lHnd |   | rHnd
//          lFt rFt
//
// Each chain: [root, ..., tip].  The first bone's "parent direction" is
// defined by the chain's parentRef (a unit vector or a function of the pose).

export const CHAINS = {
    // Spine: hip → neck → head  (parent direction for first bone: straight up)
    spine:    ['hip', 'neck', 'head'],

    // Arms branch off neck
    leftArm:  ['neck', 'leftShoulder', 'leftElbow', 'leftHand'],
    rightArm: ['neck', 'rightShoulder', 'rightElbow', 'rightHand'],

    // Legs branch off hip
    leftLeg:  ['hip', 'leftKnee', 'leftFoot'],
    rightLeg: ['hip', 'rightKnee', 'rightFoot'],
};

// Parent reference direction for the first bone in each chain.
// This is the "zero angle" that the first bone's angle is measured relative to.
// Straight up = (0, -1) in canvas coords (y points down).
const PARENT_REF = {
    spine:    { x: 0, y: -1 },   // hip→neck measured relative to straight up
    leftArm:  null,               // computed from spine at runtime (neck→hip direction)
    rightArm: null,               // same
    leftLeg:  { x: 0, y: 1 },    // hip→knee measured relative to straight down
    rightLeg: { x: 0, y: 1 },
};

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

/** Angle of vector (from → to) in radians, measured from +x axis CCW. */
function vecAngle(from, to) {
    return Math.atan2(to.y - from.y, to.x - from.x);
}

/** Euclidean distance between two points. */
function boneDist(a, b) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    return Math.sqrt(dx * dx + dy * dy);
}

/** Angle of a reference direction vector (unit or not). */
function refAngle(ref) {
    return Math.atan2(ref.y, ref.x);
}

/** Normalize angle to (-π, π]. */
function normAngle(a) {
    while (a > Math.PI)  a -= 2 * Math.PI;
    while (a <= -Math.PI) a += 2 * Math.PI;
    return a;
}

// ---------------------------------------------------------------------------
// Step 0: Compute bone lengths from a reference pose
// ---------------------------------------------------------------------------

/**
 * Extract bone lengths for each chain from a given pose.
 * Returns { chainName: [length0, length1, ...] }
 * where length_i = distance from joint[i] to joint[i+1].
 */
export function computeBoneLengths(pose) {
    const lengths = {};
    for (const [name, chain] of Object.entries(CHAINS)) {
        lengths[name] = [];
        for (let i = 0; i < chain.length - 1; i++) {
            const a = pose[chain[i]];
            const b = pose[chain[i + 1]];
            lengths[name].push(boneDist(a, b));
        }
    }
    return lengths;
}

// ---------------------------------------------------------------------------
// Step 1: globalToAngles — extract relative angles from absolute [x,y]
// ---------------------------------------------------------------------------

/**
 * For each chain, compute the relative angle at each bone.
 *
 * Returns {
 *   chainName: {
 *     absolute: [absAngle0, absAngle1, ...],   // each bone's angle from +x
 *     relative: [relAngle0, relAngle1, ...],    // each bone relative to parent
 *   }
 * }
 *
 * The relative angle at bone i:
 *   - bone 0: angle relative to the chain's parent reference direction
 *   - bone i>0: angle relative to bone i-1
 */
export function globalToAngles(pose) {
    const result = {};

    // Compute spine direction for arm chain parent refs
    const spineDir = {
        x: pose.hip.x - pose.neck.x,
        y: pose.hip.y - pose.neck.y,
    };

    for (const [name, chain] of Object.entries(CHAINS)) {
        const absolute = [];
        const relative = [];

        for (let i = 0; i < chain.length - 1; i++) {
            const from = pose[chain[i]];
            const to   = pose[chain[i + 1]];
            const absAng = vecAngle(from, to);
            absolute.push(absAng);

            if (i === 0) {
                // First bone: relative to parent reference
                let pRef = PARENT_REF[name];
                if (pRef === null) {
                    // Arms use spine direction (neck→hip) as parent ref
                    pRef = spineDir;
                }
                relative.push(normAngle(absAng - refAngle(pRef)));
            } else {
                // Subsequent bones: relative to previous bone
                relative.push(normAngle(absAng - absolute[i - 1]));
            }
        }

        result[name] = { absolute, relative };
    }

    return result;
}

// ---------------------------------------------------------------------------
// Step 2: Verify — accumulate relatives back to absolute
// ---------------------------------------------------------------------------

/**
 * Walk each chain, accumulate relative angles from root, compare to
 * directly-measured absolute angle. Returns per-bone error (should be ~0).
 */
export function verifyAngles(pose) {
    const angles = globalToAngles(pose);
    const errors = {};

    // Compute spine direction for arm chain parent refs
    const spineDir = {
        x: pose.hip.x - pose.neck.x,
        y: pose.hip.y - pose.neck.y,
    };

    for (const [name, chain] of Object.entries(CHAINS)) {
        const { absolute, relative } = angles[name];
        const boneErrors = [];

        let accumulated;
        for (let i = 0; i < relative.length; i++) {
            if (i === 0) {
                let pRef = PARENT_REF[name];
                if (pRef === null) pRef = spineDir;
                accumulated = refAngle(pRef) + relative[i];
            } else {
                accumulated = accumulated + relative[i];
            }

            const error = Math.abs(normAngle(accumulated - absolute[i]));
            boneErrors.push(error);
        }

        errors[name] = boneErrors;
    }

    return errors;
}

// ---------------------------------------------------------------------------
// Step 3: anglesToGlobal — reconstruct [x,y] from angles + bone lengths
// ---------------------------------------------------------------------------

/**
 * Forward kinematics: given relative angles (from globalToAngles) and
 * target bone lengths, reconstruct absolute [x,y] positions.
 *
 * anchorPose provides the starting position for each chain's root joint.
 * (Typically the freestyle default pose — so hip stays at (400,280), etc.)
 *
 * Returns a full pose: { jointName: {x, y} }
 */
export function anglesToGlobal(angleData, targetBoneLengths, anchorPose) {
    const pose = {};

    // Compute spine direction from the anchor pose for arm parent refs
    const spineDir = {
        x: anchorPose.hip.x - anchorPose.neck.x,
        y: anchorPose.hip.y - anchorPose.neck.y,
    };

    for (const [name, chain] of Object.entries(CHAINS)) {
        const { relative } = angleData[name];
        const lengths = targetBoneLengths[name];

        // Root of chain gets its position from the anchor
        const root = chain[0];
        if (!pose[root]) {
            pose[root] = { x: anchorPose[root].x, y: anchorPose[root].y };
        }

        // Walk the chain: accumulate angle, place each child joint
        let accumulated;
        for (let i = 0; i < relative.length; i++) {
            if (i === 0) {
                let pRef = PARENT_REF[name];
                if (pRef === null) pRef = spineDir;
                accumulated = refAngle(pRef) + relative[i];
            } else {
                accumulated = accumulated + relative[i];
            }

            const parent = pose[chain[i]];
            const len = lengths[i];
            const child = chain[i + 1];

            pose[child] = {
                x: parent.x + Math.cos(accumulated) * len,
                y: parent.y + Math.sin(accumulated) * len,
            };
        }
    }

    return pose;
}

// ---------------------------------------------------------------------------
// Step 4: globalToDeltas — subtract default pose
// ---------------------------------------------------------------------------

/**
 * Convert absolute global pose to freestyle-compatible deltas.
 * delta[joint] = global[joint] - default[joint]
 */
export function globalToDeltas(globalPose, defaultPose) {
    const deltas = {};
    for (const joint of JOINTS) {
        const g = globalPose[joint];
        const d = defaultPose[joint];
        const dx = Math.round((g.x - d.x) * 10) / 10;
        const dy = Math.round((g.y - d.y) * 10) / 10;
        // Only include non-zero deltas (matches freestyle convention)
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
            deltas[joint] = { x: dx, y: dy };
        }
    }
    return deltas;
}

// ---------------------------------------------------------------------------
// Full pipeline: convert a learnt pose to freestyle delta
// ---------------------------------------------------------------------------

/**
 * Convert a single learnt pose (absolute [x,y]) into a freestyle delta,
 * using the freestyle skeleton's bone lengths as the target proportions.
 *
 * @param {Object} learntPose   - { jointName: {x, y} } from choreography
 * @param {Object} defaultPose  - freestyle default pose from Skeleton.getDefaultPose()
 * @param {Object} targetLengths - bone lengths from computeBoneLengths(defaultPose)
 * @returns {Object} delta - freestyle-compatible { jointName: {x, y} } deltas
 */
export function fusePose(learntPose, defaultPose, targetLengths) {
    // 1. Extract relative angles from the learnt pose
    const angles = globalToAngles(learntPose);

    // 2. Reconstruct using freestyle bone lengths, anchored at default positions
    const reconstructed = anglesToGlobal(angles, targetLengths, defaultPose);

    // 3. Compute deltas from default
    return globalToDeltas(reconstructed, defaultPose);
}
