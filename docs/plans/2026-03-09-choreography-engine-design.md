# Choreography Engine Design

**Goal:** A standalone Python script that takes a YouTube URL (or local video), extracts both audio and skeleton poses from it, then plays back a stick figure dancing to the music in a pygame window. One command, no manual uploads, no browser.

**Conceptual model:** The extraction phase is the AI *learning* the dance — watching the video, understanding the movements offline. The playback is the *performance* — the song comes on and the figure already knows every move, perfectly timed.

## Data Pipeline

```
Input: YouTube URL or local .mp4
         │
         ▼
    yt-dlp download (if URL)
         │
         ├── video frames (temp file)
         │         │
         │         ▼
         │    MediaPipe PoseLandmarker
         │         │
         │         ▼
         │    Per frame: detect all skeletons,
         │    pick largest bounding box,
         │    map 33 landmarks → 13 joints
         │         │
         │         ▼
         │    poses[] — list of {time, {joint: (x,y)}}
         │
         └── audio track → extract to temp .mp3
                  │
                  ▼
            pygame.mixer plays audio
            pygame renders skeleton at poses[current_time]
```

Single source of truth: the video file provides both audio and movement on the same timeline. No alignment needed.

## Pose Extraction

- **Sample rate:** 15fps (every 2nd frame from typical 30fps video)
- **Multi-person:** Detect all poses, pick largest bounding box (most prominent dancer)
- **Coordinates:** MediaPipe normalized [0,1] → scaled to 800x500 canvas, body centered, height normalized to ~380px
- **Missing frames:** Hold last valid pose
- **Joint model:** 13 joints, 12 bones — identical to JS skeleton.js:
  - head, neck, leftShoulder, rightShoulder, leftElbow, rightElbow, leftHand, rightHand, hip, leftKnee, rightKnee, leftFoot, rightFoot
  - neck = avg(shoulders), hip = avg(hip landmarks 23+24)

## Pygame Renderer

- **Window:** 800x500, black background
- **Skeleton:** White circles for joints, white lines for bones (12 connections)
- **Audio:** pygame.mixer.music loads extracted MP3, get_pos() for current time
- **Frame lookup:** Binary search by time, linear interpolation between nearest frames (render 60fps from 15fps data)
- **No themes, no effects, no UI** — bare stick figure proof of concept

## Input Handling

- YouTube URL: `python3 tools/dance.py "https://..."`
- Local file: `python3 tools/dance.py video.mp4`
- Detected by checking if input starts with http/https

## Dependencies

- mediapipe (installed)
- opencv-python (installed)
- yt-dlp (installed)
- pygame (to install)

## Single file

Everything in `tools/dance.py`. No module splitting.
