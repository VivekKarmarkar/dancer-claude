# Dancer Claude Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a browser-based app where a stick figure dances to any song in real-time with three visual themes and video download.

**Architecture:** Single-page web app using HTML5 Canvas + Web Audio API. Four JS modules (audio engine, canvas renderer, move system, video exporter) orchestrated by a main controller. No server, no build tools.

**Tech Stack:** Vanilla HTML/CSS/JS, Web Audio API, Canvas 2D, MediaRecorder API, ES modules

---

## File Structure

```
dancer-claude/
├── index.html              # Main HTML shell + UI
├── css/
│   └── styles.css          # All styling
├── js/
│   ├── main.js             # App controller, wires everything together
│   ├── audio-engine.js     # Web Audio API, beat detection, energy analysis
│   ├── skeleton.js         # Stick figure joint model + drawing
│   ├── moves.js            # Dance move keyframe definitions
│   ├── move-sequencer.js   # Selects and blends moves based on audio
│   ├── themes/
│   │   ├── minimal.js      # Minimal theme renderer
│   │   ├── stylized.js     # Stylized theme renderer
│   │   └── wild.js         # Wild theme renderer
│   └── video-exporter.js   # MediaRecorder capture + download
├── audio/                  # Pre-loaded royalty-free tracks
│   └── (added in Task 12)
├── tests/
│   └── test.html           # Browser-based test runner
└── docs/plans/             # Design + plan docs
```

---

### Task 1: Project Scaffold + HTML Shell

**Files:**
- Create: `index.html`
- Create: `css/styles.css`
- Create: `js/main.js`

**Step 1: Create index.html with the full UI layout**

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dancer Claude</title>
    <link rel="stylesheet" href="css/styles.css">
</head>
<body>
    <div id="app">
        <header>
            <h1>Dancer Claude</h1>
            <div id="theme-toggle">
                <button data-theme="minimal" class="active">Minimal</button>
                <button data-theme="stylized">Stylized</button>
                <button data-theme="wild">Wild</button>
            </div>
        </header>

        <canvas id="dance-floor" width="800" height="500"></canvas>

        <div id="playback">
            <span id="now-playing">No song loaded</span>
            <div id="progress-bar">
                <div id="progress-fill"></div>
            </div>
            <span id="time-display">0:00 / 0:00</span>
        </div>

        <div id="song-select">
            <h3>Pre-loaded tracks</h3>
            <div id="preset-buttons"></div>
            <div class="divider">or</div>
            <label id="upload-label" for="upload-input">
                Upload your own song
                <input type="file" id="upload-input" accept="audio/*">
            </label>
        </div>

        <div id="controls">
            <button id="play-btn" disabled>Play</button>
            <button id="record-btn" disabled>Record</button>
            <button id="record-full-btn" disabled>Record Full Song</button>
        </div>
    </div>

    <script type="module" src="js/main.js"></script>
</body>
</html>
```

**Step 2: Create css/styles.css with dark-themed styling**

Style the layout as per the design doc: centered app container, canvas with border, theme toggle buttons, progress bar, song selection area, control buttons. Use a clean dark theme (dark gray bg, white text) so it looks good with all three canvas themes.

Key styles:
- `#app`: max-width 900px, centered, padding
- `canvas`: full width of container, dark background, rounded corners
- Theme buttons: pill-shaped, highlight active one
- Progress bar: clickable, shows fill percentage
- Control buttons: distinct colors (play=green, record=red, record-full=orange)

**Step 3: Create js/main.js as empty module**

```javascript
// Main controller — wires audio engine, renderer, and UI together
console.log('Dancer Claude loaded');
```

**Step 4: Verify — open index.html in browser**

Expected: See the full UI layout with all buttons (disabled), canvas area, theme toggle. Console shows "Dancer Claude loaded".

**Step 5: Commit**

```bash
git init
git add index.html css/styles.css js/main.js
git commit -m "feat: scaffold project with HTML shell and UI layout"
```

---

### Task 2: Stick Figure Skeleton Model

**Files:**
- Create: `js/skeleton.js`
- Create: `tests/test.html`

**Step 1: Create the test file**

Create `tests/test.html` — a minimal browser test runner that imports modules and runs assertions, logging pass/fail to the page. Include tests for:

```javascript
// Test: default pose has 12 joints
const skeleton = new Skeleton();
const pose = skeleton.getDefaultPose();
assert(Object.keys(pose).length === 12, 'Default pose has 12 joints');

// Test: each joint has x and y
for (const [name, pos] of Object.entries(pose)) {
    assert(typeof pos.x === 'number', `${name}.x is a number`);
    assert(typeof pos.y === 'number', `${name}.y is a number`);
}

// Test: interpolation between two poses
const poseA = skeleton.getDefaultPose();
const poseB = skeleton.getDefaultPose();
poseB.head.y -= 20; // head moves up
const mid = Skeleton.interpolate(poseA, poseB, 0.5);
assert(mid.head.y === poseA.head.y - 10, 'Interpolation at 0.5 is midpoint');
```

**Step 2: Run tests — verify they fail**

Open `tests/test.html` in browser. Expected: failures because `Skeleton` doesn't exist yet.

**Step 3: Implement skeleton.js**

```javascript
// Joint names and connections
const JOINTS = [
    'head', 'neck',
    'leftShoulder', 'rightShoulder',
    'leftElbow', 'rightElbow',
    'leftHand', 'rightHand',
    'hip',
    'leftKnee', 'rightKnee',
    'leftFoot', 'rightFoot'
];

// Bone connections: [from, to]
const BONES = [
    ['head', 'neck'],
    ['neck', 'leftShoulder'], ['neck', 'rightShoulder'],
    ['leftShoulder', 'leftElbow'], ['leftElbow', 'leftHand'],
    ['rightShoulder', 'rightElbow'], ['rightElbow', 'rightHand'],
    ['neck', 'hip'],
    ['hip', 'leftKnee'], ['leftKnee', 'leftFoot'],
    ['hip', 'rightKnee'], ['rightKnee', 'rightFoot']
];

export class Skeleton {
    // Returns a default standing pose: {jointName: {x, y}, ...}
    getDefaultPose() { ... }

    // Static: interpolate between poseA and poseB at t (0..1)
    // Uses ease-in-out for natural motion
    static interpolate(poseA, poseB, t) { ... }

    // Draw the skeleton on a canvas 2D context given a pose and style config
    draw(ctx, pose, style) { ... }
}
```

Default pose positions (centered on canvas 800x500):
- head: (400, 120), neck: (400, 150)
- shoulders at y=160, elbows at y=210, hands at y=260
- hip: (400, 280)
- knees at y=360, feet at y=440
- left/right offset by ~40px from center

The `draw()` method:
- Circle for head (radius ~15)
- Lines for all bones (lineWidth from style config)
- Color from style config

**Step 4: Run tests — verify they pass**

Open `tests/test.html`. Expected: all tests pass.

**Step 5: Verify visually — draw default pose on canvas**

Temporarily add to `main.js`: create Skeleton, get default pose, draw it on canvas.
Expected: see a stick figure standing in the center of the canvas.

**Step 6: Commit**

```bash
git add js/skeleton.js tests/test.html
git commit -m "feat: stick figure skeleton with joints, bones, interpolation"
```

---

### Task 3: Dance Move Definitions

**Files:**
- Create: `js/moves.js`

**Step 1: Add move tests to test.html**

```javascript
// Test: all moves have required metadata
for (const move of getAllMoves()) {
    assert(['low', 'mid', 'high'].includes(move.energy), `${move.name} has valid energy`);
    assert([1, 2, 4].includes(move.durationBeats), `${move.name} has valid duration`);
    assert(move.keyframes.length >= 2, `${move.name} has at least 2 keyframes`);
    // Each keyframe has a time (0..1) and a pose delta
    for (const kf of move.keyframes) {
        assert(kf.time >= 0 && kf.time <= 1, `${move.name} keyframe time in range`);
        assert(typeof kf.pose === 'object', `${move.name} keyframe has pose`);
    }
}
```

**Step 2: Run tests — verify fail**

**Step 3: Implement moves.js**

Each move is defined as pose deltas (offsets from default pose) at keyframe times. This keeps moves relative so they work regardless of the figure's position.

```javascript
export function getAllMoves() { return MOVES; }
export function getMovesByEnergy(energy) { return MOVES.filter(m => m.energy === energy); }

const MOVES = [
    {
        name: 'headBob',
        energy: 'low',
        durationBeats: 1,
        type: 'full-body',
        keyframes: [
            { time: 0.0, pose: { /* all zeros — default */ } },
            { time: 0.5, pose: { head: {x:0, y:-8}, neck: {x:0, y:-5}, hip: {x:0, y:5}, leftKnee: {x:0,y:3}, rightKnee:{x:0,y:3} } },
            { time: 1.0, pose: { /* all zeros — back to default */ } }
        ]
    },
    // ... define 15-20 moves total covering low/mid/high energy
];
```

Moves to implement:
- **Low (4):** headBob, sway, gentleArmWave, stepTouch
- **Mid (5):** clap, armPump, hipShake, spin, point
- **High (5):** jump, kick, doubleArmWave, fullSpin, runningMan

Each move: 2-4 keyframes, pose deltas for affected joints. Unaffected joints default to {x:0, y:0}.

**Step 4: Run tests — verify pass**

**Step 5: Commit**

```bash
git add js/moves.js
git commit -m "feat: define 15+ dance moves with keyframe poses"
```

---

### Task 4: Audio Engine

**Files:**
- Create: `js/audio-engine.js`

**Step 1: Implement audio-engine.js**

```javascript
export class AudioEngine {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.source = null;
        this.audioBuffer = null;
        this.startTime = 0;
        this.isPlaying = false;
    }

    // Initialize AudioContext (must be called from user gesture)
    async init() { ... }

    // Load audio from URL or File object
    async loadAudio(urlOrFile) { ... }

    // Play / pause / stop / seek
    play() { ... }
    pause() { ... }
    stop() { ... }
    seek(time) { ... }

    // Get current playback time and duration
    getCurrentTime() { ... }
    getDuration() { ... }

    // Real-time analysis — call each frame
    getAnalysis() {
        // Returns: { energy: 0-1, bass: 0-1, mid: 0-1, treble: 0-1, isBeat: bool }
        // energy = average amplitude across all frequency bins
        // bass/mid/treble = average of respective frequency ranges
        // isBeat = energy spike detection (current energy >> recent average)
    }

    // Get the audio destination for MediaRecorder
    getDestination() { ... }
}
```

Beat detection approach:
- Use `AnalyserNode` with `getByteFrequencyData()`
- Split 1024 frequency bins into bass (0-10), mid (10-100), treble (100+)
- Track rolling average of energy over last ~0.5s
- `isBeat` = true when current energy > rolling average * 1.4 AND at least 200ms since last beat
- This gives real-time, per-frame beat + energy data without needing offline BPM detection

**Step 2: Verify — wire into main.js temporarily**

Load a test audio file, play it, log `getAnalysis()` each frame.
Expected: see energy values fluctuating with the music, `isBeat` firing on beat hits.

**Step 3: Commit**

```bash
git add js/audio-engine.js
git commit -m "feat: audio engine with Web Audio API analysis and beat detection"
```

---

### Task 5: Move Sequencer

**Files:**
- Create: `js/move-sequencer.js`

**Step 1: Add sequencer tests to test.html**

```javascript
// Test: sequencer returns a pose for any given time
const sequencer = new MoveSequencer();
sequencer.setBPM(120);
sequencer.setEnergy(0.5);
const pose = sequencer.getPoseAtTime(0);
assert(pose !== null, 'Sequencer returns a pose');
assert(typeof pose.head.x === 'number', 'Pose has valid joint positions');

// Test: energy change affects move selection
sequencer.setEnergy(0.9);
// Should now pick high-energy moves
```

**Step 2: Run tests — verify fail**

**Step 3: Implement move-sequencer.js**

```javascript
import { getAllMoves, getMovesByEnergy } from './moves.js';
import { Skeleton } from './skeleton.js';

export class MoveSequencer {
    constructor() {
        this.currentMove = null;
        this.nextMove = null;
        this.moveStartBeat = 0;
        this.beatCount = 0;
        this.bpm = 120;
        this.energy = 0.5;
        this.lastBeatTime = 0;
    }

    // Update with audio analysis each frame
    update(analysis, currentTime) {
        // Track beats: increment beatCount on each beat
        // When current move ends (beatCount >= move.durationBeats from start):
        //   - Pick next move based on current energy level
        //   - If isBeat and high energy spike, pick a "power move"
        // Blend between ending move and starting move over ~0.15s
    }

    // Get the current interpolated pose (absolute positions, not deltas)
    getCurrentPose() {
        // 1. Get default pose
        // 2. Get current move's keyframe delta at current progress
        // 3. If blending, also get next move's delta and mix
        // 4. Apply deltas to default pose
        // Return final pose
    }

    // Energy thresholds:
    // 0.0 - 0.33 → low energy moves
    // 0.33 - 0.66 → mid energy moves
    // 0.66 - 1.0 → high energy moves
    _pickMove(energy, isBeatDrop) { ... }
}
```

**Step 4: Run tests — verify pass**

**Step 5: Commit**

```bash
git add js/move-sequencer.js
git commit -m "feat: move sequencer selects and blends moves based on audio energy"
```

---

### Task 6: Minimal Theme Renderer

**Files:**
- Create: `js/themes/minimal.js`

**Step 1: Implement minimal.js**

```javascript
export class MinimalTheme {
    drawBackground(ctx, canvas) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    getSkeletonStyle() {
        return {
            strokeColor: '#000000',
            lineWidth: 3,
            headRadius: 15,
            headFill: null, // just stroke
        };
    }

    drawEffects(ctx, canvas, analysis) {
        // No effects for minimal
    }
}
```

**Step 2: Verify visually**

Wire into main.js: clear canvas, draw background, draw skeleton with style.
Expected: black stick figure on white background.

**Step 3: Commit**

```bash
git add js/themes/minimal.js
git commit -m "feat: minimal theme — black stick figure on white background"
```

---

### Task 7: Stylized Theme Renderer

**Files:**
- Create: `js/themes/stylized.js`

**Step 1: Implement stylized.js**

```javascript
export class StylizedTheme {
    drawBackground(ctx, canvas) {
        // Dark background (#1a1a2e)
        // Gradient dance floor at bottom 30% (dark purple to dark blue)
        // Soft radial spotlight glow centered on figure
    }

    getSkeletonStyle() {
        return {
            strokeColor: '#00d4ff', // electric cyan
            lineWidth: 4,
            headRadius: 16,
            headFill: '#00d4ff',
            glow: true, // enable shadow blur on lines
        };
    }

    drawEffects(ctx, canvas, analysis) {
        // Subtle shadow beneath the figure (dark ellipse at foot level)
    }
}
```

**Step 2: Verify visually**

Expected: cyan stick figure on dark background with gradient floor and spotlight.

**Step 3: Commit**

```bash
git add js/themes/stylized.js
git commit -m "feat: stylized theme — cyan figure on dark stage with spotlight"
```

---

### Task 8: Wild Theme Renderer

**Files:**
- Create: `js/themes/wild.js`

**Step 1: Implement wild.js**

This is the most complex theme. It manages its own particle system and effects state.

```javascript
export class WildTheme {
    constructor() {
        this.particles = [];
        this.trails = []; // recent poses for afterimage
        this.hue = 0;
        this.beatRipples = [];
        this.flashAlpha = 0;
    }

    drawBackground(ctx, canvas) {
        // Dark background (#0a0a0a)
        // Don't fully clear — use semi-transparent rect for motion blur trail effect
        ctx.fillStyle = 'rgba(10, 10, 10, 0.3)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

    getSkeletonStyle(analysis) {
        this.hue = (this.hue + analysis.energy * 3) % 360;
        return {
            strokeColor: `hsl(${this.hue}, 100%, 60%)`,
            lineWidth: 4,
            headRadius: 16,
            headFill: `hsl(${this.hue}, 100%, 60%)`,
            glow: true,
        };
    }

    drawEffects(ctx, canvas, analysis, pose) {
        // 1. Update and draw particles
        //    - On isBeat: spawn 10-20 particles at random positions near figure
        //    - Each frame: update position (gravity + velocity), reduce alpha, remove dead
        //    - Draw each as small colored circle

        // 2. Beat ripples
        //    - On isBeat: add ripple at figure center
        //    - Each frame: expand radius, reduce alpha
        //    - Draw as concentric circle outlines

        // 3. Pose trail / afterimage
        //    - Store last 5 poses
        //    - Draw each with decreasing alpha

        // 4. Beat drop flash
        //    - On high energy beat: set flashAlpha = 0.3
        //    - Each frame: reduce flashAlpha
        //    - Draw full-canvas white rect with flashAlpha
    }
}
```

**Step 2: Verify visually**

Play audio, watch for particles, ripples, color shifts, and trail effects.
Expected: psychedelic dancing stick figure reacting to the music.

**Step 3: Commit**

```bash
git add js/themes/wild.js
git commit -m "feat: wild theme — particles, ripples, color shift, trails"
```

---

### Task 9: Main Controller — Wire Everything Together

**Files:**
- Modify: `js/main.js`

**Step 1: Implement main.js**

This is the orchestrator. It connects all modules and runs the animation loop.

```javascript
import { AudioEngine } from './audio-engine.js';
import { Skeleton } from './skeleton.js';
import { MoveSequencer } from './move-sequencer.js';
import { MinimalTheme } from './themes/minimal.js';
import { StylizedTheme } from './themes/stylized.js';
import { WildTheme } from './themes/wild.js';

class DancerApp {
    constructor() {
        this.canvas = document.getElementById('dance-floor');
        this.ctx = this.canvas.getContext('2d');
        this.audio = new AudioEngine();
        this.skeleton = new Skeleton();
        this.sequencer = new MoveSequencer();
        this.themes = {
            minimal: new MinimalTheme(),
            stylized: new StylizedTheme(),
            wild: new WildTheme()
        };
        this.currentTheme = 'minimal';
        this.isPlaying = false;

        this._bindUI();
        this._animate();
    }

    _bindUI() {
        // Theme toggle buttons
        // Play/pause button
        // Upload input
        // Progress bar click-to-seek
        // Record buttons
    }

    async loadSong(urlOrFile, name) {
        await this.audio.init();
        await this.audio.loadAudio(urlOrFile);
        // Update UI: enable buttons, show song name
    }

    _animate() {
        requestAnimationFrame(() => this._animate());

        const theme = this.themes[this.currentTheme];

        if (this.isPlaying) {
            const analysis = this.audio.getAnalysis();
            const time = this.audio.getCurrentTime();
            this.sequencer.update(analysis, time);
        }

        const pose = this.sequencer.getCurrentPose();
        const analysis = this.isPlaying ? this.audio.getAnalysis() : { energy: 0, isBeat: false };

        // Draw
        theme.drawBackground(this.ctx, this.canvas);
        const style = theme.getSkeletonStyle(analysis);
        this.skeleton.draw(this.ctx, pose, style);
        theme.drawEffects(this.ctx, this.canvas, analysis, pose);

        // Update progress bar
        this._updateProgress();
    }
}

// Start the app
const app = new DancerApp();
```

**Step 2: Verify end-to-end**

Upload any audio file, press play. Expected: stick figure dances, theme toggle switches visuals instantly, progress bar advances.

**Step 3: Commit**

```bash
git add js/main.js
git commit -m "feat: main controller wiring audio, moves, themes, and UI"
```

---

### Task 10: Video Exporter

**Files:**
- Create: `js/video-exporter.js`
- Modify: `js/main.js` (wire record buttons)

**Step 1: Implement video-exporter.js**

```javascript
export class VideoExporter {
    constructor(canvas, audioDestination) {
        this.canvas = canvas;
        this.audioDestination = audioDestination;
        this.mediaRecorder = null;
        this.chunks = [];
        this.isRecording = false;
    }

    startRecording() {
        // Create MediaStream from canvas (30fps)
        const canvasStream = this.canvas.captureStream(30);
        // Get audio stream from audio destination
        const audioStream = this.audioDestination.stream;
        // Combine into one MediaStream
        const combined = new MediaStream([
            ...canvasStream.getTracks(),
            ...audioStream.getTracks()
        ]);
        // Create MediaRecorder (prefer webm with vp9 codec)
        this.mediaRecorder = new MediaRecorder(combined, {
            mimeType: 'video/webm;codecs=vp9,opus'
        });
        this.chunks = [];
        this.mediaRecorder.ondataavailable = (e) => this.chunks.push(e.data);
        this.mediaRecorder.start();
        this.isRecording = true;
    }

    stopRecording() {
        return new Promise((resolve) => {
            this.mediaRecorder.onstop = () => {
                const blob = new Blob(this.chunks, { type: 'video/webm' });
                this.isRecording = false;
                resolve(blob);
            };
            this.mediaRecorder.stop();
        });
    }

    // Trigger browser download of the video blob
    static download(blob, filename = 'dancer-claude.webm') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    }
}
```

**Step 2: Wire into main.js**

- Record button: start/stop recording, toggle button text
- Record Full Song: stop playback, seek to 0, start recording, play, on song end → stop recording and download

**Step 3: Verify — record a short clip, download, play in VLC/browser**

Expected: WebM file with both video and audio, stick figure dancing in sync.

**Step 4: Commit**

```bash
git add js/video-exporter.js js/main.js
git commit -m "feat: video export with MediaRecorder — record and download"
```

---

### Task 11: Pre-loaded Tracks

**Files:**
- Create: `audio/` directory with royalty-free tracks
- Modify: `js/main.js` (populate preset buttons)

**Step 1: Source royalty-free tracks**

Find 3-4 short royalty-free tracks with different tempos/energies. Options:
- Use free music from sources like Pixabay, Free Music Archive, or incompetech.com
- Keep files small (30-60 second clips, MP3, <1MB each)
- Name them descriptively: `upbeat-dance.mp3`, `chill-groove.mp3`, `high-energy.mp3`, `funky-beat.mp3`

**Step 2: Add preset config to main.js**

```javascript
const PRESETS = [
    { name: 'Upbeat Dance', file: 'audio/upbeat-dance.mp3' },
    { name: 'Chill Groove', file: 'audio/chill-groove.mp3' },
    { name: 'High Energy', file: 'audio/high-energy.mp3' },
    { name: 'Funky Beat', file: 'audio/funky-beat.mp3' },
];
```

Generate preset buttons dynamically. On click, load that track.

**Step 3: Verify — click each preset, confirm it loads and plays**

**Step 4: Commit**

```bash
git add audio/ js/main.js
git commit -m "feat: add pre-loaded royalty-free tracks with preset buttons"
```

---

### Task 12: Polish and Integration

**Files:**
- Modify: `css/styles.css` (responsive, transitions)
- Modify: `js/main.js` (edge cases)
- Modify: various (bug fixes from testing)

**Step 1: CSS polish**

- Smooth transitions on theme toggle (button active states)
- Responsive canvas (scale down on mobile)
- Disabled button styles
- Progress bar hover/active states
- Upload label styled as a button
- Record button pulses red when recording

**Step 2: Edge case handling**

- Disable play/record until a song is loaded
- Handle song ending: stop animation, reset progress
- Handle upload of invalid files gracefully
- Resume AudioContext on first user click (browser autoplay policy)
- Handle theme switch during recording (should just work, but verify)

**Step 3: Full end-to-end testing**

Manual test checklist:
- [ ] Load preset track → plays → figure dances in sync
- [ ] Upload MP3 → plays → figure dances
- [ ] Upload WAV → plays → figure dances
- [ ] Switch themes during playback — instant, no glitch
- [ ] Progress bar shows correct time, click to seek works
- [ ] Record → stop → downloads WebM with audio + video
- [ ] Record Full Song → auto-plays, auto-stops, auto-downloads
- [ ] Wild theme: particles, ripples, color shift all work
- [ ] Stylized theme: spotlight, shadow, gradient floor
- [ ] Minimal theme: clean black on white

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: polish UI, handle edge cases, final integration"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Project scaffold + HTML shell | index.html, styles.css, main.js |
| 2 | Stick figure skeleton model | skeleton.js, tests/test.html |
| 3 | Dance move definitions | moves.js |
| 4 | Audio engine (Web Audio API) | audio-engine.js |
| 5 | Move sequencer | move-sequencer.js |
| 6 | Minimal theme | themes/minimal.js |
| 7 | Stylized theme | themes/stylized.js |
| 8 | Wild theme | themes/wild.js |
| 9 | Main controller | main.js (full wiring) |
| 10 | Video exporter | video-exporter.js |
| 11 | Pre-loaded tracks | audio/ directory |
| 12 | Polish and integration | all files |
