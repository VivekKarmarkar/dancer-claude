# Project Roadmap: Dancer Claude

> **Updated:** 2026-03-11

## Vision

A stick figure that dances to music — freestyle to anything, or performing learned choreography from real YouTube dance videos. Two sides of the same coin: the improviser and the student. Upload a song and freestyle, or pick a learned song and watch the exact moves. Mine individual moves from choreographies and play them back. Just like real life — you freestyle at the clubs, you learn full dances in class, and you pick up a few signature moves along the way.

---

## Level 1: Freestyle — DONE

Upload any song, the stick figure improvises in real-time based on beat detection.

- 23 hand-crafted dance moves
- Layered upper/lower body movement
- Groove system with beat-synced bounce
- Dynamic amplitude scaling
- 3 visual themes (Minimal, Stylized, Wild)
- Video recording (clips + full song)

---

## Level 2: Direct Recall — DONE

Pick a pre-learned song from a dropdown, the stick figure performs the exact choreography extracted from a YouTube dance video.

- `tools/dance.py` — YouTube → MediaPipe pose extraction → normalized JSON + synced MP3
- 10-song library (YMCA, Macarena, Gangnam Style, Toxic, etc.)
- `PosePlayer` module — O(1) frame lookup, smoothstep interpolation at 60fps
- Freestyle/Learnt mode toggle in the browser UI
- Themes stay reactive to the beat in both modes
- All existing controls (pause, seek, record) work in learnt mode

---

## Level 3: Song Recognition — SHELVED

Automatic song recognition that transitions from freestyle to learned choreography mid-song. Shelved because merging the computer-vision-extracted skeleton (from choreography) with the freestyle skeleton requires solving a hard keypoint calibration problem — different skeleton sizes, proportions, and screen positions don't map cleanly. We got a close look at this during Level 4 and it's clear the integration work goes well beyond portfolio/demo scope.

---

## Level 4: Move Mining — DONE

Extract individual moves from choreographies via dictionary learning and human curation. Mined moves are playable directly in the browser as mini-choreographies.

- `tools/move_mining_pipeline.py` — dictionary learning decomposes choreographies into recurring pose patterns (atoms)
- GTK dialog shows animated GIFs of each atom — human picks the good ones and names them
- Selected moves saved as mini-choreo JSONs in `library/moves/` (same format as full choreographies)
- Shared background track replaces per-move audio slicing — avoids weird looping artifacts
- Song/Move sub-toggle under Learnt mode — moves show up in their own dropdown
- Reuses PosePlayer infrastructure — zero data transformation, full fidelity from the original choreography
- Auto-labeling: energy level, duration in beats, move type (arms/legs/full-body) computed from audio DSP
