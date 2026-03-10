# Choreography Engine Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** A standalone Python script (`tools/dance.py`) that takes a YouTube URL or local video, extracts audio + skeleton poses, and plays back a stick figure dancing to the music in a pygame window.

**Architecture:** Single-file script with three phases — download/resolve video, extract poses via MediaPipe (picking largest skeleton per frame), extract audio, then play back with pygame rendering skeleton at 60fps synced to audio via `mixer.music.get_pos()`. Binary search + linear interpolation for smooth pose lookup from 15fps extracted data.

**Tech Stack:** Python 3, mediapipe (Tasks API 0.10+), opencv-python, yt-dlp, pygame, ffmpeg (for audio extraction)

---

### Task 1: Install pygame and download MediaPipe model

**Files:**
- Download: `tools/pose_landmarker.task` (MediaPipe model, ~5.6MB)

**Step 1: Install pygame in venv**

```bash
cd "/home/vivekkarmarkar/Python Files/dancer-claude"
source venv/bin/activate
pip install pygame
```

Expected: `Successfully installed pygame-X.X.X`

**Step 2: Download MediaPipe pose landmarker model**

```bash
wget -q "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task" -O tools/pose_landmarker.task
```

Expected: `tools/pose_landmarker.task` exists, ~5.6MB

**Step 3: Verify all dependencies**

```bash
source venv/bin/activate
python3 -c "
import mediapipe, cv2, yt_dlp, pygame
print('All good')
print('mediapipe:', mediapipe.__version__)
print('pygame:', pygame.version.ver)
"
```

Expected: `All good` with versions printed

**Step 4: Commit**

```bash
git add tools/pose_landmarker.task
git commit -m "chore: add MediaPipe pose model and install pygame"
```

Note: `tools/pose_landmarker.task` is a binary model file (~5.6MB). Add to `.gitignore` if repo should stay lightweight, or commit it for reproducibility. User's choice.

---

### Task 2: Write the video download + audio extraction functions

**Files:**
- Create: `tools/dance.py`

**Step 1: Create the script with imports, constants, and download/audio functions**

```python
#!/usr/bin/env python3
"""
Choreography Engine
Downloads a YouTube video (or reads a local file), extracts skeleton poses
using MediaPipe, then plays back a stick figure dancing to the audio.

Usage:
    source venv/bin/activate
    python3 tools/dance.py <youtube_url_or_video_file>
"""

import sys
import os
import tempfile
import subprocess
import cv2
import mediapipe as mp
from mediapipe.tasks import python as mp_python
from mediapipe.tasks.python import vision as mp_vision
import pygame

# --- Constants ---

CANVAS_W, CANVAS_H = 800, 500
FPS = 60
SAMPLE_FPS = 15
MODEL_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'pose_landmarker.task')

JOINTS = [
    'head', 'neck',
    'leftShoulder', 'rightShoulder',
    'leftElbow', 'rightElbow',
    'leftHand', 'rightHand',
    'hip',
    'leftKnee', 'rightKnee',
    'leftFoot', 'rightFoot'
]

BONES = [
    ('head', 'neck'),
    ('neck', 'leftShoulder'), ('neck', 'rightShoulder'),
    ('leftShoulder', 'leftElbow'), ('leftElbow', 'leftHand'),
    ('rightShoulder', 'rightElbow'), ('rightElbow', 'rightHand'),
    ('neck', 'hip'),
    ('hip', 'leftKnee'), ('leftKnee', 'leftFoot'),
    ('hip', 'rightKnee'), ('rightKnee', 'rightFoot'),
]

# MediaPipe landmark indices for our joints
LANDMARK_MAP = {
    'head': 0,            # nose
    'leftShoulder': 11,
    'rightShoulder': 12,
    'leftElbow': 13,
    'rightElbow': 14,
    'leftHand': 15,       # left wrist
    'rightHand': 16,      # right wrist
    'leftKnee': 25,
    'rightKnee': 26,
    'leftFoot': 27,       # left ankle
    'rightFoot': 28,      # right ankle
}
# neck = avg(landmarks 11,12), hip = avg(landmarks 23,24)


def resolve_video(source):
    """
    Given a YouTube URL or local file path, return a local video file path.
    Downloads via yt-dlp if it's a URL. Returns (video_path, is_temp).
    """
    if source.startswith('http://') or source.startswith('https://'):
        print("Downloading video...")
        tmp = tempfile.NamedTemporaryFile(suffix='.mp4', delete=False)
        tmp.close()
        import yt_dlp
        ydl_opts = {
            'format': '18/best[ext=mp4]/best',
            'outtmpl': tmp.name,
            'quiet': True,
            'no_warnings': True,
        }
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            ydl.download([source])
        print(f"Downloaded: {os.path.getsize(tmp.name) / 1024 / 1024:.1f}MB")
        return tmp.name, True
    else:
        if not os.path.exists(source):
            print(f"Error: file not found: {source}")
            sys.exit(1)
        return source, False


def extract_audio(video_path):
    """
    Extract audio from video file to a temp MP3 using ffmpeg.
    Returns path to the temp MP3.
    """
    print("Extracting audio...")
    tmp = tempfile.NamedTemporaryFile(suffix='.mp3', delete=False)
    tmp.close()
    subprocess.run(
        ['ffmpeg', '-i', video_path, '-vn', '-acodec', 'libmp3lame',
         '-q:a', '2', '-y', tmp.name],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL
    )
    size_kb = os.path.getsize(tmp.name) / 1024
    print(f"Audio extracted: {size_kb:.0f}KB")
    return tmp.name
```

**Step 2: Test download function manually**

```bash
source venv/bin/activate
python3 -c "
import sys; sys.path.insert(0, 'tools')
from dance import resolve_video, extract_audio
path, is_temp = resolve_video('https://www.youtube.com/watch?v=wYzGtkcttVE')
print('Video:', path, 'Size:', os.path.getsize(path))
audio = extract_audio(path)
print('Audio:', audio, 'Size:', os.path.getsize(audio))
import os; os.unlink(path); os.unlink(audio)
"
```

Expected: Video downloads (~1.6MB), audio extracts successfully.

**Step 3: Commit**

```bash
git add tools/dance.py
git commit -m "feat(dance): add video download and audio extraction"
```

---

### Task 3: Write the pose extraction function

**Files:**
- Modify: `tools/dance.py`

**Step 1: Add the pose extraction functions after extract_audio**

```python
def pick_largest_skeleton(all_landmarks, img_w, img_h):
    """
    Given a list of pose landmark sets (one per detected person),
    return the one with the largest bounding box.
    """
    if not all_landmarks:
        return None
    if len(all_landmarks) == 1:
        return all_landmarks[0]

    best = None
    best_area = 0
    for landmarks in all_landmarks:
        xs = [l.x * img_w for l in landmarks]
        ys = [l.y * img_h for l in landmarks]
        area = (max(xs) - min(xs)) * (max(ys) - min(ys))
        if area > best_area:
            best_area = area
            best = landmarks
    return best


def landmarks_to_pose(landmarks, img_w, img_h):
    """
    Map MediaPipe landmarks to our 13-joint model.
    Returns dict of {joint_name: (x, y)} scaled to CANVAS_W x CANVAS_H,
    or None if too few landmarks detected.
    """
    lm = landmarks
    points = {}

    for joint, idx in LANDMARK_MAP.items():
        l = lm[idx]
        vis = getattr(l, 'visibility', 1.0) or 0.0
        if vis < 0.3:
            continue
        points[joint] = (l.x * img_w, l.y * img_h)

    # Compute neck = avg of shoulders
    if 'leftShoulder' in points and 'rightShoulder' in points:
        ls, rs = points['leftShoulder'], points['rightShoulder']
        points['neck'] = ((ls[0] + rs[0]) / 2, (ls[1] + rs[1]) / 2)

    # Compute hip = avg of hip landmarks 23, 24
    lh, rh = lm[23], lm[24]
    lh_vis = getattr(lh, 'visibility', 1.0) or 0.0
    rh_vis = getattr(rh, 'visibility', 1.0) or 0.0
    if lh_vis > 0.3 and rh_vis > 0.3:
        points['hip'] = ((lh.x + rh.x) / 2 * img_w, (lh.y + rh.y) / 2 * img_h)

    if len(points) < 6:
        return None

    # Scale to canvas: find bounding box, normalize to ~380px height, center
    xs = [p[0] for p in points.values()]
    ys = [p[1] for p in points.values()]
    min_x, max_x = min(xs), max(xs)
    min_y, max_y = min(ys), max(ys)
    body_h = max(max_y - min_y, 1)
    scale = 380 / body_h
    cx, cy = (min_x + max_x) / 2, (min_y + max_y) / 2

    pose = {}
    for joint, p in points.items():
        pose[joint] = (
            CANVAS_W / 2 + (p[0] - cx) * scale,
            CANVAS_H / 2 + (p[1] - cy) * scale
        )
    return pose


def extract_poses(video_path):
    """
    Extract poses from video at SAMPLE_FPS.
    Returns list of (time_seconds, pose_dict) tuples.
    """
    print("Learning choreography...")

    base_options = mp_python.BaseOptions(model_asset_path=MODEL_PATH)
    options = mp_vision.PoseLandmarkerOptions(
        base_options=base_options,
        running_mode=mp_vision.RunningMode.IMAGE,
        num_poses=5,
        min_pose_detection_confidence=0.5,
        min_pose_presence_confidence=0.5,
    )
    detector = mp_vision.PoseLandmarker.create_from_options(options)

    cap = cv2.VideoCapture(video_path)
    video_fps = cap.get(cv2.CAP_PROP_FPS)
    total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))

    if video_fps <= 0 or total_frames <= 0:
        print("Error: cannot read video")
        sys.exit(1)

    duration = total_frames / video_fps
    frame_interval = max(1, int(video_fps / SAMPLE_FPS))

    print(f"  Video: {video_fps:.0f}fps, {duration:.1f}s, {total_frames} frames")

    poses = []
    frame_idx = 0
    last_valid_pose = None

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        if frame_idx % frame_interval == 0:
            current_time = frame_idx / video_fps
            rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            h, w = frame.shape[:2]
            mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)
            result = detector.detect(mp_image)

            best = pick_largest_skeleton(result.pose_landmarks, w, h)
            pose = landmarks_to_pose(best, w, h) if best else None

            if pose:
                last_valid_pose = pose
            elif last_valid_pose:
                pose = last_valid_pose

            if pose:
                poses.append((current_time, pose))

            # Progress
            pct = (frame_idx / total_frames) * 100
            print(f"\r  Learning choreography... {pct:.0f}%", end='', flush=True)

        frame_idx += 1

    cap.release()
    detector.close()
    print(f"\n  Learned {len(poses)} poses from {duration:.1f}s of video")
    return poses
```

**Step 2: Test extraction on the same video**

```bash
source venv/bin/activate
python3 -c "
import sys, os; sys.path.insert(0, 'tools')
from dance import resolve_video, extract_poses
path, _ = resolve_video('https://www.youtube.com/watch?v=wYzGtkcttVE')
poses = extract_poses(path)
print(f'Poses: {len(poses)}')
print(f'First pose joints: {list(poses[0][1].keys())}')
print(f'Head at t=0: {poses[0][1][\"head\"]}')
os.unlink(path)
"
```

Expected: ~1300 poses, 13 joints, head near canvas center.

**Step 3: Commit**

```bash
git add tools/dance.py
git commit -m "feat(dance): add pose extraction with multi-person handling"
```

---

### Task 4: Write the pygame renderer and main loop

**Files:**
- Modify: `tools/dance.py`

**Step 1: Add the renderer and main function**

```python
def find_pose_at(poses, time):
    """
    Binary search for the interpolated pose at the given time.
    Returns a pose dict.
    """
    if not poses:
        return None
    if time <= poses[0][0]:
        return poses[0][1]
    if time >= poses[-1][0]:
        return poses[-1][1]

    # Binary search for frame just before time
    lo, hi = 0, len(poses) - 1
    while lo < hi - 1:
        mid = (lo + hi) // 2
        if poses[mid][0] <= time:
            lo = mid
        else:
            hi = mid

    t_a, pose_a = poses[lo]
    t_b, pose_b = poses[min(lo + 1, len(poses) - 1)]
    span = t_b - t_a
    t = min(1.0, (time - t_a) / span) if span > 0 else 0.0

    # Linear interpolation
    result = {}
    for joint in pose_a:
        if joint in pose_b:
            ax, ay = pose_a[joint]
            bx, by = pose_b[joint]
            result[joint] = (ax + (bx - ax) * t, ay + (by - ay) * t)
        else:
            result[joint] = pose_a[joint]
    return result


def draw_skeleton(screen, pose):
    """Draw the 13-joint, 12-bone skeleton on a pygame surface."""
    WHITE = (255, 255, 255)

    # Draw bones
    for joint_a, joint_b in BONES:
        if joint_a in pose and joint_b in pose:
            a = (int(pose[joint_a][0]), int(pose[joint_a][1]))
            b = (int(pose[joint_b][0]), int(pose[joint_b][1]))
            pygame.draw.line(screen, WHITE, a, b, 3)

    # Draw head circle
    if 'head' in pose:
        hx, hy = int(pose['head'][0]), int(pose['head'][1])
        pygame.draw.circle(screen, WHITE, (hx, hy), 15, 3)


def play(poses, audio_path):
    """Play back the extracted choreography with synced audio."""
    pygame.init()
    pygame.mixer.init()
    screen = pygame.display.set_mode((CANVAS_W, CANVAS_H))
    pygame.display.set_caption("Dancer Claude — Choreography")
    clock = pygame.time.Clock()

    pygame.mixer.music.load(audio_path)
    pygame.mixer.music.play()

    running = True
    while running:
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            if event.type == pygame.KEYDOWN and event.key == pygame.K_ESCAPE:
                running = False

        # Check if music ended
        if not pygame.mixer.music.get_busy():
            running = False

        # Get current audio time in seconds
        time_ms = pygame.mixer.music.get_pos()
        if time_ms < 0:
            continue
        current_time = time_ms / 1000.0

        # Look up interpolated pose
        pose = find_pose_at(poses, current_time)

        # Render
        screen.fill((0, 0, 0))
        if pose:
            draw_skeleton(screen, pose)
        pygame.display.flip()
        clock.tick(FPS)

    pygame.mixer.music.stop()
    pygame.quit()


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 tools/dance.py <youtube_url_or_video_file>")
        sys.exit(1)

    source = sys.argv[1]

    # Phase 1: Get the video
    video_path, is_temp = resolve_video(source)

    try:
        # Phase 2: Extract audio
        audio_path = extract_audio(video_path)

        # Phase 3: Learn the dance
        poses = extract_poses(video_path)

        if not poses:
            print("Error: no poses extracted")
            sys.exit(1)

        # Phase 4: Perform
        print(f"\n♪ Playing... ({len(poses)} poses, {poses[-1][0]:.1f}s)")
        play(poses, audio_path)

    finally:
        # Clean up temp files
        if is_temp and os.path.exists(video_path):
            os.unlink(video_path)
        if 'audio_path' in dir() and os.path.exists(audio_path):
            os.unlink(audio_path)


if __name__ == '__main__':
    main()
```

**Step 2: End-to-end test**

```bash
source venv/bin/activate
python3 tools/dance.py "https://www.youtube.com/watch?v=wYzGtkcttVE"
```

Expected output:
```
Downloading video...
Downloaded: 1.6MB
Extracting audio...
Audio extracted: 1400KB
Learning choreography...
  Video: 30fps, 88.1s, 2643 frames
  Learning choreography... 100%
  Learned 1322 poses from 88.1s of video

♪ Playing... (1322 poses, 88.1s)
```

Then a pygame window opens showing the stick figure dancing to the music.

**Step 3: Test with local file**

```bash
python3 tools/dance.py /tmp/some_local_video.mp4
```

Expected: Same behavior, skips download step.

**Step 4: Commit**

```bash
git add tools/dance.py
git commit -m "feat(dance): add pygame renderer and playback — choreography engine complete"
```

---

### Task 5: Add .gitignore entries and final cleanup

**Files:**
- Modify: `.gitignore`

**Step 1: Add model file and temp files to .gitignore**

Add these lines:
```
tools/pose_landmarker.task
*.mp3
```

**Step 2: Commit**

```bash
git add .gitignore
git commit -m "chore: gitignore mediapipe model and temp audio files"
```
