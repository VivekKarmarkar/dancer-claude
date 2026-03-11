# Freestyle–Learned Move Mixing Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Mix learned moves into the freestyle engine via a probability slider, converting absolute positions to keyframe deltas.

**Architecture:** Python pipeline converts learned move absolute poses to keyframe deltas (subtract standing pose, downsample to 5 keyframes). JS loads learned moves as a separate pool. Slider controls probability of picking from learned vs freestyle pool in `_selectMove()`.

**Tech Stack:** Python (move_mining_pipeline.py), vanilla JS (moves.js, move-sequencer.js, main.js, index.html)

---

### Task 1: Add keyframe conversion to the Python pipeline

Convert absolute pose data to keyframe deltas in `move_mining_pipeline.py`. This runs after auto-labeling, before saving.

**Files:**
- Modify: `tools/move_mining_pipeline.py`

**Step 1: Add the conversion function**

Add this function after `compute_move_labels()` and before the "Dictionary learning" section comment:

```python
# Standing pose — must match js/skeleton.js getDefaultPose()
STANDING_POSE = {
    "head": [400, 120], "neck": [400, 155],
    "leftShoulder": [360, 165], "rightShoulder": [440, 165],
    "leftElbow": [330, 220], "rightElbow": [470, 220],
    "leftHand": [310, 270], "rightHand": [490, 270],
    "hip": [400, 280],
    "leftKnee": [375, 360], "rightKnee": [425, 360],
    "leftFoot": [365, 440], "rightFoot": [435, 440],
}

# Keyframe sample indices: frames 0, 3, 7, 11, 14 out of 15 → times 0.0, 0.25, 0.5, 0.75, 1.0
KEYFRAME_INDICES = [0, 3, 7, 11, 14]
KEYFRAME_TIMES = [0.0, 0.25, 0.5, 0.75, 1.0]


def convert_to_keyframes(atom_seq, window_sec):
    """Convert absolute pose sequence to keyframe deltas from standing pose.

    Takes (window_frames, N_JOINTS, 2) array, returns list of keyframe dicts
    in the same format as moves.js hand-crafted moves. Last keyframe is always
    empty pose (return to standing).
    """
    window_frames = atom_seq.shape[0]
    keyframes = []

    for idx, t in zip(KEYFRAME_INDICES, KEYFRAME_TIMES):
        if idx >= window_frames:
            idx = window_frames - 1

        # Last keyframe: empty pose (return to standing)
        if t == 1.0:
            keyframes.append({"time": t, "pose": {}})
            break

        pose = {}
        for j, joint_name in enumerate(JOINT_ORDER):
            abs_x = float(atom_seq[idx, j, 0])
            abs_y = float(atom_seq[idx, j, 1])
            dx = round(abs_x - STANDING_POSE[joint_name][0], 1)
            dy = round(abs_y - STANDING_POSE[joint_name][1], 1)
            if abs(dx) > 0.5 or abs(dy) > 0.5:
                pose[joint_name] = {"x": dx, "y": dy}

        keyframes.append({"time": t, "pose": pose})

    return keyframes
```

**Step 2: Call conversion in save_learned_moves()**

In `save_learned_moves()`, after the `move` dict is built and labels are added (around line 503), before `moves_list.append(move)`, add:

```python
        keyframes = convert_to_keyframes(seq, window_sec)
        move["keyframes"] = keyframes
        move["source"] = "learned"
```

**Step 3: Verify by running on Levels**

Run: `cd "/home/vivekkarmarkar/Python Files/dancer-claude" && source venv/bin/activate && python3 tools/move_mining_pipeline.py --choreo library/choreo_3d290c67.json --song "Levels by Avicii"`

Select an atom. Then check the output:

Run: `grep -A2 '"keyframes"' js/learned_moves.js | head -20`

Expected: `keyframes` array with 5 entries at times 0.0, 0.25, 0.5, 0.75, 1.0. Last entry has empty pose `{}`. Delta values should be small numbers (±5 to ±60px range, not 300-500px absolute).

**Step 4: Commit**

```bash
git add tools/move_mining_pipeline.py
git commit -m "feat: convert learned moves to keyframe deltas from standing pose"
```

---

### Task 2: Add learned move pool to moves.js

Load `LEARNED_MOVES` from `learned_moves.js` and expose a function to query them by energy, mirroring the existing `getMovesByEnergy`.

**Files:**
- Modify: `js/moves.js:1067-1078` (add import and new export function)
- Modify: `js/learned_moves.js:1` (add export)

**Step 1: Make LEARNED_MOVES exportable**

In `js/learned_moves.js`, change the first line of the array declaration from:

```js
const LEARNED_MOVES = [
```

to:

```js
export const LEARNED_MOVES = [
```

**Step 2: Add learned move functions to moves.js**

At the top of `js/moves.js`, add the import:

```js
import { LEARNED_MOVES } from './learned_moves.js';
```

At the bottom of `js/moves.js` (after `getMovesByEnergy`), add:

```js
/**
 * Get learned moves that have keyframes, filtered by energy.
 * @param {'low'|'mid'|'high'} energy
 * @returns {Array} Learned moves matching the given energy level
 */
export function getLearnedMovesByEnergy(energy) {
    return LEARNED_MOVES.filter(m => m.keyframes && m.energy === energy);
}

/**
 * Check if any learned moves with keyframes exist.
 * @returns {boolean}
 */
export function hasLearnedMoves() {
    return LEARNED_MOVES.some(m => m.keyframes);
}
```

**Step 3: Verify in browser console**

Open `index.html` in browser. In the console:

```js
import('./js/moves.js').then(m => { console.log('hasLearned:', m.hasLearnedMoves()); console.log('high:', m.getLearnedMovesByEnergy('high')); });
```

Expected: `hasLearned: true` (if learned_moves.js has entries with keyframes), and the high-energy learned moves listed.

**Step 4: Commit**

```bash
git add js/moves.js js/learned_moves.js
git commit -m "feat: expose learned move pool with energy filtering"
```

---

### Task 3: Add learnedMix to MoveSequencer._selectMove()

Modify the move selection to probabilistically pick from the learned pool.

**Files:**
- Modify: `js/move-sequencer.js:1-2` (imports)
- Modify: `js/move-sequencer.js:9-10` (constructor)
- Modify: `js/move-sequencer.js:369-395` (_selectMove)

**Step 1: Add import**

Change line 1 of `js/move-sequencer.js` from:

```js
import { getAllMoves, getMovesByEnergy } from './moves.js';
```

to:

```js
import { getAllMoves, getMovesByEnergy, getLearnedMovesByEnergy } from './moves.js';
```

**Step 2: Add learnedMix property**

In the constructor, after `this.energy = 0.3;` (line 19), add:

```js
        // Learned move mix: 0 = pure freestyle, 1 = always prefer learned
        this.learnedMix = 0;
```

**Step 3: Modify _selectMove()**

Replace the current `_selectMove` method (lines 369-395) with:

```js
    _selectMove(layer, isPowerMove, typeFilter) {
        let energyLevel;
        if (isPowerMove) {
            energyLevel = 'high';
        } else if (this.energy < 0.33) {
            energyLevel = 'low';
        } else if (this.energy < 0.66) {
            energyLevel = 'mid';
        } else {
            energyLevel = 'high';
        }

        // Decide which pool: learned vs freestyle
        let candidates;
        const learnedCandidates = getLearnedMovesByEnergy(energyLevel);
        if (learnedCandidates.length > 0 && Math.random() < this.learnedMix) {
            candidates = learnedCandidates;
        } else {
            candidates = getMovesByEnergy(energyLevel);
        }

        // Filter by type if specified
        if (typeFilter) {
            const typed = candidates.filter(m => m.type === typeFilter);
            if (typed.length > 0) candidates = typed;
        }

        // Avoid recent repeats
        const recentNames = layer.lastMoves.map(m => m.name);
        let filtered = candidates.filter(m => !recentNames.includes(m.name));
        if (filtered.length === 0) filtered = candidates;

        return filtered[Math.floor(Math.random() * filtered.length)];
    }
```

**Step 4: Verify**

Open `index.html`, play a song in freestyle mode. In console, set:

```js
// Access the app's sequencer (exposed on the DanceApp instance)
// Find the sequencer reference and set learnedMix
```

At `learnedMix = 0`, behavior should be identical to before. This is a non-breaking change.

**Step 5: Commit**

```bash
git add js/move-sequencer.js
git commit -m "feat: add learned move mixing to _selectMove with learnedMix probability"
```

---

### Task 4: Add slider UI to index.html

Add a range slider in the freestyle panel that controls `learnedMix`. Only visible when learned moves with keyframes exist.

**Files:**
- Modify: `index.html:36-41` (freestyle panel)
- Modify: `js/main.js` (wire slider to sequencer)

**Step 1: Add slider HTML**

In `index.html`, inside the `freestyle-panel` div (after the upload label, before the closing `</div>`), add:

```html
        <div id="learned-mix-container" style="display:none;">
          <label class="mix-label">
            Freestyle
            <input type="range" id="learned-mix-slider" min="0" max="100" value="0">
            Learned
          </label>
        </div>
```

**Step 2: Add CSS for the slider**

In the `<style>` section of `index.html`, add:

```css
.mix-label {
    display: flex;
    align-items: center;
    gap: 8px;
    color: #e6edf3;
    font-size: 0.85rem;
    margin-top: 8px;
}

#learned-mix-slider {
    flex: 1;
    accent-color: #e8a735;
}
```

**Step 3: Wire slider in main.js**

In `js/main.js`, add the import for `hasLearnedMoves`:

```js
import { hasLearnedMoves } from './moves.js';
```

In the constructor or `init()` method (wherever the UI is wired up), add:

```js
        // Show learned mix slider if learned moves exist
        if (hasLearnedMoves()) {
            document.getElementById('learned-mix-container').style.display = '';
        }

        document.getElementById('learned-mix-slider').addEventListener('input', (e) => {
            this.sequencer.learnedMix = parseInt(e.target.value) / 100;
        });
```

**Step 4: Verify**

Open `index.html`. If `learned_moves.js` has entries with `keyframes`, the slider should appear in the freestyle panel. Dragging it should change the mix. At 0% = pure freestyle. At 100% = always picks learned moves (when available for the energy tier).

**Step 5: Commit**

```bash
git add index.html js/main.js
git commit -m "feat: add freestyle/learned mix slider UI"
```

---

### Task 5: End-to-end test

Run the full pipeline on Levels, then verify the slider works in the browser.

**Step 1: Clear learned_moves.js and run fresh**

Delete `js/learned_moves.js` if it exists, then run:

```bash
cd "/home/vivekkarmarkar/Python Files/dancer-claude"
source venv/bin/activate
python3 tools/move_mining_pipeline.py --choreo library/choreo_3d290c67.json --song "Levels by Avicii"
```

Select at least one atom.

**Step 2: Verify learned_moves.js has keyframes**

Run: `grep -c '"keyframes"' js/learned_moves.js`

Expected: At least 1.

Run: `grep '"time": 1.0' js/learned_moves.js`

Expected: Last keyframe at time 1.0 with empty pose.

**Step 3: Test in browser**

1. Open `index.html` in browser
2. Slider should be visible in freestyle panel
3. Upload a song, play in freestyle mode
4. At slider=0: dancer does only hand-crafted moves (current behavior)
5. Drag slider to 100%: dancer should occasionally do the learned move(s)
6. The learned moves should blend smoothly with the groove/amplitude system

**Step 4: Commit**

```bash
git add js/learned_moves.js
git commit -m "feat: auto-labeled learned moves with keyframe deltas"
```
