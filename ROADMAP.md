# Project Roadmap: Dancer Claude

> **Created:** 2026-03-09
> **Status:** Draft

## Vision
A stick figure that doesn't just dance to any song — it *recognizes* songs it's learned before, reacts like a human would ("Oh I know this one!"), and switches from freestyle to memorized choreography. The dream: upload a song, the figure listens for a few seconds, gets excited, and nails the exact moves from the music video.

## Current State
- **Working:** Browser-based real-time dance engine (23 moves, 3 themes, beat detection, video recording)
- **Working:** Python choreography engine (`tools/dance.py`) — takes a YouTube URL, extracts poses via MediaPipe, plays back a stick figure dancing to the audio in pygame
- **Working:** Overlay validation mode (dual skeleton on video)
- **Not yet built:** Song recognition, choreography library, reaction system, browser integration of extracted choreography

---

## Phase 1: Choreography Library — Build the Memory
**Goal:** Create a persistent library of pre-extracted choreographies so the system has songs to "remember"
**Status:** Not Started

| Priority | Task | Description | Dependencies |
|----------|------|-------------|-------------|
| P0 | Choreography export format | Define a JSON format for extracted poses (song metadata + timestamped joint positions) | — |
| P0 | Export command | `python3 tools/dance.py --export <url>` saves poses to `library/<fingerprint>.json` | Export format |
| P0 | Library index | `library/index.json` mapping song fingerprints → choreography files + metadata (title, artist, duration) | Export format |
| P1 | Batch extraction | `python3 tools/dance.py --batch urls.txt` processes a list of YouTube URLs into the library | Export command |
| P1 | Agentic video finder | Agent team that takes a song name → searches YouTube → picks the best dance video → extracts choreography | Batch extraction |
| P2 | Quality scoring | Auto-rate extraction quality (% frames with valid poses, skeleton stability) so bad extractions get flagged | Export command |

**Exit criteria:**
- [ ] Library contains 5+ songs with extracted choreographies
- [ ] `--export` produces a loadable JSON file
- [ ] Index file is auto-updated on each export

---

## Phase 2: Audio Fingerprinting — Teach it to Listen
**Goal:** The system can identify a playing song within 3-5 seconds by comparing against its library
**Status:** Not Started

| Priority | Task | Description | Dependencies |
|----------|------|-------------|-------------|
| P0 | Audio fingerprint generation | Generate a compact fingerprint from audio (chromaprint/fpcalc or similar) during export | Phase 1 export |
| P0 | Fingerprint matching | Compare live audio fingerprint against library fingerprints, return match + confidence | Fingerprint generation |
| P1 | Browser-side fingerprinting | Port fingerprint comparison to JS (Web Audio API spectral analysis) for real-time matching | Fingerprint matching |
| P1 | Partial match from first N seconds | Match using only the first 3-5 seconds of audio, not the whole song | Fingerprint matching |
| P2 | Fuzzy matching | Handle different recordings/remixes of the same song (covers, live versions) | Partial match |

**Exit criteria:**
- [ ] System correctly identifies a known song within 5 seconds of playback
- [ ] False positive rate < 5% on unknown songs
- [ ] Works in both Python (pygame) and browser (Web Audio API)

---

## Phase 3: The Reaction — Make it Feel Human
**Goal:** When the figure recognizes a song, it visibly reacts before switching to choreography
**Status:** Not Started

| Priority | Task | Description | Dependencies |
|----------|------|-------------|-------------|
| P0 | Recognition jump | Stick figure does an excited jump when it identifies the song | Phase 2 matching |
| P0 | Thought bubble | Speech/thought bubble appears with song name + artist (e.g., "Oh! Thriller — MJ!") | Recognition jump |
| P0 | Freestyle → choreography transition | Smooth blend from random freestyle moves to the memorized choreography | Phase 1 library, Phase 2 matching |
| P1 | "Confused" state | When song is NOT recognized, figure looks around/shrugs — subtle "I don't know this one" animation | Recognition jump |
| P1 | Timeline sync | After recognition, sync choreography to current position in the song (not start from beat 0) | Freestyle → choreo transition |
| P2 | Anticipation moves | If figure "almost" recognizes a song (low confidence), show thinking/head-tilting animation | Fuzzy matching |

**Exit criteria:**
- [ ] Visible reaction within 1 second of recognition
- [ ] Thought bubble renders cleanly in all 3 themes
- [ ] Transition from freestyle to choreography is smooth (no jarring pose snap)
- [ ] Unknown songs produce a distinct "confused" reaction, then continue freestyle

---

## Phase 4: Browser Integration — Bring it Home
**Goal:** Wire the choreography playback and recognition into the existing browser app
**Status:** Not Started

| Priority | Task | Description | Dependencies |
|----------|------|-------------|-------------|
| P0 | Pose player JS module | `js/pose-player.js` that loads choreography JSON and drives the skeleton | Phase 1 export format |
| P0 | Mode switching | Live switching between freestyle (current engine) and choreography (pose player) mid-song | Pose player |
| P0 | Theme compatibility | Choreography playback works with Minimal, Stylized, and Wild themes | Pose player |
| P1 | Library browser UI | Simple UI to see which songs are in the library, preview choreographies | Library index |
| P1 | Recognition indicator | Visual indicator showing "Listening...", "Recognized!", or "New song — freestyling" | Phase 3 reactions |
| P2 | Video recording of choreography | Existing video exporter works with choreography playback, not just freestyle | Mode switching |

**Exit criteria:**
- [ ] Known song plays → recognition reaction → memorized choreography in browser
- [ ] Unknown song plays → freestyle dancing (existing behavior)
- [ ] All 3 themes render choreography correctly
- [ ] Video recording captures both modes

---

## Phase 5: Scale & Polish
**Goal:** Grow the library, improve recognition speed, polish the experience
**Status:** Not Started

| Priority | Task | Description | Dependencies |
|----------|------|-------------|-------------|
| P0 | 20+ song library | Curated set of iconic dance songs with high-quality extractions | Agentic video finder |
| P1 | Sub-3-second recognition | Optimize fingerprinting for faster identification | Browser fingerprinting |
| P1 | Choreography quality filter | Auto-skip low-quality extractions, fall back to freestyle for bad segments | Quality scoring |
| P2 | Social sharing format | 9:16 vertical video export for Shorts/Reels/TikTok | Video recording |
| P2 | Community library | Shareable choreography packs others can import | Export format |

**Exit criteria:**
- [ ] 20+ songs recognized reliably
- [ ] Average recognition time < 3 seconds
- [ ] End-to-end demo: upload unknown song → freestyle; upload known song → recognize + choreography

---

## Risks & Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|-----------|
| Audio fingerprinting too slow in browser | High | Medium | Pre-compute fingerprints server-side, ship compact comparison data to browser |
| MediaPipe extraction quality varies wildly across videos | High | High | Quality scoring + manual curation; fall back to freestyle for bad segments |
| YouTube videos get taken down (library depends on URLs) | Medium | High | Store extracted poses locally, not URLs; the choreography survives the video |
| Song recognition false positives (wrong choreography) | High | Low | Require high confidence threshold; "confused" state as default |
| Transition from freestyle to choreography looks jarring | Medium | Medium | Smoothstep interpolation over 0.5-1s; match body position before switching |

## Open Questions
- Which audio fingerprinting library? chromaprint (C, battle-tested) vs. pure JS solution vs. spectral hash approach
- Should the library be committed to the repo or stored externally (too large for git)?
- How to handle songs with multiple popular choreographies (e.g., different TikTok dances to the same song)?
- Should recognition happen in Python (server-side) or JavaScript (client-side) or both?

## Out of Scope
- AI-generated choreography (making up new dances) — this is about *remembering* real dances
- Music identification services (Shazam API) — we build our own matching against our library only
- Multi-figure choreography (group dances) — single stick figure for now
- Real-time pose extraction from webcam — extraction is offline only
