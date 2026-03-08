# Dancer Claude — Design Document

**Date:** 2026-03-08
**Version:** v0

## Vision

A browser-based app where you pick a song (preset or uploaded), watch a stick figure dance to it live in real-time, and download the performance as a video. Three visual themes — Minimal, Stylized, and Wild — switchable on the fly.

## Architecture

Single-page web app. No server, no build tools. Pure HTML + JS modules running in the browser.

### Four Core Modules

1. **UI Layer** — Song selection (presets + upload), theme toggle, playback controls, record/download
2. **Audio Engine** — Web Audio API `AnalyserNode` for real-time BPM detection, frequency band analysis, and energy level extraction
3. **Canvas Renderer** — HTML5 Canvas drawing the stick figure, applying theme visuals, running at 60fps via `requestAnimationFrame`
4. **Video Exporter** — `MediaRecorder` API capturing canvas + audio stream into downloadable WebM/MP4

### Data Flow

```
Audio File → Web Audio API → AnalyserNode → { bpm, energy, frequencyBands }
                                                     ↓
                                              Move Sequencer → selects/blends dance moves
                                                     ↓
                                              Canvas Renderer → draws stick figure + theme effects
                                                     ↓
                                              MediaRecorder → captures video (when recording)
```

## Stick Figure Anatomy

12 joints connected as a skeleton:

- head, neck
- left/right shoulder, left/right elbow, left/right hand
- hip
- left/right knee, left/right foot

Each joint is an `{x, y}` coordinate. Limbs are lines between connected joints.

## Dance Move System

### Move Definition

Each move is a sequence of keyframe poses (all 12 joint positions at specific beat offsets). Between keyframes, joints are interpolated with easing functions for natural motion.

### Move Metadata

- `energy`: low / mid / high
- `duration`: in beats (1, 2, or 4)
- `type`: arms / legs / full-body

### Move Library (~15-20 moves for v0)

| Energy | Moves |
|--------|-------|
| Low    | Head bob, sway, gentle arm wave, step-touch |
| Mid    | Clap, arm pump, hip shake, spin, point |
| High   | Jump, kick, double arm wave, full spin, running man |

### Move Sequencer Logic

1. Audio engine reports current BPM + energy level each frame
2. Sequencer selects moves matching the energy that fit the beat length
3. Moves are queued and blended — last frames of one move interpolate into first frames of the next
4. Energy spikes (beat drops) trigger "power moves" (jumps, spins)

## Visual Themes

### Minimal
- White background, black stick figure
- Clean thin lines, no effects

### Stylized
- Dark background with colored gradient "dance floor"
- Bright-colored stick figure (cyan/electric blue)
- Subtle shadow beneath figure
- Soft spotlight glow following the dancer

### Wild
- Dark background with particle effects bursting on strong beats
- Stick figure color shifts with music (hue cycles through spectrum)
- Beat ripples — concentric circles pulse outward on each beat
- Trail effect — afterimages of previous poses linger briefly
- Beat drop → screen flash + particle explosion

Theme toggle: three buttons at top of UI, instant switch, no interruption.

## UI Layout

```
┌──────────────────────────────────────────┐
│  Dancer Claude                           │
│                                          │
│  [ Minimal ] [ Stylized ] [ Wild ]       │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │                                    │  │
│  │         (canvas area)              │  │
│  │      stick figure dances here      │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  Now playing: Song Name                  │
│  ════════════●━━━━━━━━━  2:14 / 3:30    │
│                                          │
│  Pre-loaded:                             │
│  [Macarena] [YMCA] [Stayin' Alive]      │
│  [Billie Jean]                           │
│                                          │
│  ── or ──                                │
│  [ Upload your own song ]                │
│                                          │
│  [ Record ] [ Record Full Song ]         │
│                                          │
└──────────────────────────────────────────┘
```

### Controls

- **Pre-loaded tracks:** Royalty-free covers or short clips bundled with the app
- **Upload:** Accepts MP3, WAV, OGG
- **Progress bar:** Shows playback position, clickable to seek
- **Record:** Live capture — start/stop whenever, downloads what was captured
- **Record Full Song:** Restarts song, captures entire performance, auto-downloads when done

## Scope

### v0 (this version)
- Core dance engine with beat detection and move sequencing
- 15-20 dance moves across energy levels
- Three visual themes with live toggle
- Pre-loaded tracks + upload your own
- Live playback + video download (Record & Record Full Song)

### v1 (future)
- Social sharing buttons (YouTube Shorts, Instagram Stories, TikTok)
- Auto-format video to vertical 9:16 for short-form platforms
- Signature choreography packs for iconic songs
- More moves, more themes

## Technical Constraints

- No server required — fully static, can be hosted on GitHub Pages
- Modern browser required (Chrome/Firefox/Edge) for Web Audio API + MediaRecorder
- Pre-loaded tracks must be royalty-free to avoid legal issues
