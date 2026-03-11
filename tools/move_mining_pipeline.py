#!/usr/bin/env python3
"""Move Mining Pipeline — dictionary learning → human review → learned moves.

Dictionary learning extracts atoms from a choreography. A GUI dialog lets you
pick which ones are real dance moves. Kept moves get GIFs + JS data.

Usage:
    python3 tools/move_mining_pipeline.py --choreo library/choreo_3d290c67.json --song "Levels"
"""

import argparse
import json
import io
import tempfile
from pathlib import Path

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.animation import FuncAnimation
from scipy.ndimage import gaussian_filter1d
from sklearn.decomposition import MiniBatchDictionaryLearning
import librosa

import gi
gi.require_version("Gtk", "3.0")
from gi.repository import Gtk, GdkPixbuf, GLib

from dictionary_learning_choreography import (
    JOINT_ORDER, N_JOINTS, BONES, BONE_INDICES, FPS,
    load_choreo, build_patches, center_patches,
)

DARK_BG = "#0d1117"
REPO_ROOT = Path(__file__).resolve().parent.parent
LEARNED_MOVES_JS_PATH = REPO_ROOT / "js" / "learned_moves.js"
LEARNED_MOVES_GIF_DIR = REPO_ROOT / "tools" / "analysis_output" / "learned_moves"


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


# ── Dictionary learning ────────────────────────────────────────────

def run_dictionary_learning(X_centered, n_atoms, alpha):
    """Fit dictionary learning, return dictionary and activations."""
    dl = MiniBatchDictionaryLearning(
        n_components=n_atoms, alpha=alpha, random_state=42, max_iter=500,
    )
    activations = dl.fit_transform(X_centered)
    dictionary = dl.components_

    recon = activations @ dictionary
    mse = np.mean((X_centered - recon) ** 2)
    sparsity = np.mean(np.count_nonzero(activations, axis=1))
    print(f"  Recon MSE: {mse:.2f}, Sparsity: {sparsity:.1f}/{n_atoms}")

    return dictionary, activations


# ── Prepare atoms ──────────────────────────────────────────────────

def prepare_atoms(dictionary, activations, col_means, window_sec):
    """Prepare smoothed atom sequences. Returns list of (n_atoms) numpy arrays."""
    n_atoms = dictionary.shape[0]
    window_frames = int(window_sec * FPS)
    median_act = np.median(np.abs(activations), axis=0)

    atoms = []
    for idx in range(n_atoms):
        atom_flat = dictionary[idx] * median_act[idx] + col_means
        atom_seq = atom_flat.reshape(window_frames, N_JOINTS, 2)
        atom_seq = gaussian_filter1d(atom_seq, sigma=1.5, axis=0)
        atoms.append(atom_seq)

    return atoms


# ── Render atom GIF to temp file ───────────────────────────────────

def render_atom_gif(atom_seq, atom_id, tmp_dir):
    """Render a single atom as an animated GIF. Returns path."""
    window_frames = atom_seq.shape[0]
    gif_path = Path(tmp_dir) / f"atom_{atom_id}.gif"

    fig, ax = plt.subplots(figsize=(3, 3.5))
    fig.patch.set_facecolor(DARK_BG)
    ax.set_facecolor(DARK_BG)

    x_min, x_max = atom_seq[:, :, 0].min() - 25, atom_seq[:, :, 0].max() + 25
    y_min, y_max = atom_seq[:, :, 1].min() - 25, atom_seq[:, :, 1].max() + 25
    ax.set_xlim(x_min, x_max)
    ax.set_ylim(y_max, y_min)
    ax.set_aspect("equal")
    ax.axis("off")

    bone_lines = []
    for _ in BONE_INDICES:
        line, = ax.plot([], [], color="#e8a735", linewidth=2.0)
        bone_lines.append(line)
    scatter = ax.scatter([], [], color="#e8a735", s=18, zorder=5)
    fig.tight_layout()

    def update(frame_idx):
        joints = atom_seq[frame_idx]
        for bi, (a, b) in enumerate(BONE_INDICES):
            bone_lines[bi].set_data([joints[a, 0], joints[b, 0]], [joints[a, 1], joints[b, 1]])
        scatter.set_offsets(joints)
        return []

    anim = FuncAnimation(fig, update, frames=window_frames, interval=1000 / FPS, blit=False)
    anim.save(str(gif_path), writer="pillow", fps=FPS, savefig_kwargs={"facecolor": DARK_BG})
    plt.close(fig)
    return gif_path


# ── GTK Review Dialog ──────────────────────────────────────────────

class AtomReviewDialog(Gtk.Window):
    """Dialog showing atom GIFs with checkboxes for human review."""

    def __init__(self, gif_paths, song_name):
        super().__init__(title=f"Move Mining — {song_name}")
        self.set_default_size(900, 700)
        self.set_border_width(15)
        self.selected = []
        self.done = False

        # Dark theme
        css = Gtk.CssProvider()
        css.load_from_data(b"""
            window { background-color: #0d1117; }
            label { color: #e6edf3; }
            checkbutton { color: #e6edf3; }
            button { background: #238636; color: white; border-radius: 6px; padding: 8px 20px; }
            button:hover { background: #2ea043; }
            entry { background: #161b22; color: #e6edf3; border: 1px solid #30363d; border-radius: 4px; padding: 4px; }
        """)
        Gtk.StyleContext.add_provider_for_screen(
            self.get_screen(), css, Gtk.STYLE_PROVIDER_PRIORITY_APPLICATION
        )

        vbox = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=10)
        self.add(vbox)

        # Header
        header = Gtk.Label()
        header.set_markup(f'<span size="large" weight="bold" color="#e6edf3">Select moves to keep from: {song_name}</span>')
        vbox.pack_start(header, False, False, 5)

        # Scrollable grid of atoms
        scroll = Gtk.ScrolledWindow()
        scroll.set_policy(Gtk.PolicyType.NEVER, Gtk.PolicyType.AUTOMATIC)
        vbox.pack_start(scroll, True, True, 0)

        grid = Gtk.Grid()
        grid.set_column_spacing(15)
        grid.set_row_spacing(10)
        grid.set_column_homogeneous(True)
        scroll.add(grid)

        self.checkboxes = []
        self.name_entries = []
        n_cols = 4

        for i, gif_path in enumerate(gif_paths):
            row, col = divmod(i, n_cols)
            cell = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=5)

            # Animated GIF
            pixbuf_anim = GdkPixbuf.PixbufAnimation.new_from_file(str(gif_path))
            image = Gtk.Image()
            image.set_from_animation(pixbuf_anim)
            cell.pack_start(image, False, False, 0)

            # Checkbox
            check = Gtk.CheckButton(label=f"Atom {i}")
            self.checkboxes.append(check)
            cell.pack_start(check, False, False, 0)

            # Name entry (shown when checked)
            entry = Gtk.Entry()
            entry.set_placeholder_text("move_name")
            entry.set_text(f"atom_{i}_move")
            self.name_entries.append(entry)
            cell.pack_start(entry, False, False, 0)

            grid.attach(cell, col, row, 1, 1)

        # Submit button
        btn_box = Gtk.Box(spacing=10)
        btn_box.set_halign(Gtk.Align.CENTER)

        submit = Gtk.Button(label="Submit")
        submit.connect("clicked", self.on_submit)
        btn_box.pack_start(submit, False, False, 0)

        skip = Gtk.Button(label="Skip All")
        skip.connect("clicked", self.on_skip)
        btn_box.pack_start(skip, False, False, 0)

        vbox.pack_start(btn_box, False, False, 10)

        self.connect("destroy", Gtk.main_quit)

    def on_submit(self, _):
        self.selected = []
        for i, check in enumerate(self.checkboxes):
            if check.get_active():
                name = self.name_entries[i].get_text().strip()
                if not name:
                    name = f"atom_{i}_move"
                self.selected.append({"atom_id": i, "name": name})
        self.done = True
        self.close()

    def on_skip(self, _):
        self.selected = []
        self.done = True
        self.close()


def human_review(gif_paths, song_name):
    """Open GTK dialog for human review. Returns list of {atom_id, name}."""
    dialog = AtomReviewDialog(gif_paths, song_name)
    dialog.show_all()
    Gtk.main()
    return dialog.selected


# ── Save GIF for a learned move ────────────────────────────────────

def save_move_gif(atom_seq, move_name):
    """Save an animated GIF for a single learned move."""
    LEARNED_MOVES_GIF_DIR.mkdir(parents=True, exist_ok=True)
    gif_path = LEARNED_MOVES_GIF_DIR / f"{move_name}.gif"

    window_frames = atom_seq.shape[0]
    fig, ax = plt.subplots(figsize=(4, 5))
    fig.patch.set_facecolor(DARK_BG)
    ax.set_facecolor(DARK_BG)

    x_min, x_max = atom_seq[:, :, 0].min() - 25, atom_seq[:, :, 0].max() + 25
    y_min, y_max = atom_seq[:, :, 1].min() - 25, atom_seq[:, :, 1].max() + 25
    ax.set_xlim(x_min, x_max)
    ax.set_ylim(y_max, y_min)
    ax.set_aspect("equal")
    ax.axis("off")
    ax.set_title(move_name.replace("_", " ").title(), color="white", fontsize=13)

    bone_lines = []
    for _ in BONE_INDICES:
        line, = ax.plot([], [], color="#e8a735", linewidth=2.0)
        bone_lines.append(line)
    scatter = ax.scatter([], [], color="#e8a735", s=20, zorder=5)
    fig.tight_layout()

    def update(frame_idx):
        joints = atom_seq[frame_idx]
        for bi, (a, b) in enumerate(BONE_INDICES):
            bone_lines[bi].set_data([joints[a, 0], joints[b, 0]], [joints[a, 1], joints[b, 1]])
        scatter.set_offsets(joints)
        return []

    anim = FuncAnimation(fig, update, frames=window_frames, interval=1000 / FPS, blit=False)
    anim.save(str(gif_path), writer="pillow", fps=FPS, savefig_kwargs={"facecolor": DARK_BG})
    plt.close(fig)
    return gif_path


# ── Save learned moves ─────────────────────────────────────────────

def save_learned_moves(kept, atoms_data, song_name, choreo_path, window_sec,
                       labels=None):
    """Append kept moves to js/learned_moves.js and save GIFs."""
    moves_list = []
    if LEARNED_MOVES_JS_PATH.exists():
        raw = LEARNED_MOVES_JS_PATH.read_text()
        json_start = raw.index("[")
        json_end = raw.rindex("]") + 1
        moves_list = json.loads(raw[json_start:json_end])

    window_frames = int(window_sec * FPS)

    for item in kept:
        atom_id = item["atom_id"]
        move_name = item["name"]
        seq = atoms_data[atom_id]

        gif_path = save_move_gif(seq, move_name)
        print(f"  GIF: {gif_path}")

        poses = []
        for frame_idx in range(window_frames):
            t = round(frame_idx / FPS, 4)
            joints = {}
            for j, name in enumerate(JOINT_ORDER):
                joints[name] = [round(float(seq[frame_idx, j, 0]), 1),
                                round(float(seq[frame_idx, j, 1]), 1)]
            poses.append({"t": t, "joints": joints})

        move = {
            "name": move_name,
            "source_song": song_name,
            "source_file": Path(choreo_path).name,
            "atom_id": atom_id,
            "window_sec": window_sec,
            "fps": FPS,
            "poses": poses,
        }
        if labels and atom_id in labels:
            move["energy"] = labels[atom_id]["energy"]
            move["durationBeats"] = labels[atom_id]["durationBeats"]
            move["type"] = labels[atom_id]["type"]
        keyframes = convert_to_keyframes(seq, window_sec)
        move["keyframes"] = keyframes
        move["source"] = "learned"
        moves_list.append(move)

    js_content = "// Learned moves — mined from choreographies via dictionary learning + human review.\n"
    js_content += "// Auto-generated by tools/move_mining_pipeline.py — do not edit by hand.\n\n"
    js_content += "const LEARNED_MOVES = "
    js_content += json.dumps(moves_list, indent=2)
    js_content += ";\n"

    LEARNED_MOVES_JS_PATH.write_text(js_content)
    return len(kept)


# ── Main ───────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Move Mining Pipeline")
    parser.add_argument("--choreo", required=True, help="Path to choreography JSON")
    parser.add_argument("--song", required=True, help="Song name (for context)")
    parser.add_argument("--n-atoms", type=int, default=8)
    parser.add_argument("--window", type=float, default=1.0)
    parser.add_argument("--alpha", type=float, default=1.0)
    parser.add_argument("--mp3", default=None,
                        help="Path to MP3 file (default: same path as --choreo with .mp3 extension)")
    args = parser.parse_args()

    mp3_path = args.mp3 if args.mp3 else str(Path(args.choreo).with_suffix(".mp3"))
    if not Path(mp3_path).exists():
        print(f"  WARNING: MP3 not found at {mp3_path} — skipping auto-labeling")
        mp3_path = None

    print(f"\n{'═' * 50}")
    print(f"Move Mining Pipeline")
    print(f"{'═' * 50}")
    print(f"\n  Song: {args.song}")
    print(f"  File: {args.choreo}")

    # Step 1: Dictionary learning
    print(f"\n── Dictionary Learning ──")
    matrix, meta = load_choreo(args.choreo)
    X = build_patches(matrix, args.window)
    X_centered, col_means = center_patches(X)
    dictionary, activations = run_dictionary_learning(X_centered, args.n_atoms, args.alpha)

    # Audio analysis for labeling
    audio_analysis = None
    if mp3_path:
        print(f"\n── Audio Analysis ──")
        audio_mono, sr = librosa.load(mp3_path, sr=44100, mono=True)
        print(f"  Loaded: {mp3_path} ({len(audio_mono)/sr:.1f}s)")
        audio_analysis = browser_fft_analysis(audio_mono, sr)
        print(f"  Analysis frames: {len(audio_analysis)}")

    # Step 2: Prepare atoms
    print(f"\n── Preparing Atoms ──")
    atoms_data = prepare_atoms(dictionary, activations, col_means, args.window)
    print(f"  Prepared {len(atoms_data)} atoms")

    # Step 3: Render GIFs to temp dir for review
    print(f"\n── Rendering GIFs ──")
    tmp_dir = tempfile.mkdtemp(prefix="move_mining_")
    gif_paths = []
    for i, atom_seq in enumerate(atoms_data):
        gif_path = render_atom_gif(atom_seq, i, tmp_dir)
        gif_paths.append(gif_path)
    print(f"  Rendered {len(gif_paths)} GIFs")

    # Step 4: Human review
    print(f"\n── Opening review dialog... ──")
    kept = human_review(gif_paths, args.song)

    print(f"\n── Results ──")
    print(f"  Selected: {len(kept)} moves")

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

    if kept:
        for item in kept:
            print(f"  Atom {item['atom_id']}: \"{item['name']}\"")
        n_saved = save_learned_moves(kept, atoms_data, args.song, args.choreo,
                                     args.window, labels)
        print(f"\n  Saved {n_saved} moves to {LEARNED_MOVES_JS_PATH}")
    else:
        print(f"  No moves selected. Nothing saved.")

    print()


if __name__ == "__main__":
    main()
