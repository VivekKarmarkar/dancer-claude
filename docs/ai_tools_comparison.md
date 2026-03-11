# AI Tools Comparison: Claude Code vs. Lovable vs. Google AI Studio vs. Sora

How Dancer Claude was built with Claude Code — and why other AI tools couldn't pull it off.

## The Experiment

All tools were evaluated against the same goal: build a browser-based stick figure that dances to music — freestyle to any song, perform learned choreography from YouTube videos, and mine individual moves via dictionary learning.

## Freestyle (upload any song, figure improvises)

| Tool | Result |
|------|--------|
| **Claude Code** | Asked the right question unprompted — proposed a discrete move alphabet (distinct poses composed into sequences) that matched the user's mental model exactly. Built the full engine in the first session. User on Max plan. |
| **Google AI Studio** | Didn't ask questions. Jumped straight to code. Went in the wrong direction from step 1. Way off. Free. |
| **Lovable** | Has plan mode, but didn't ask the right questions during planning. Started closer but still diverged from the right design at step 1. Got closer with iteration but hit a credit paywall before reaching parity. User on free plan — ran out of credits mid-iteration. |
| **Sora** | Not applicable. Sora generates videos, not interactive applications. |

**Verdict:** Theoretically possible for all three app builders, but only Claude Code nailed it — because it was curious about the *what* before jumping to the *how*. Sora is a different category entirely (see below).

## Learnt — Songs (pick a pre-learned song, figure performs exact choreography)

| Tool | Result |
|------|--------|
| **Claude Code** | Built the full pipeline: YouTube download → MediaPipe pose extraction → normalized JSON + synced MP3 → browser playback with PosePlayer module. 10 songs extracted and working. |
| **Google AI Studio** | Impossible. No shell, no local filesystem, no Python runtime. |
| **Lovable** | Impossible. No shell, no local filesystem, no Python runtime. |
| **Sora** | Not applicable. Cannot build interactive systems. |

**Verdict:** Impossible for app builders. Requires infrastructure on the user's **local machine**:
- Downloading YouTube videos (large video files stored locally)
- A Python venv with ML libraries (MediaPipe) installed on the local machine
- Running ffmpeg locally for audio extraction
- Processing and iterating on real videos locally (finding that a 40-person YMCA video fails but a solo dancer nails it)
- A `library/` folder of generated JSON + MP3 artifacts living on the local filesystem
- A local HTTP server to serve those assets to the browser app

App builders are sandboxed cloud/browser environments. They have no shell, no local filesystem access, no ability to install Python packages or run ML models. They never touch your machine. Claude Code runs **in your terminal, on your machine** — that's why it can do this and they can't.

## Learnt — Moves (mine individual moves from choreographies)

| Tool | Result |
|------|--------|
| **Claude Code** | Dictionary learning decomposes choreographies into recurring atoms. A GTK dialog with animated GIFs lets the human pick the best ones. Selected moves saved as mini-choreography JSONs — same format as full songs, reusing PosePlayer with zero data transformation. Auto-labeling via audio DSP. |
| **Google AI Studio** | Impossible. No local Python, no sklearn, no GTK, no human-in-the-loop UI. |
| **Lovable** | Impossible. Same reasons. |
| **Sora** | Not applicable. Cannot do ML pipelines or human-in-the-loop curation. |

**Verdict:** Requires dictionary learning (sklearn), audio analysis (librosa), a desktop GUI for human review (GTK), and iterative local development. None of the app builders can touch this.

## What About Sora?

Sora can generate short videos of stick figures dancing. But that's a fundamentally different thing:

- **No interactivity** — Sora outputs a video file. Dancer Claude is a live interactive app where you upload your own music and watch the figure dance in real-time.
- **No real-time audio sync** — Sora doesn't take an MP3 and sync motion to it. The dance engine here does beat detection, frequency analysis, and energy-based move selection every frame.
- **No learning from real choreography** — Sora generates plausible-looking motion from its training data. Dancer Claude extracts actual poses from actual YouTube dance videos via computer vision and plays them back faithfully.
- **No ML pipeline** — There's no dictionary learning, no human curation, no move mining. Sora is a black box that outputs pixels.
- **Short-form only** — Sora generates clips. Dancer Claude plays full songs.

Sora makes things that look like dancing. Dancer Claude is a system that actually dances.

## Why Claude Code Won

1. **Curiosity** — Independently proposed the move alphabet architecture and asked "what do you think?" before writing code. The others just started building.
2. **Local machine access** — Runs in your terminal, your filesystem, with your tools. Not a cloud sandbox.
3. **Cross-runtime** — Seamlessly works across Python (ML pipeline) and JavaScript (browser app) in the same session.
4. **Multi-session collaboration** — Persistent filesystem means work compounds across sessions. The library built in one session is served by the browser app in the next.
5. **Human-in-the-loop workflows** — Can launch desktop GUIs (GTK dialogs), wait for human input, and continue the pipeline. App builders have no concept of this.
6. **No per-project credit limits** — User on Max plan. Lovable's free plan ran out of credits mid-iteration.

## The Simple Version

- **Freestyle**: App builders *can* but *didn't*. Wrong direction from step 1.
- **Learnt Songs**: App builders *can't*. Needs local files + Python + ML libraries.
- **Learnt Moves**: App builders *can't*. Needs dictionary learning + human-in-the-loop desktop UI.
- **Sora**: Different category. Generates video, not interactive systems. No audio sync, no learning, no ML pipeline.
