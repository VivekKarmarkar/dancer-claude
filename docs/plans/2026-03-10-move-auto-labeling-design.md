# Move Auto-Labeling Design

## Problem

Learned moves from dictionary learning are raw pose sequences with no metadata. The freestyle engine needs three labels to know when to play each move: `energy`, `durationBeats`, and `type`. Without these, learned moves can't join the freestyle move pool.

## Approach

The dictionary learning activations tell us WHEN each atom fires in the choreography. We analyze the audio at those moments using the same signal processing the browser does in real-time. The numbers we get map directly to the labels the freestyle engine needs.

### Pipeline

All of this happens inside `move_mining_pipeline.py`, after human review, before saving. For each kept atom:

1. **Spike detection** — take `|activations[:, k]|` for atom k. Windows above the 80th percentile are the spike windows. Each window index maps to a time range in the song via `window_index × hop_size / fps`.

2. **Audio analysis at spike windows** — load the MP3 with librosa. Reimplement the browser's `AudioEngine.getAnalysis()` in Python: same FFT size (2048), same dB-to-byte conversion, same band splits (bass: bins 0-20, mid: 20-100, treble: 100-512), same weights (0.45/0.35/0.20), same beat detection logic (bass spike > 1.4× rolling average, 0.2s cooldown). This produces energy values on the same scale as the browser, so the browser's thresholds work directly.

3. **Label assignment**:
   - `energy` — bin the median energy across spike windows into `'low'`/`'mid'`/`'high'` using the browser's thresholds (0.33, 0.66).
   - `durationBeats` — BPM from whole-song beat detection × atom window duration in seconds.
   - `type` — from the atom's joint energy distribution (already computed in dictionary learning). Upper body joints dominant → `'arms'`, distributed → `'full-body'`.

4. **Attach metadata** — add `energy`, `durationBeats`, `type` to the learned move entry in `learned_moves.js`.

### Output format

`learned_moves.js` entries gain three new fields. Pose data stays as absolute positions — conversion to deltas (for actual freestyle engine integration) is a separate future step.

```js
{
  "name": "shuffle_step",
  "source_song": "Levels by Avicii",
  "source_file": "choreo_3d290c67.json",
  "atom_id": 0,
  "window_sec": 1.0,
  "fps": 15,
  "energy": "mid",
  "durationBeats": 2,
  "type": "full-body",
  "poses": [...]
}
```

### Dependencies

- librosa — for loading MP3 files
- numpy — for reimplementing the browser's audio analysis chain (FFT, dB conversion, band splitting, energy, beat detection)
- No other new dependencies

### What this does NOT include

- Converting absolute positions to deltas from standing pose
- Integrating learned moves into the freestyle engine's move pool
- Modifying any JS files or the engine itself

These are separate future steps. This design only adds metadata labels to learned moves.

## File modified

`tools/move_mining_pipeline.py` — add audio analysis and labeling after human review, before saving.
