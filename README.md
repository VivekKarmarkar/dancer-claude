# Dancer Claude

A browser-based stick figure that dances to music — two ways. In **Freestyle** mode, upload any song and it improvises to the beat. In **Learnt** mode, pick a pre-learned song or individual move and it performs the exact choreography extracted from a real YouTube dance video.

Three visual themes, video recording, and a dance engine that actually feels the music.

## Two Modes

### Freestyle (Level 1)
Upload any audio file. The stick figure improvises in real-time using beat detection, 23 dance moves, and layered body mechanics. Works with any genre — pop, EDM, Bollywood, hip-hop.

### Learnt (Levels 2 & 4)
Pick from 10 pre-learned **songs** or individual **moves**. Songs play full choreographies extracted from YouTube dance videos. Moves are short clips mined from those choreographies via dictionary learning — a human picks the best atoms, and the system saves them as playable mini-choreographies with a shared background track.

**Available songs:**
| Song | Artist |
|------|--------|
| YMCA | Village People |
| Low | T-Pain ft. Flo Rida |
| Paint the Town Red | Doja Cat |
| Levels | Avicii |
| Toxic | Britney Spears |
| Whistle | Flo Rida |
| Swalla | Jason Derulo |
| Gangnam Style | PSY |
| Macarena | Los del Rio |
| No Lie | Dua Lipa |

## Features

- **Real-time beat detection** — Web Audio API analyzes the music and syncs dance moves to the rhythm
- **Choreography playback** — Pre-extracted poses from YouTube dance videos, interpolated at 60fps
- **Move mining** — Dictionary learning extracts recurring moves from choreographies; human picks the best ones
- **Multi-genre support** — Tuned for both Western (kick drum) and Indian (dhol, tabla, tasha) percussion
- **23 freestyle moves** — Head bobs, hip shakes, jumps, spins, thumkas, bhangra, shoulder shimmy, and more
- **Layered movement** — Upper body and lower body move independently for natural-looking freestyle dance
- **Groove system** — Persistent beat-synced bounce underneath freestyle moves
- **Dynamic amplitude** — Freestyle moves scale with the music's energy (quiet = subtle, loud = big)
- **3 visual themes** — all reactive to the beat in both modes:
  - **Minimal** — Black stick figure on white background
  - **Stylized** — Cyan figure on dark stage with spotlight
  - **Wild** — Particles, color shift, beat ripples, trails
- **Video recording** — Record clips or full songs in either mode, download as WebM
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

1. Choose a mode: **Freestyle** or **Learnt**
2. In Freestyle, upload any audio file (MP3, WAV, OGG). In Learnt, toggle between **Song** (full choreography) and **Move** (individual mined moves).
3. Hit **Play** — the stick figure starts dancing
4. Switch themes with the toggle buttons at the top — background effects stay reactive to the beat
5. Hit **Record** for a live clip, or **Record Full Song** to capture the whole performance
6. Downloaded video saves as `.webm`

## Architecture

```
index.html            — UI shell (mode toggle, song dropdown, controls)
css/styles.css        — Dark-themed styling
js/
  main.js             — App controller, wires everything together
  audio-engine.js     — Web Audio API, frequency analysis, beat detection
  skeleton.js         — Stick figure joint model (13 joints, 12 bones)
  pose-player.js      — Loads choreography JSON, serves interpolated poses at any time
  moves.js            — 23 freestyle dance move definitions as keyframe poses
  move-sequencer.js   — Selects, layers, and blends freestyle moves based on audio
  video-exporter.js   — MediaRecorder capture + download
  themes/
    minimal.js        — Clean black-on-white
    stylized.js       — Cyan on dark stage with spotlight
    wild.js           — Particles, ripples, color shift, trails
library/
  choreo_*.json       — Timestamped joint positions extracted from YouTube videos
  choreo_*.mp3        — Paired audio files (synced to the JSON poses)
  moves/              — Mined moves: mini-choreo JSONs + shared background track + manifest
  catalog.md          — Tracking which YouTube videos work well
tools/
  dance.py            — Choreography extraction engine (YouTube → MediaPipe → JSON+MP3)
  move_mining_pipeline.py — Dictionary learning + human review → learnt moves
```

## How the Dance Engine Works

### Freestyle Mode
1. **Audio Analysis** — Each frame, the Web Audio API `AnalyserNode` provides frequency data split into bass, low-mid (dhol range), mid, and treble bands
2. **Beat Detection** — Energy spikes in bass or low-mid bands trigger beats, with a cooldown to prevent doubles
3. **Move Selection** — The sequencer picks moves matching the current energy level (low/mid/high), avoiding recent repeats
4. **Layering** — A primary layer handles full-body/leg moves while an arms layer overlays independently
5. **Groove Bounce** — A persistent beat-synced dip runs underneath everything, using exponential decay for sharp attack and smooth recovery
6. **Spring Easing** — Keyframes interpolate with slight overshoot for natural momentum
7. **Micro-Variation** — Each move instance gets random scale (0.85-1.15x), offset, and possible mirroring
8. **Dynamic Amplitude** — All deltas scale with the music's energy level

### Learnt Mode
1. **Pose Loading** — `PosePlayer` fetches the choreography JSON and converts raw `[x,y]` arrays to `{x,y}` objects once at load time
2. **Fast Lookup** — At ~60fps, the current frame is found via O(1) index guess (`Math.floor(time * sampleFps)`) with a small correction scan
3. **Smoothstep Interpolation** — Between frames, `Skeleton.interpolate()` applies smoothstep easing for fluid motion
4. **Theme Reactivity** — Audio analysis still runs, so background effects (spotlights, particles, ripples) pulse to the beat even though the figure follows pre-recorded choreography
5. **Move Mining** — Dictionary learning decomposes choreographies into recurring pose patterns (atoms). A human reviews animated GIFs and picks the best ones. Selected moves are saved as mini-choreography JSONs reusing the same PosePlayer infrastructure — zero data transformation, full fidelity.

## Extracting New Choreography

The `tools/dance.py` script extracts choreography from YouTube dance videos:

```bash
python3 tools/dance.py --export <youtube-url>
```

This downloads the video, runs MediaPipe pose tracking, normalizes the skeleton to the 800x500 canvas, and outputs paired `library/choreo_<hash>.json` + `library/choreo_<hash>.mp3` files. See `library/catalog.md` for which types of videos work best (solo dancer, clean background, good lighting).

## Browser Support

Requires a modern browser with:
- Web Audio API
- Canvas 2D
- MediaRecorder API (for video recording)

Tested on Chrome, Firefox, and Edge.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the full build history — four levels from freestyle improvisation to move mining via dictionary learning.
