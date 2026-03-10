# App Builders Comparison: Claude Code vs. Lovable vs. Google AI Studio

How Dancer Claude was built with Claude Code — and why other AI app builders couldn't pull it off.

## The Experiment

All three tools were given the same starting point: build a browser-based stick figure that dances to music.

## Level 1: Freestyle (upload any song, figure improvises)

| Tool | Result |
|------|--------|
| **Claude Code** | Asked the right question unprompted — proposed a discrete move alphabet (distinct poses composed into sequences) that matched the user's mental model exactly. Built the full engine in the first session. Included with the Max plan. |
| **Google AI Studio** | Didn't ask questions. Jumped straight to code. Went in the wrong direction from step 1. Way off. |
| **Lovable** | Has plan mode, but didn't ask the right questions during planning. Started closer but still diverged from the right design at step 1. Got closer with iteration but hit a credit paywall before reaching parity. Costs money. |

**Verdict:** Theoretically possible for all three, but only Claude Code nailed it — because it was curious about the *what* before jumping to the *how*.

## Level 2: Direct Recall (pick a pre-learned song, figure performs exact choreography)

| Tool | Result |
|------|--------|
| **Claude Code** | Built the full pipeline: YouTube download → MediaPipe pose extraction → normalized JSON + synced MP3 → browser playback with PosePlayer module. 10 songs extracted and working. |
| **Google AI Studio** | Impossible. No shell, no local filesystem, no Python runtime. |
| **Lovable** | Impossible. No shell, no local filesystem, no Python runtime. |

**Verdict:** Impossible for app builders. Level 2 requires:
- Downloading YouTube videos (large local files)
- A Python venv with ML libraries (MediaPipe) on the local machine
- Running ffmpeg for audio extraction
- Iterating on real videos (finding that a 40-person YMCA video fails but a solo dancer nails it)
- Serving a library of generated artifacts from the local filesystem

App builders are sandboxed browser environments. They never touch your disk.

## Why Claude Code Won

1. **Curiosity** — Independently proposed the move alphabet architecture and asked "what do you think?" before writing code. The others just started building.
2. **Local machine access** — Runs in your terminal, your filesystem, with your tools. Not a cloud sandbox.
3. **Cross-runtime** — Seamlessly works across Python (ML pipeline) and JavaScript (browser app) in the same session.
4. **Multi-session collaboration** — Persistent filesystem means work compounds across sessions. The library built in one session is served by the browser app in the next.
5. **Included with Max plan** — No per-project credit limits. Lovable hits a paywall mid-iteration.

## The Simple Version

- **Level 1**: They *can* but they *didn't*. Wrong direction from step 1.
- **Level 2**: They *can't*. Needs local files + Python + ML libraries. Full stop.
