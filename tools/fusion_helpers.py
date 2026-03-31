"""Fusion helpers (Python) — angle-based skeleton normalization.

Mirrors the logic in js/fusion.js for use in the extraction pipeline.
Converts absolute poses from any source dancer onto the freestyle
skeleton's proportions using relative joint angles as the invariant.
"""

import math
import numpy as np

from dictionary_learning_choreography import JOINT_ORDER, N_JOINTS

# ---------------------------------------------------------------------------
# Kinematic chains — same as js/fusion.js
# ---------------------------------------------------------------------------

CHAINS = {
    'spine':    ['hip', 'neck', 'head'],
    'leftArm':  ['neck', 'leftShoulder', 'leftElbow', 'leftHand'],
    'rightArm': ['neck', 'rightShoulder', 'rightElbow', 'rightHand'],
    'leftLeg':  ['hip', 'leftKnee', 'leftFoot'],
    'rightLeg': ['hip', 'rightKnee', 'rightFoot'],
}

# Parent reference direction for first bone in each chain
# (0, -1) = straight up in canvas coords (y points down)
PARENT_REF = {
    'spine':    (0, -1),
    'leftArm':  None,      # computed from spine at runtime
    'rightArm': None,
    'leftLeg':  (0, 1),    # straight down
    'rightLeg': (0, 1),
}

# Freestyle default pose — must match js/skeleton.js getDefaultPose()
DEFAULT_POSE = {
    'head':           (400, 120),
    'neck':           (400, 155),
    'leftShoulder':   (360, 165),
    'rightShoulder':  (440, 165),
    'leftElbow':      (330, 220),
    'rightElbow':     (470, 220),
    'leftHand':       (310, 270),
    'rightHand':      (490, 270),
    'hip':            (400, 280),
    'leftKnee':       (375, 360),
    'rightKnee':      (425, 360),
    'leftFoot':       (365, 440),
    'rightFoot':      (435, 440),
}

# ---------------------------------------------------------------------------
# Geometry helpers
# ---------------------------------------------------------------------------

def _vec_angle(frm, to):
    """Angle of vector (from → to) in radians from +x axis."""
    return math.atan2(to[1] - frm[1], to[0] - frm[0])

def _bone_dist(a, b):
    dx = b[0] - a[0]
    dy = b[1] - a[1]
    return math.sqrt(dx * dx + dy * dy)

def _ref_angle(ref):
    return math.atan2(ref[1], ref[0])

def _norm_angle(a):
    while a > math.pi:
        a -= 2 * math.pi
    while a <= -math.pi:
        a += 2 * math.pi
    return a

# ---------------------------------------------------------------------------
# Compute bone lengths from a pose dict
# ---------------------------------------------------------------------------

def compute_bone_lengths(pose):
    lengths = {}
    for name, chain in CHAINS.items():
        lengths[name] = []
        for i in range(len(chain) - 1):
            a = pose[chain[i]]
            b = pose[chain[i + 1]]
            lengths[name].append(_bone_dist(a, b))
    return lengths

# Pre-compute freestyle bone lengths
FREESTYLE_LENGTHS = compute_bone_lengths(DEFAULT_POSE)

# ---------------------------------------------------------------------------
# Extract relative angles from a pose
# ---------------------------------------------------------------------------

def global_to_angles(pose):
    """Extract relative angles for each chain from absolute (x,y) pose."""
    spine_dir = (pose['hip'][0] - pose['neck'][0],
                 pose['hip'][1] - pose['neck'][1])

    result = {}
    for name, chain in CHAINS.items():
        absolute = []
        relative = []

        for i in range(len(chain) - 1):
            frm = pose[chain[i]]
            to = pose[chain[i + 1]]
            abs_ang = _vec_angle(frm, to)
            absolute.append(abs_ang)

            if i == 0:
                p_ref = PARENT_REF[name]
                if p_ref is None:
                    p_ref = spine_dir
                relative.append(_norm_angle(abs_ang - _ref_angle(p_ref)))
            else:
                relative.append(_norm_angle(abs_ang - absolute[i - 1]))

        result[name] = {'absolute': absolute, 'relative': relative}
    return result

# ---------------------------------------------------------------------------
# Reconstruct pose from angles + bone lengths
# ---------------------------------------------------------------------------

def angles_to_global(angle_data, target_lengths, anchor_pose):
    """Forward kinematics: relative angles + bone lengths → absolute (x,y)."""
    pose = {}
    spine_dir = (anchor_pose['hip'][0] - anchor_pose['neck'][0],
                 anchor_pose['hip'][1] - anchor_pose['neck'][1])

    for name, chain in CHAINS.items():
        rel = angle_data[name]['relative']
        lengths = target_lengths[name]

        root = chain[0]
        if root not in pose:
            pose[root] = anchor_pose[root]

        accumulated = None
        for i in range(len(rel)):
            if i == 0:
                p_ref = PARENT_REF[name]
                if p_ref is None:
                    p_ref = spine_dir
                accumulated = _ref_angle(p_ref) + rel[i]
            else:
                accumulated = accumulated + rel[i]

            parent = pose[chain[i]]
            length = lengths[i]
            child = chain[i + 1]

            pose[child] = (
                parent[0] + math.cos(accumulated) * length,
                parent[1] + math.sin(accumulated) * length,
            )

    return pose

# ---------------------------------------------------------------------------
# Fuse a single pose: source absolute → freestyle absolute
# ---------------------------------------------------------------------------

def fuse_pose(source_pose):
    """Convert a source pose (absolute coords) to freestyle skeleton coords."""
    angles = global_to_angles(source_pose)
    return angles_to_global(angles, FREESTYLE_LENGTHS, DEFAULT_POSE)

# ---------------------------------------------------------------------------
# Fuse an entire atom sequence (numpy array)
# ---------------------------------------------------------------------------

def fuse_atom_sequence(atom_seq):
    """Fuse a full atom: (n_frames, N_JOINTS, 2) numpy array → same shape, normalized.

    Input/output use JOINT_ORDER indexing.
    """
    n_frames = atom_seq.shape[0]
    result = np.zeros_like(atom_seq)

    for f in range(n_frames):
        # Build pose dict from numpy row
        pose = {}
        for j, name in enumerate(JOINT_ORDER):
            pose[name] = (float(atom_seq[f, j, 0]), float(atom_seq[f, j, 1]))

        # Fuse
        fused = fuse_pose(pose)

        # Write back to numpy
        for j, name in enumerate(JOINT_ORDER):
            result[f, j, 0] = fused[name][0]
            result[f, j, 1] = fused[name][1]

    return result
