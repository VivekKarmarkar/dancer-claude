#!/usr/bin/env python3
"""Fix learned_moves.js keyframes — proper skeleton fitting + BPM correction.

Reads the existing learned_moves.js, recomputes keyframes using:
1. Hip as anchor landmark (not standing pose subtraction)
2. Skeleton height ratio (choreo head-to-foot / freestyle head-to-foot)
3. First-frame-relative deltas scaled by that ratio
4. Correct durationBeats from known BPM

Does NOT re-run the mining pipeline or launch any dialogs.

Usage:
    python3 tools/fix_learned_keyframes.py
"""

import json
import re
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
LEARNED_MOVES_JS_PATH = REPO_ROOT / "js" / "learned_moves.js"

# Freestyle standing skeleton (from js/skeleton.js getDefaultPose())
STANDING = {
    "head": [400, 120], "neck": [400, 155],
    "leftShoulder": [360, 165], "rightShoulder": [440, 165],
    "leftElbow": [330, 220], "rightElbow": [470, 220],
    "leftHand": [310, 270], "rightHand": [490, 270],
    "hip": [400, 280],
    "leftKnee": [375, 360], "rightKnee": [425, 360],
    "leftFoot": [365, 440], "rightFoot": [435, 440],
}

# Freestyle skeleton height: head y to avg foot y
FREESTYLE_HEAD_Y = STANDING["head"][1]  # 120
FREESTYLE_FOOT_Y = (STANDING["leftFoot"][1] + STANDING["rightFoot"][1]) / 2  # 440
FREESTYLE_HEIGHT = FREESTYLE_FOOT_Y - FREESTYLE_HEAD_Y  # 320

# Use ALL frames as keyframes — no downsampling.
# Preserves the full motion fidelity from the choreography.

JOINT_ORDER = [
    "head", "neck", "leftShoulder", "rightShoulder",
    "leftElbow", "rightElbow", "leftHand", "rightHand",
    "hip", "leftKnee", "rightKnee", "leftFoot", "rightFoot",
]

# Known BPM for songs in the library
SONG_BPM = {
    "Levels by Avicii": 126,
    "Macarena by Los del Rio": 103,
    "YMCA by Village People": 127,
    "Gangnam Style by PSY": 132,
    "Toxic by Britney Spears": 143,
    "Low by Flo Rida": 128,
    "Paint the Town Red by Doja Cat": 100,
    "Whistle by Flo Rida": 80,
    "Swalla by Jason Derulo": 97,
    "No Lie by Sean Paul": 98,
}


def parse_learned_moves_js(path):
    """Parse the LEARNED_MOVES array from the JS file."""
    text = path.read_text()
    # Strip the "export const LEARNED_MOVES = " prefix and trailing ";"
    match = re.search(r'export\s+const\s+LEARNED_MOVES\s*=\s*(\[.*\])\s*;?\s*$', text, re.DOTALL)
    if not match:
        raise ValueError("Could not parse LEARNED_MOVES from JS file")
    return json.loads(match.group(1))


def compute_skeleton_fit(first_frame_joints):
    """Compute scale ratio from choreography skeleton to freestyle skeleton.

    Uses head-to-foot height ratio. Both canvases are 800x500.
    """
    choreo_head_y = first_frame_joints["head"][1]
    choreo_foot_y = (first_frame_joints["leftFoot"][1] + first_frame_joints["rightFoot"][1]) / 2
    choreo_height = choreo_foot_y - choreo_head_y

    scale = FREESTYLE_HEIGHT / choreo_height
    return scale


def recompute_keyframes(move):
    """Recompute keyframes for a single move using proper skeleton fitting.

    Uses ALL frames as keyframes (no downsampling) to preserve full motion
    fidelity. First keyframe is empty (start at standing), last is empty
    (return to standing).
    """
    poses = move["poses"]
    total_frames = len(poses)

    # First frame: reference for deltas
    ref_joints = poses[0]["joints"]
    scale = compute_skeleton_fit(ref_joints)

    print(f"  {move['name']}: {total_frames} frames, "
          f"choreo head_y={ref_joints['head'][1]:.1f}, "
          f"hip_y={ref_joints['hip'][1]:.1f}, "
          f"scale={scale:.3f}")

    # First keyframe: start at standing
    keyframes = [{"time": 0.0, "pose": {}}]

    # All interior frames as keyframes (skip frame 0, it's the reference)
    for i in range(1, total_frames):
        t = round(i / total_frames, 4)  # normalized time, leaves room for t=1.0

        frame_joints = poses[i]["joints"]
        pose = {}
        for joint_name in JOINT_ORDER:
            raw_dx = frame_joints[joint_name][0] - ref_joints[joint_name][0]
            raw_dy = frame_joints[joint_name][1] - ref_joints[joint_name][1]
            dx = round(raw_dx * scale, 1)
            dy = round(raw_dy * scale, 1)
            if abs(dx) > 0.5 or abs(dy) > 0.5:
                pose[joint_name] = {"x": dx, "y": dy}

        keyframes.append({"time": t, "pose": pose})

    # Last keyframe: return to standing
    keyframes.append({"time": 1.0, "pose": {}})

    return keyframes


def compute_duration_beats(move):
    """Compute correct durationBeats from window_sec and known BPM."""
    song = move.get("source_song", "")
    bpm = SONG_BPM.get(song)
    if bpm is None:
        print(f"  WARNING: Unknown BPM for '{song}', keeping durationBeats={move.get('durationBeats')}")
        return move.get("durationBeats", 4)

    window_sec = move.get("window_sec", 1.0)
    beats = round(window_sec * bpm / 60)
    return max(1, beats)


def write_learned_moves_js(moves, path):
    """Write the corrected LEARNED_MOVES back to JS."""
    json_str = json.dumps(moves, indent=2)
    content = (
        "// Learned moves — mined from choreographies via dictionary learning + human review.\n"
        "// Auto-generated by tools/move_mining_pipeline.py — do not edit by hand.\n"
        "\n"
        f"export const LEARNED_MOVES = {json_str};\n"
    )
    path.write_text(content)


def main():
    print(f"Reading {LEARNED_MOVES_JS_PATH}")
    moves = parse_learned_moves_js(LEARNED_MOVES_JS_PATH)
    print(f"Found {len(moves)} learned moves\n")

    print(f"Freestyle skeleton: head_y={FREESTYLE_HEAD_Y}, foot_y={FREESTYLE_FOOT_Y}, height={FREESTYLE_HEIGHT}")
    print()

    for move in moves:
        print(f"Processing '{move['name']}' ({move.get('source_song', '?')}):")

        # Fix keyframes
        move["keyframes"] = recompute_keyframes(move)

        # Fix durationBeats
        old_beats = move.get("durationBeats")
        move["durationBeats"] = compute_duration_beats(move)
        print(f"  durationBeats: {old_beats} → {move['durationBeats']}")

        # Sample keyframe delta magnitudes for sanity check
        for kf in move["keyframes"]:
            if kf["pose"]:
                max_dx = max(abs(v["x"]) for v in kf["pose"].values())
                max_dy = max(abs(v["y"]) for v in kf["pose"].values())
                print(f"  t={kf['time']}: max |dx|={max_dx:.1f}, max |dy|={max_dy:.1f}")
        print()

    write_learned_moves_js(moves, LEARNED_MOVES_JS_PATH)
    print(f"Written corrected keyframes to {LEARNED_MOVES_JS_PATH}")


if __name__ == "__main__":
    main()
