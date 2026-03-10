# Project Roadmap: Dancer Claude

> **Updated:** 2026-03-10

## Vision

A stick figure that doesn't just dance to any song — it *recognizes* songs it's learned before and switches from freestyle to memorized choreography. You just upload a song. The figure figures it out. Known song? It snaps into the real moves. Unknown? It freestyles. It stops feeling like a tool with two modes and starts feeling like a character with a memory.

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
- Freestyle/Choreographed mode toggle in the browser UI
- Themes stay reactive to the beat in both modes
- All existing controls (pause, seek, record) work in choreo mode

---

## Level 3: Song Recognition — NEXT

**The show-stopper.** No more manual mode switching. Upload any song — the figure starts freestyling, listens for a few seconds, and if it recognizes the song, it reacts ("Oh I know this one!") and snaps into the learned choreography. Unknown songs just keep freestyling.

This is the level that makes the project feel *integrated* — Freestyle and Choreographed merge into one seamless experience. The figure becomes a character with a memory, not a tool with two tabs.

**Key challenges:**
- Audio fingerprinting — match an uploaded song against the library within 3-5 seconds
- Freestyle → choreography transition — smooth blend, no jarring pose snap
- Timeline sync — after recognition, join the choreography at the right beat, not from the start
- Reaction animation — the excited recognition moment that sells the whole thing
- Confidence thresholds — wrong match is worse than no match

**What "done" looks like:**
- Upload YMCA → figure freestyles for a few seconds → recognition reaction → performs the Macarena choreography
- Upload an unknown song → figure freestyles the whole time, no false triggers
- The transition moment feels magical, not mechanical

---

## Level 4: Move Mining — FUTURE

Extract individual moves from the choreography library to expand the freestyle vocabulary. Instead of 23 hand-crafted moves, the system learns new moves from what it's watched.

**The hard problem:** A choreography is a continuous stream of joint positions with no labels. You have to figure out where one move ends and another begins, then decide what's a distinct move vs. a variation.

**Approaches to explore:**
- **Segmentation** — velocity minima (moments where the body is relatively still) as natural move boundaries
- **Clustering** — group similar segments across songs (DTW / dynamic time warping for pose sequence similarity)
- **Decomposition** — split full-body segments into upper/lower body moves to match the freestyle engine's layering system

**What "done" looks like:**
- Feed in 10 choreographies, get back 15-30 distinct new moves
- New moves plug into the freestyle sequencer and look natural
- The freestyle vocabulary grows with every YouTube video fed into the system

---

## Level 5: Scale & Polish — FUTURE

- 20+ song library with curated high-quality extractions
- Sub-3-second recognition
- Agentic video finder (song name → YouTube search → best dance video → auto-extraction)
- Social sharing (9:16 vertical video for Shorts/Reels/TikTok)
- Quality scoring for extractions (auto-flag bad tracking)

---

## Risks

| Risk | Mitigation |
|------|-----------|
| Audio fingerprinting too slow in browser | Pre-compute fingerprints at export time, ship compact comparison data |
| Song recognition false positives | High confidence threshold; default to freestyle when uncertain |
| Freestyle → choreography transition looks jarring | Smoothstep interpolation over 0.5-1s; match body position before switching |
| MediaPipe extraction quality varies across videos | Quality scoring + manual curation; solo dancer + clean background = best results |
| Move segmentation produces garbage clusters | Start small, eyeball results, iterate — this is a research problem with a fast feedback loop |

## Open Questions

- Which audio fingerprinting approach? chromaprint (C, battle-tested) vs. spectral hashing in JS vs. something else
- Should recognition happen client-side (Web Audio API) or involve a server?
- How to handle multiple choreographies for the same song (different TikTok dances)?
- What's the right confidence threshold for recognition — too low = false positives, too high = misses?
