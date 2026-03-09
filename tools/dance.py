#!/usr/bin/env python3
"""Choreography engine: YouTube video -> stick figure dancing.

Usage:
    python tools/dance.py <youtube-url-or-local-video>

Downloads video (if URL), extracts audio, learns skeleton poses via
MediaPipe PoseLandmarker, then plays back a stick figure dancing to
the audio in a pygame window.
"""

import bisect
import math
import os
import subprocess
import sys
import tempfile

import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision
import pygame

# ---------------------------------------------------------------------------
# Constants
# ---------------------------------------------------------------------------

CANVAS_W, CANVAS_H = 800, 500
FPS = 60
SAMPLE_FPS = 15

JOINTS = [
    "head", "neck",
    "leftShoulder", "rightShoulder",
    "leftElbow", "rightElbow",
    "leftHand", "rightHand",
    "hip",
    "leftKnee", "rightKnee",
    "leftFoot", "rightFoot",
]

BONES = [
    ("head", "neck"),
    ("neck", "leftShoulder"), ("neck", "rightShoulder"),
    ("leftShoulder", "leftElbow"), ("leftElbow", "leftHand"),
    ("rightShoulder", "rightElbow"), ("rightElbow", "rightHand"),
    ("neck", "hip"),
    ("hip", "leftKnee"), ("leftKnee", "leftFoot"),
    ("hip", "rightKnee"), ("rightKnee", "rightFoot"),
]

# MediaPipe landmark indices for our 13-joint model
_LM_HEAD = 0           # nose
_LM_LEFT_SHOULDER = 11
_LM_RIGHT_SHOULDER = 12
_LM_LEFT_ELBOW = 13
_LM_RIGHT_ELBOW = 14
_LM_LEFT_WRIST = 15
_LM_RIGHT_WRIST = 16
_LM_LEFT_HIP = 23
_LM_RIGHT_HIP = 24
_LM_LEFT_KNEE = 25
_LM_RIGHT_KNEE = 26
_LM_LEFT_ANKLE = 27
_LM_RIGHT_ANKLE = 28

# Target skeleton height on canvas (pixels)
_TARGET_HEIGHT = 380

# Minimum visibility threshold for a landmark
_VIS_THRESHOLD = 0.3

# Minimum number of detected joints to consider a valid pose
_MIN_JOINTS = 6

# Model path (relative to this script)
_MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "pose_landmarker.task")


# ---------------------------------------------------------------------------
# 1. resolve_video — download or verify local file
# ---------------------------------------------------------------------------

def resolve_video(source: str) -> tuple:
    """Return (video_path, is_temp).

    If *source* starts with ``http``, download via yt-dlp to a temp file.
    Otherwise verify it exists as a local path.
    """
    if source.startswith("http"):
        print("Downloading video...")
        import yt_dlp

        tmp = tempfile.NamedTemporaryFile(suffix=".mp4", delete=False)
        tmp_path = tmp.name
        tmp.close()

        ydl_opts = {
            "format": "18/best[ext=mp4]/best",
            "outtmpl": tmp_path,
            "quiet": True,
            "no_warnings": True,
            "overwrites": True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([source])

        size_mb = os.path.getsize(tmp_path) / (1024 * 1024)
        print(f"Downloaded: {size_mb:.1f}MB")
        return tmp_path, True
    else:
        if not os.path.isfile(source):
            print(f"Error: file not found: {source}", file=sys.stderr)
            sys.exit(1)
        return source, False


# ---------------------------------------------------------------------------
# 2. extract_audio — ffmpeg video -> MP3
# ---------------------------------------------------------------------------

def extract_audio(video_path: str) -> str:
    """Extract audio from *video_path* to a temp MP3. Return path."""
    print("Extracting audio...")
    tmp = tempfile.NamedTemporaryFile(suffix=".mp3", delete=False)
    audio_path = tmp.name
    tmp.close()

    cmd = [
        "ffmpeg", "-i", video_path,
        "-vn", "-acodec", "libmp3lame", "-q:a", "2",
        "-y", audio_path,
    ]
    result = subprocess.run(cmd, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    if result.returncode != 0:
        print("Error: ffmpeg audio extraction failed", file=sys.stderr)
        sys.exit(1)

    size_kb = os.path.getsize(audio_path) / 1024
    print(f"Audio extracted: {size_kb:.0f}KB")
    return audio_path


# ---------------------------------------------------------------------------
# 3. pick_largest_skeleton
# ---------------------------------------------------------------------------

def pick_largest_skeleton(all_landmarks, img_w: int, img_h: int):
    """From a list of pose landmark sets, return the one with the largest
    bounding-box area (in pixel space).  Returns None if the list is empty.
    """
    if not all_landmarks:
        return None

    best = None
    best_area = -1

    for landmarks in all_landmarks:
        xs = [lm.x * img_w for lm in landmarks]
        ys = [lm.y * img_h for lm in landmarks]
        area = (max(xs) - min(xs)) * (max(ys) - min(ys))
        if area > best_area:
            best_area = area
            best = landmarks

    return best


# ---------------------------------------------------------------------------
# 4. landmarks_to_pose — MediaPipe landmarks -> 13-joint dict
# ---------------------------------------------------------------------------

def _avg(lm_a, lm_b):
    """Average two landmarks, taking the minimum visibility."""
    class _Avg:
        x = (lm_a.x + lm_b.x) / 2
        y = (lm_a.y + lm_b.y) / 2
        visibility = min(lm_a.visibility, lm_b.visibility)
    return _Avg()


def landmarks_to_pose(landmarks, img_w: int, img_h: int):
    """Map MediaPipe landmarks to our 13-joint model.

    Returns dict ``{joint_name: (x, y)}`` scaled to the canvas, or ``None``
    if fewer than ``_MIN_JOINTS`` landmarks are visible.
    """
    # Build raw joint positions in pixel space
    lm = landmarks  # shorthand

    neck_lm = _avg(lm[_LM_LEFT_SHOULDER], lm[_LM_RIGHT_SHOULDER])
    hip_lm = _avg(lm[_LM_LEFT_HIP], lm[_LM_RIGHT_HIP])

    mapping = {
        "head":           lm[_LM_HEAD],
        "neck":           neck_lm,
        "leftShoulder":   lm[_LM_LEFT_SHOULDER],
        "rightShoulder":  lm[_LM_RIGHT_SHOULDER],
        "leftElbow":      lm[_LM_LEFT_ELBOW],
        "rightElbow":     lm[_LM_RIGHT_ELBOW],
        "leftHand":       lm[_LM_LEFT_WRIST],
        "rightHand":      lm[_LM_RIGHT_WRIST],
        "hip":            hip_lm,
        "leftKnee":       lm[_LM_LEFT_KNEE],
        "rightKnee":      lm[_LM_RIGHT_KNEE],
        "leftFoot":       lm[_LM_LEFT_ANKLE],
        "rightFoot":      lm[_LM_RIGHT_ANKLE],
    }

    # Filter by visibility
    raw = {}
    for name, l in mapping.items():
        if l.visibility >= _VIS_THRESHOLD:
            raw[name] = (l.x * img_w, l.y * img_h)

    if len(raw) < _MIN_JOINTS:
        return None

    # Compute bounding box of detected joints
    xs = [p[0] for p in raw.values()]
    ys = [p[1] for p in raw.values()]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)

    bbox_h = max_y - min_y
    bbox_w = max_x - min_x

    if bbox_h < 1:
        return None

    # Scale so skeleton height is ~_TARGET_HEIGHT pixels
    scale = _TARGET_HEIGHT / bbox_h

    # Center of bounding box in source pixel coords
    cx_src = (min_x + max_x) / 2
    cy_src = (min_y + max_y) / 2

    # Target center on canvas
    cx_dst = CANVAS_W / 2
    cy_dst = CANVAS_H / 2

    pose = {}
    for name, (px, py) in raw.items():
        pose[name] = (
            cx_dst + (px - cx_src) * scale,
            cy_dst + (py - cy_src) * scale,
        )

    # Fill missing joints with None (we'll handle in interpolation/draw)
    # Actually, for simplicity, only return if we have enough joints
    return pose


# ---------------------------------------------------------------------------
# 5. extract_poses — process video frames with MediaPipe
# ---------------------------------------------------------------------------

def extract_poses(video_path: str):
    """Open video, sample frames at SAMPLE_FPS, detect poses.

    Returns list of ``(time_seconds, pose_dict)`` tuples.
    """
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        print(f"Error: cannot open video: {video_path}", file=sys.stderr)
        sys.exit(1)

    video_fps = cap.get(cv2.CAP_PROP_FPS) or 30
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration = total_frames / video_fps
    frame_interval = max(1, round(video_fps / SAMPLE_FPS))

    print("Learning choreography...")
    print(f"  Video: {video_fps:.0f}fps, {duration:.1f}s, {total_frames} frames")

    # Set up MediaPipe PoseLandmarker (Tasks API, 0.10+)
    options = mp_vision.PoseLandmarkerOptions(
        base_options=mp_python.BaseOptions(model_asset_path=_MODEL_PATH),
        running_mode=mp_vision.RunningMode.IMAGE,
        num_poses=5,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
        min_tracking_confidence=0.5,
    )
    landmarker = mp_vision.PoseLandmarker.create_from_options(options)

    poses = []
    last_valid_pose = None
    frame_idx = 0
    sampled = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % frame_interval == 0:
            time_s = frame_idx / video_fps
            img_h, img_w = frame.shape[:2]

            # Convert BGR -> RGB for MediaPipe
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)

            result = landmarker.detect(mp_image)

            pose = None
            if result.pose_landmarks:
                best_lm = pick_largest_skeleton(result.pose_landmarks, img_w, img_h)
                if best_lm is not None:
                    pose = landmarks_to_pose(best_lm, img_w, img_h)

            if pose is not None:
                last_valid_pose = pose
            elif last_valid_pose is not None:
                pose = last_valid_pose

            if pose is not None:
                poses.append((time_s, pose))

            sampled += 1

            # Progress
            pct = int((frame_idx + 1) / total_frames * 100)
            print(f"\r  Learning choreography... {pct}%", end="", flush=True)

        frame_idx += 1

    print()  # newline after progress

    cap.release()
    landmarker.close()

    print(f"  Learned {len(poses)} poses from {duration:.1f}s of video")
    return poses


# ---------------------------------------------------------------------------
# 6. find_pose_at — binary search + linear interpolation
# ---------------------------------------------------------------------------

def find_pose_at(poses, time: float):
    """Return an interpolated pose dict for the given *time* (seconds).

    Uses binary search to find the surrounding keyframes and linearly
    interpolates between them (with smoothstep easing, matching the JS).
    """
    if not poses:
        return None

    times = [p[0] for p in poses]

    # bisect_right gives us the index of the first element > time
    idx = bisect.bisect_right(times, time)

    if idx == 0:
        return poses[0][1]
    if idx >= len(poses):
        return poses[-1][1]

    # Surrounding frames
    t_a, pose_a = poses[idx - 1]
    t_b, pose_b = poses[idx]

    dt = t_b - t_a
    if dt <= 0:
        return pose_a

    t = (time - t_a) / dt
    t = max(0.0, min(1.0, t))

    # Smoothstep easing (matches JS: t * t * (3 - 2 * t))
    t_smooth = t * t * (3 - 2 * t)

    result = {}
    for joint in JOINTS:
        a = pose_a.get(joint)
        b = pose_b.get(joint)
        if a is not None and b is not None:
            result[joint] = (
                a[0] + (b[0] - a[0]) * t_smooth,
                a[1] + (b[1] - a[1]) * t_smooth,
            )
        elif a is not None:
            result[joint] = a
        elif b is not None:
            result[joint] = b
        # else: joint missing in both frames, skip

    return result


# ---------------------------------------------------------------------------
# 7. draw_skeleton — render stick figure on pygame surface
# ---------------------------------------------------------------------------

def draw_skeleton(screen, pose):
    """Draw white stick figure on *screen* from *pose* dict."""
    if pose is None:
        return

    WHITE = (255, 255, 255)

    # Draw bones
    for joint_a, joint_b in BONES:
        a = pose.get(joint_a)
        b = pose.get(joint_b)
        if a is not None and b is not None:
            pygame.draw.line(screen, WHITE, (int(a[0]), int(a[1])),
                             (int(b[0]), int(b[1])), 3)

    # Draw head circle
    head = pose.get("head")
    if head is not None:
        pygame.draw.circle(screen, WHITE, (int(head[0]), int(head[1])), 15, 3)


# ---------------------------------------------------------------------------
# 8. play — pygame audio + animation loop
# ---------------------------------------------------------------------------

def play(poses, audio_path: str):
    """Play back the stick figure animation synced to audio."""
    if not poses:
        print("No poses to play.")
        return

    duration = poses[-1][0]
    print(f"\n\u266a Playing... ({len(poses)} poses, {duration:.1f}s)")

    pygame.init()
    screen = pygame.display.set_mode((CANVAS_W, CANVAS_H))
    pygame.display.set_caption("Dance Choreography")
    clock = pygame.time.Clock()

    pygame.mixer.init()
    pygame.mixer.music.load(audio_path)
    pygame.mixer.music.play()

    BLACK = (0, 0, 0)
    running = True

    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False

        # Check if music is still playing
        if not pygame.mixer.music.get_busy():
            running = False
            continue

        # Get current playback time in seconds
        music_pos_ms = pygame.mixer.music.get_pos()
        if music_pos_ms < 0:
            running = False
            continue
        current_time = music_pos_ms / 1000.0

        # Look up interpolated pose
        pose = find_pose_at(poses, current_time)

        # Draw
        screen.fill(BLACK)
        draw_skeleton(screen, pose)
        pygame.display.flip()

        clock.tick(FPS)

    pygame.mixer.music.stop()
    pygame.quit()


# ---------------------------------------------------------------------------
# 9. main — CLI entry point
# ---------------------------------------------------------------------------

def main():
    if len(sys.argv) < 2:
        print(f"Usage: {sys.argv[0]} <youtube-url-or-local-video>", file=sys.stderr)
        sys.exit(1)

    source = sys.argv[1]
    temp_files = []

    try:
        # Step 1: resolve video
        video_path, is_temp = resolve_video(source)
        if is_temp:
            temp_files.append(video_path)

        # Step 2: extract audio
        audio_path = extract_audio(video_path)
        temp_files.append(audio_path)

        # Step 3: extract poses
        poses = extract_poses(video_path)

        # Step 4: play
        play(poses, audio_path)

    finally:
        # Clean up temp files
        for f in temp_files:
            try:
                os.unlink(f)
            except OSError:
                pass


if __name__ == "__main__":
    main()
