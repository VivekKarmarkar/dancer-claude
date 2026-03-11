# Freestyle–Learned Move Mixing Design

## Problem

Learned moves have auto-labels (energy, durationBeats, type) but can't join the freestyle move pool. They're stored as absolute pixel positions, while the freestyle engine works with keyframe deltas from standing pose. We need a bridge between the two formats and a UI control for mixing them.

## Approach

### Conversion (Python side)

In `move_mining_pipeline.py`, after auto-labeling and before saving, convert each learned move to the freestyle keyframe format:

1. Take the 15-frame absolute pose sequence
2. Subtract the standing pose from every frame to get deltas
3. Downsample to 5 keyframes at normalized times 0.0, 0.25, 0.5, 0.75, 1.0
4. Last keyframe is always empty pose `{}` (return to standing, same as hand-crafted moves)
5. Write both `poses` (original absolute data, preserved) and `keyframes` (converted deltas) to `learned_moves.js`

Output format:
```js
{
  "name": "shuffle",
  "energy": "high",
  "durationBeats": 4,
  "type": "full-body",
  "source": "learned",
  "poses": [...],       // original absolute positions (preserved)
  "keyframes": [        // converted deltas for freestyle engine
    { "time": 0.0, "pose": { "head": {"x": -8.3, "y": -59.4}, ... } },
    { "time": 0.25, "pose": { ... } },
    { "time": 0.5, "pose": { ... } },
    { "time": 0.75, "pose": { ... } },
    { "time": 1.0, "pose": {} }
  ]
}
```

### Move selection (JS side)

Learned moves with `keyframes` are loaded as a separate pool from hand-crafted moves. The move sequencer gains a `learnedMix` property (0.0–1.0) controlled by a UI slider.

In `_selectMove()`:
1. Energy bin into 'low'/'mid'/'high' (unchanged)
2. Check if learned moves exist for this energy tier
3. If yes AND `Math.random() < learnedMix` → pick from learned pool
4. Else → pick from freestyle pool (current behavior)
5. Exclude recent repeats, random pick within chosen pool (unchanged)

Since learned moves use the same keyframe delta format, everything downstream works unchanged: `_getMovePoseAtProgress`, `_applyDelta`, groove, amplitude scaling, variation, blending.

### Slider UI

A range input (0.0–1.0) that only appears when learned moves with `keyframes` exist. Default 0.0 (pure freestyle). Wired to `MoveSequencer.learnedMix`.

## Files modified

- `tools/move_mining_pipeline.py` — add keyframe conversion (absolute→delta, downsample to 5) after auto-labeling, write both `poses` and `keyframes`
- `js/learned_moves.js` — auto-generated, gains `keyframes` array alongside existing `poses`
- `js/moves.js` — add function to load learned moves as separate pool (e.g. `getLearnedMovesByEnergy`)
- `js/move-sequencer.js` — add `learnedMix` property, modify `_selectMove()` to use slider probability
- `index.html` — add slider UI, conditionally visible, wire to sequencer

## What this does NOT modify

- `skeleton.js`, `audio-engine.js`, `dance.py`, choreography mode, PosePlayer
- Zero impact on existing freestyle or choreography functionality
