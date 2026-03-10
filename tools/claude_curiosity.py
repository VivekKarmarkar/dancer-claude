#!/usr/bin/env python3
"""Claude's curiosity: what does the YMCA pose data actually look like?

Extracts poses from the YMCA video and analyzes the arm geometry
to see if the Y-M-C-A letter shapes are visible in the raw numbers.
"""

import math
import os
import sys

# Reuse the extraction pipeline from dance.py
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from dance import resolve_video, extract_poses, CANVAS_W, CANVAS_H

CATALOG = {
    "ymca": "https://www.youtube.com/shorts/hGY9W2cyw8I",
    "macarena": "https://www.youtube.com/shorts/4S9f8iWs4d8",
    "gangnam": "https://www.youtube.com/shorts/52fgfXjW2rA",
}


def arm_angle(pose, shoulder_key, hand_key):
    """Angle of the arm (shoulder→hand) relative to straight up (0°).

    Returns degrees: 0° = arm straight up, 90° = arm horizontal, 180° = arm down.
    Returns None if joints missing.
    """
    shoulder = pose.get(shoulder_key)
    hand = pose.get(hand_key)
    if shoulder is None or hand is None:
        return None

    dx = hand[0] - shoulder[0]
    dy = hand[1] - shoulder[1]  # positive = down (screen coords)

    # atan2 from straight-up reference (negative y-axis)
    # 0° = up, 90° = right, -90° = left, 180° = down
    angle = math.degrees(math.atan2(dx, dy))  # note: (dx, dy) not (dy, dx) — relative to vertical
    return angle


def classify_letter(left_angle, right_angle):
    """Guess which YMCA letter based on arm angles.

    Y: both arms up and out (~30-60° spread)
    M: both arms bent down, elbows out (using elbow position would be better,
       but approximating: arms roughly 120-160° — pointing somewhat down)
    C: both arms curved to one side (asymmetric angles)
    A: both arms up, close together (narrow spread, < 30°)
    """
    if left_angle is None or right_angle is None:
        return "?"

    # Normalize: left_angle is for left arm, right_angle for right arm
    # In screen coords with our angle convention:
    # Arms up & out: left ~(-30 to -70), right ~(30 to 70)
    # Arms straight up: both near 0
    # Arms down: both near 180 or -180

    left_up = abs(left_angle) < 90
    right_up = abs(right_angle) < 90
    both_up = left_up and right_up

    spread = abs(left_angle - right_angle)

    if both_up and 40 < spread < 120:
        return "Y"
    elif both_up and spread < 40:
        return "A"
    elif not left_up and not right_up:
        return "M"
    elif abs(left_angle - right_angle) > 90:
        return "C"
    else:
        return "?"


def main():
    song = sys.argv[1] if len(sys.argv) > 1 else "ymca"
    url = CATALOG.get(song, song)  # allow raw URLs too

    print("=" * 60)
    print(f"CLAUDE'S CURIOSITY: What does '{song}' look like in numbers?")
    print("=" * 60)
    print()

    # Extract poses
    video_path, is_temp = resolve_video(url)

    try:
        poses, raw_poses = extract_poses(video_path)
    finally:
        if is_temp:
            os.unlink(video_path)

    print()
    print(f"Total poses extracted: {len(poses)}")
    print(f"Duration: {poses[-1][0]:.1f}s")
    print()

    # Analyze every pose
    print("-" * 60)
    print(f"{'Time':>6s}  {'L.Arm°':>7s}  {'R.Arm°':>7s}  {'Spread':>7s}  {'Letter':>6s}")
    print("-" * 60)

    letter_sequence = []

    for time_s, pose in poses:
        l_angle = arm_angle(pose, "leftShoulder", "leftHand")
        r_angle = arm_angle(pose, "rightShoulder", "rightHand")

        if l_angle is not None and r_angle is not None:
            spread = abs(l_angle - r_angle)
            letter = classify_letter(l_angle, r_angle)
            letter_sequence.append((time_s, letter, l_angle, r_angle))

            print(f"{time_s:6.2f}s  {l_angle:7.1f}  {r_angle:7.1f}  {spread:7.1f}  {letter:>6s}")
        else:
            print(f"{time_s:6.2f}s  {'n/a':>7s}  {'n/a':>7s}  {'n/a':>7s}  {'?':>6s}")

    # Summary: find the most distinct letter moments
    print()
    print("=" * 60)
    print("LETTER DETECTION SUMMARY")
    print("=" * 60)

    for letter in "YMCA":
        moments = [(t, l, r) for t, ltr, l, r in letter_sequence if ltr == letter]
        if moments:
            print(f"\n  '{letter}' detected at {len(moments)} frames:")
            for t, l, r in moments[:5]:  # show first 5
                print(f"    t={t:.2f}s  left={l:.1f}°  right={r:.1f}°")
            if len(moments) > 5:
                print(f"    ... and {len(moments) - 5} more")
        else:
            print(f"\n  '{letter}' — not detected with current heuristics")

    # Raw data dump: show the full arm trajectory
    print()
    print("=" * 60)
    print("ARM ANGLE TRAJECTORY (for plotting)")
    print("=" * 60)
    print()
    print("time_s, left_arm_angle, right_arm_angle")
    for time_s, pose in poses:
        l = arm_angle(pose, "leftShoulder", "leftHand")
        r = arm_angle(pose, "rightShoulder", "rightHand")
        if l is not None and r is not None:
            print(f"{time_s:.3f}, {l:.1f}, {r:.1f}")


if __name__ == "__main__":
    main()
