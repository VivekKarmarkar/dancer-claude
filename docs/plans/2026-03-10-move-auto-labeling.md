# Move Auto-Labeling Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Auto-label learned moves with `energy`, `durationBeats`, and `type` so the freestyle engine can select them.

**Architecture:** Reimplement the browser's `AudioEngine.getAnalysis()` in Python (numpy), analyze the MP3 at temporal windows where each atom's activation spikes, bin the resulting numbers into the same categorical labels the freestyle engine uses.

**Tech Stack:** librosa (MP3 loading), numpy (FFT, dB-to-byte conversion, band splitting, energy, beat detection)

---

### Task 1: Add `--mp3` flag and librosa import

**Files:**
- Modify: `tools/move_mining_pipeline.py:11-15` (imports) and `tools/move_mining_pipeline.py:320-326` (argparse)

**Step 1: Add librosa to imports**

At the top of `move_mining_pipeline.py`, after the existing imports, add:

```python
import librosa
```

**Step 2: Add `--mp3` CLI argument**

In `main()`, after the `--alpha` argument (line 325), add:

```python
parser.add_argument("--mp3", default=None,
                    help="Path to MP3 file (default: same path as --choreo with .mp3 extension)")
```

And after `args = parser.parse_args()`, resolve the MP3 path:

```python
mp3_path = args.mp3 if args.mp3 else str(Path(args.choreo).with_suffix(".mp3"))
if not Path(mp3_path).exists():
    print(f"  WARNING: MP3 not found at {mp3_path} — skipping auto-labeling")
    mp3_path = None
```

**Step 3: Verify librosa is installed**

Run: `cd "/home/vivekkarmarkar/Python Files/dancer-claude" && source venv/bin/activate && python3 -c "import librosa; print(librosa.__version__)"`

If not installed: `pip install librosa`

**Step 4: Commit**

```bash
git add tools/move_mining_pipeline.py
git commit -m "feat: add --mp3 flag and librosa import for auto-labeling"
```

---

### Task 2: Implement `browser_fft_analysis()` — reimplement the browser's audio analysis chain

This is the core function. It takes a chunk of audio samples and produces the exact same numbers the browser's `AudioEngine.getAnalysis()` produces. The browser does: FFT → getByteFrequencyData (dB-to-byte conversion) → band splitting → weighted energy → beat detection. We reimplement each step.

**Files:**
- Modify: `tools/move_mining_pipeline.py` (add function after imports, before dictionary learning section)

**Step 1: Write the function**

Add this function to `move_mining_pipeline.py`:

```python
# ── Audio analysis (reimplements browser's AudioEngine.getAnalysis()) ─

def browser_fft_analysis(audio_mono, sr, hop_length=2048):
    """Reimplement the browser's AudioEngine.getAnalysis() in Python.

    The browser does:
    1. FFT with fftSize=2048 → 1024 frequency bins
    2. getByteFrequencyData: magnitude → dB → clamp [-100, -30] → map to 0-255
    3. Band splitting: bass (bins 0-20), mid (20-100), treble (100-512)
    4. Normalize each band: sum / (numBins * 255)
    5. Energy = 0.45*bass + 0.35*mid + 0.20*treble
    6. Beat detection: bass > 1.4 * rolling_avg(last 30), 0.2s cooldown

    Returns list of dicts: [{energy, bass, mid, treble, isBeat, time}, ...]
    One entry per hop (non-overlapping windows of hop_length samples).
    """
    fft_size = 2048
    n_bins = fft_size // 2  # 1024 bins, matching browser's frequencyBinCount

    # Browser uses smoothingTimeConstant = 0.8
    smoothing = 0.8

    results = []
    prev_byte_data = np.zeros(n_bins)
    energy_history = []
    last_beat_time = -1.0

    n_hops = len(audio_mono) // hop_length

    for i in range(n_hops):
        start = i * hop_length
        chunk = audio_mono[start : start + fft_size]
        if len(chunk) < fft_size:
            chunk = np.pad(chunk, (0, fft_size - len(chunk)))

        # 1. FFT — browser applies Blackman window by default
        windowed = chunk * np.blackman(fft_size)
        fft_result = np.fft.rfft(windowed)
        magnitudes = np.abs(fft_result[:n_bins])

        # 2. getByteFrequencyData conversion:
        #    magnitude → dB: 20 * log10(magnitude / fft_size)
        #    (the fft_size divisor is what Web Audio uses for normalization)
        #    Then clamp to [minDecibels, maxDecibels] = [-100, -30]
        #    Then map linearly to 0-255
        with np.errstate(divide='ignore'):
            db = 20.0 * np.log10(magnitudes / fft_size)
        db = np.nan_to_num(db, neginf=-100.0)

        min_db = -100.0
        max_db = -30.0
        byte_data = 255.0 * (db - min_db) / (max_db - min_db)
        byte_data = np.clip(byte_data, 0, 255)

        # Apply smoothing (browser's smoothingTimeConstant)
        byte_data = smoothing * prev_byte_data + (1 - smoothing) * byte_data
        prev_byte_data = byte_data.copy()

        # 3-4. Band splitting and normalization (exact browser code)
        bass = np.sum(byte_data[0:21]) / (21 * 255)
        mid = np.sum(byte_data[20:101]) / (81 * 255)
        treble = np.sum(byte_data[100:513]) / (413 * 255)

        # 5. Energy — bass-weighted
        energy = bass * 0.45 + mid * 0.35 + treble * 0.20

        # 6. Beat detection
        energy_history.append(bass)
        if len(energy_history) > 30:
            energy_history.pop(0)

        avg_energy = sum(energy_history) / len(energy_history) if energy_history else 0
        current_time = (start + fft_size // 2) / sr

        is_beat = (
            bass > avg_energy * 1.4
            and (current_time - last_beat_time) > 0.2
            and len(energy_history) >= 5
        )
        if is_beat:
            last_beat_time = current_time

        results.append({
            'energy': float(energy),
            'bass': float(bass),
            'mid': float(mid),
            'treble': float(treble),
            'isBeat': is_beat,
            'time': current_time,
        })

    return results
```

**Step 2: Write a quick sanity test**

Create `tools/test_audio_analysis.py`:

```python
#!/usr/bin/env python3
"""Sanity test: run browser_fft_analysis on a known MP3 and print stats."""
import sys
sys.path.insert(0, "tools")
import numpy as np
import librosa
from move_mining_pipeline import browser_fft_analysis

mp3_path = "library/choreo_3d290c67.mp3"  # Levels by Avicii
audio, sr = librosa.load(mp3_path, sr=44100, mono=True)
print(f"Loaded: {mp3_path} ({len(audio)/sr:.1f}s, sr={sr})")

results = browser_fft_analysis(audio, sr)
energies = [r['energy'] for r in results]
beats = [r for r in results if r['isBeat']]

print(f"Analysis frames: {len(results)}")
print(f"Energy range: {min(energies):.3f} – {max(energies):.3f}")
print(f"Energy mean: {np.mean(energies):.3f}")
print(f"Beats detected: {len(beats)}")
if len(beats) >= 2:
    intervals = [beats[i+1]['time'] - beats[i]['time'] for i in range(len(beats)-1)]
    avg_interval = np.mean(intervals)
    bpm = 60 / avg_interval if avg_interval > 0 else 0
    print(f"Estimated BPM: {bpm:.0f}")

# Check energy distribution matches freestyle thresholds
low = sum(1 for e in energies if e < 0.33)
mid = sum(1 for e in energies if 0.33 <= e < 0.66)
high = sum(1 for e in energies if e >= 0.66)
total = len(energies)
print(f"Energy tiers: low={low/total:.0%}, mid={mid/total:.0%}, high={high/total:.0%}")
```

**Step 3: Run the sanity test**

Run: `cd "/home/vivekkarmarkar/Python Files/dancer-claude" && source venv/bin/activate && python3 tools/test_audio_analysis.py`

Expected: Runs without errors. Energy values in 0.0–1.0 range. Beats detected > 0. BPM estimate roughly 126 (Levels is ~126 BPM). Energy not all in one tier.

**Step 4: Commit**

```bash
git add tools/move_mining_pipeline.py tools/test_audio_analysis.py
git commit -m "feat: reimplement browser audio analysis chain in Python"
```

---

### Task 3: Implement `find_spike_windows()` — activation spike detection

For a given atom k, find the temporal windows where `|activations[:, k]|` exceeds the 80th percentile. These are the windows where the atom dominates the choreography. Each window index maps to a time range via `window_index × hop_size / fps`.

**Files:**
- Modify: `tools/move_mining_pipeline.py` (add function after `browser_fft_analysis`)

**Step 1: Write the function**

```python
def find_spike_windows(activations, atom_id, window_sec, percentile=80):
    """Find temporal windows where atom k's activation exceeds the percentile threshold.

    Returns list of (start_sec, end_sec) tuples — time ranges in the song
    where this atom dominates.
    """
    act = np.abs(activations[:, atom_id])
    threshold = np.percentile(act, percentile)

    hop_sec = window_sec / 2  # 50% overlap, same as build_patches
    spike_windows = []
    for i, val in enumerate(act):
        if val >= threshold:
            start = i * hop_sec
            end = start + window_sec
            spike_windows.append((start, end))

    return spike_windows
```

**Step 2: Commit**

```bash
git add tools/move_mining_pipeline.py
git commit -m "feat: add spike window detection from activation magnitudes"
```

---

### Task 4: Implement `compute_move_labels()` — label assignment

This ties everything together: for a given atom, find its spike windows, analyze the audio at those windows, aggregate the numbers, and bin them into the labels the freestyle engine uses.

**Files:**
- Modify: `tools/move_mining_pipeline.py` (add function after `find_spike_windows`)

**Step 1: Write the function**

```python
def compute_move_labels(activations, atom_id, audio_analysis, dictionary,
                        window_sec):
    """Compute energy, durationBeats, and type labels for a single atom.

    1. Find spike windows (top 20% of |activation|)
    2. Gather audio analysis frames that fall within spike windows
    3. energy: median energy → bin into 'low'/'mid'/'high' (thresholds 0.33, 0.66)
    4. durationBeats: BPM from beat intervals × atom duration in seconds
    5. type: from joint energy distribution — upper body dominant → 'arms', else 'full-body'
    """
    # 1. Spike windows
    spikes = find_spike_windows(activations, atom_id, window_sec)

    if not spikes:
        # No clear spikes — use defaults
        return {'energy': 'mid', 'durationBeats': 2, 'type': 'full-body'}

    # 2. Gather audio frames within spike windows
    spike_energies = []
    spike_beats = []
    for frame in audio_analysis:
        t = frame['time']
        for (start, end) in spikes:
            if start <= t <= end:
                spike_energies.append(frame['energy'])
                if frame['isBeat']:
                    spike_beats.append(frame['time'])
                break

    # 3. Energy label
    if spike_energies:
        median_energy = float(np.median(spike_energies))
    else:
        median_energy = 0.5  # fallback

    if median_energy < 0.33:
        energy_label = 'low'
    elif median_energy < 0.66:
        energy_label = 'mid'
    else:
        energy_label = 'high'

    # 4. Duration in beats
    # Estimate BPM from all detected beats in the song
    all_beats = [f['time'] for f in audio_analysis if f['isBeat']]
    if len(all_beats) >= 2:
        intervals = [all_beats[i+1] - all_beats[i] for i in range(len(all_beats)-1)]
        avg_interval = np.mean(intervals)
        bpm = 60.0 / avg_interval if avg_interval > 0 else 120.0
    else:
        bpm = 120.0  # fallback

    duration_beats = round(bpm * window_sec / 60.0)
    duration_beats = max(1, min(8, duration_beats))  # clamp to reasonable range

    # 5. Type from joint energy distribution
    window_frames = int(window_sec * FPS)
    atom_vec = dictionary[atom_id].reshape(window_frames, N_JOINTS, 2)
    joint_energy = np.zeros(N_JOINTS)
    for j in range(N_JOINTS):
        joint_energy[j] = np.linalg.norm(atom_vec[:, j, :])

    # Upper body joints: head(0), neck(1), leftShoulder(2), rightShoulder(3),
    #   leftElbow(4), rightElbow(5), leftHand(6), rightHand(7)
    # Lower body / core: hip(8), leftKnee(9), rightKnee(10), leftFoot(11), rightFoot(12)
    upper_energy = joint_energy[:8].sum()
    total_energy = joint_energy.sum()

    if total_energy > 0 and (upper_energy / total_energy) > 0.7:
        type_label = 'arms'
    else:
        type_label = 'full-body'

    return {
        'energy': energy_label,
        'durationBeats': duration_beats,
        'type': type_label,
    }
```

**Step 2: Commit**

```bash
git add tools/move_mining_pipeline.py
git commit -m "feat: add compute_move_labels — energy, durationBeats, type from audio + pose"
```

---

### Task 5: Integrate auto-labeling into the pipeline

Wire up the labeling functions into `main()` — between human review and save. Add labels to each move entry before writing to `learned_moves.js`.

**Files:**
- Modify: `tools/move_mining_pipeline.py:317-370` (main function)
- Modify: `tools/move_mining_pipeline.py:268-314` (save_learned_moves — accept labels)

**Step 1: Add audio loading and analysis in main()**

In `main()`, after dictionary learning (line 339) and before "Preparing Atoms", add:

```python
    # Audio analysis for labeling
    audio_analysis = None
    if mp3_path:
        print(f"\n── Audio Analysis ──")
        audio_mono, sr = librosa.load(mp3_path, sr=44100, mono=True)
        print(f"  Loaded: {mp3_path} ({len(audio_mono)/sr:.1f}s)")
        audio_analysis = browser_fft_analysis(audio_mono, sr)
        print(f"  Analysis frames: {len(audio_analysis)}")
```

**Step 2: Add labeling after human review, before save**

In `main()`, after `kept = human_review(...)` and the "Results" print, before the `if kept:` block, add label computation:

```python
    # Auto-label kept moves
    labels = {}
    if kept and audio_analysis is not None:
        print(f"\n── Auto-Labeling ──")
        for item in kept:
            atom_id = item['atom_id']
            move_labels = compute_move_labels(
                activations, atom_id, audio_analysis, dictionary, args.window
            )
            labels[atom_id] = move_labels
            print(f"  Atom {atom_id}: energy={move_labels['energy']}, "
                  f"durationBeats={move_labels['durationBeats']}, "
                  f"type={move_labels['type']}")
```

**Step 3: Pass labels to save_learned_moves()**

Modify the `save_learned_moves` call to pass labels:

```python
        n_saved = save_learned_moves(kept, atoms_data, args.song, args.choreo,
                                     args.window, labels)
```

**Step 4: Update save_learned_moves() to accept and write labels**

Change the function signature:

```python
def save_learned_moves(kept, atoms_data, song_name, choreo_path, window_sec,
                       labels=None):
```

And in the move dict construction (after `"fps": FPS,`), add:

```python
        if labels and atom_id in labels:
            move["energy"] = labels[atom_id]["energy"]
            move["durationBeats"] = labels[atom_id]["durationBeats"]
            move["type"] = labels[atom_id]["type"]
```

**Step 5: Commit**

```bash
git add tools/move_mining_pipeline.py
git commit -m "feat: integrate auto-labeling into move mining pipeline"
```

---

### Task 6: End-to-end test on Levels by Avicii

Run the full pipeline on the song we already have a learned move from, and verify labels appear in the output.

**Step 1: Run the pipeline**

Run: `cd "/home/vivekkarmarkar/Python Files/dancer-claude" && source venv/bin/activate && python3 tools/move_mining_pipeline.py --choreo library/choreo_3d290c67.json --song "Levels by Avicii"`

Expected: Opens GTK review dialog. Select at least one atom. Console shows auto-labeling output with energy/durationBeats/type values.

**Step 2: Verify learned_moves.js has labels**

Run: `head -20 js/learned_moves.js`

Expected: Move entries now include `"energy": "..."`, `"durationBeats": N`, `"type": "..."` fields.

**Step 3: Verify label values are reasonable**

- Levels by Avicii is ~126 BPM, high-energy EDM → expect `energy` of `'mid'` or `'high'`
- At 126 BPM, 1-second window ≈ 2 beats → expect `durationBeats` of 2
- Most moves should be `'full-body'` unless the atom is purely arm motion

**Step 4: Commit**

```bash
git add js/learned_moves.js
git commit -m "feat: auto-labeled learned moves with energy, durationBeats, type"
```
