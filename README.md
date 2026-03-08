# Dancer Claude

A browser-based app where a stick figure dances to any song in real-time. Upload any track — pop, EDM, Bollywood, Marathi, hip-hop — and watch the stick figure groove to the beat. Three visual themes, video recording, and a dance engine that actually feels the music.

## Features

- **Real-time beat detection** — Web Audio API analyzes the music and syncs dance moves to the rhythm
- **Multi-genre support** — Tuned for both Western (kick drum) and Indian (dhol, tabla, tasha) percussion
- **23 dance moves** — Head bobs, hip shakes, jumps, spins, thumkas, bhangra, shoulder shimmy, and more
- **Layered movement** — Upper body and lower body move independently for natural-looking dance
- **Groove system** — Persistent beat-synced bounce underneath all moves
- **Dynamic amplitude** — Moves scale with the music's energy (quiet = subtle, loud = big)
- **Micro-variations** — Same move never looks identical twice (random scale, offset, mirroring)
- **3 visual themes:**
  - **Minimal** — Black stick figure on white background
  - **Stylized** — Cyan figure on dark stage with spotlight
  - **Wild** — Particles, color shift, beat ripples, trails
- **Video recording** — Record clips or full songs, download as WebM
- **Zero dependencies** — Pure HTML/CSS/JS, no build tools, no server

## Usage

### Quick Start

```bash
# Serve locally (ES modules need HTTP, not file://)
python3 -m http.server 8080

# Open in browser
open http://localhost:8080
```

### How to Use

1. Upload any audio file (MP3, WAV, OGG) or pick a preset track
2. Hit **Play** — the stick figure starts dancing immediately
3. Switch themes with the toggle buttons at the top
4. Hit **Record** for a live clip, or **Record Full Song** to capture the whole performance
5. Downloaded video saves as `.webm`

## Architecture

```
index.html          — UI shell
css/styles.css      — Dark-themed styling
js/
  main.js           — App controller, wires everything together
  audio-engine.js   — Web Audio API, frequency analysis, beat detection
  skeleton.js       — Stick figure joint model (13 joints, 12 bones)
  moves.js          — 23 dance move definitions as keyframe poses
  move-sequencer.js — Selects, layers, and blends moves based on audio
  video-exporter.js — MediaRecorder capture + download
  themes/
    minimal.js      — Clean black-on-white
    stylized.js     — Cyan on dark stage with spotlight
    wild.js         — Particles, ripples, color shift, trails
```

## How the Dance Engine Works

1. **Audio Analysis** — Each frame, the Web Audio API `AnalyserNode` provides frequency data split into bass, low-mid (dhol range), mid, and treble bands
2. **Beat Detection** — Energy spikes in bass or low-mid bands trigger beats, with a cooldown to prevent doubles
3. **Move Selection** — The sequencer picks moves matching the current energy level (low/mid/high), avoiding recent repeats
4. **Layering** — A primary layer handles full-body/leg moves while an arms layer overlays independently
5. **Groove Bounce** — A persistent beat-synced dip runs underneath everything, using exponential decay for sharp attack and smooth recovery
6. **Spring Easing** — Keyframes interpolate with slight overshoot for natural momentum
7. **Micro-Variation** — Each move instance gets random scale (0.85-1.15x), offset, and possible mirroring
8. **Dynamic Amplitude** — All deltas scale with the music's energy level

## Browser Support

Requires a modern browser with:
- Web Audio API
- Canvas 2D
- MediaRecorder API (for video recording)

Tested on Chrome, Firefox, and Edge.

## Future Ideas (v1)

- Social sharing (YouTube Shorts, Instagram Stories, TikTok)
- Vertical 9:16 format for short-form platforms
- Signature choreography packs for iconic songs
- More dance styles and themes
