#!/usr/bin/env python3
"""Dictionary learning on raw choreography positions.

Level 4 (Move Mining) feasibility test: does dictionary learning find
meaningful recurring pose patterns in a single choreography?

Usage:
    python3 tools/dictionary_learning_choreography.py --choreo library/choreo_316e73fb.json
"""

import argparse
import json
import sys
from pathlib import Path

import numpy as np
import matplotlib.pyplot as plt
from matplotlib.colors import Normalize
from sklearn.decomposition import MiniBatchDictionaryLearning

# ── Constants ───────────────────────────────────────────────────────

JOINT_ORDER = [
    "head", "neck", "leftShoulder", "rightShoulder",
    "leftElbow", "rightElbow", "leftHand", "rightHand",
    "hip", "leftKnee", "rightKnee", "leftFoot", "rightFoot",
]
N_JOINTS = len(JOINT_ORDER)

BONES = [
    ("head", "neck"),
    ("neck", "leftShoulder"), ("neck", "rightShoulder"),
    ("leftShoulder", "leftElbow"), ("leftElbow", "leftHand"),
    ("rightShoulder", "rightElbow"), ("rightElbow", "rightHand"),
    ("neck", "hip"),
    ("hip", "leftKnee"), ("leftKnee", "leftFoot"),
    ("hip", "rightKnee"), ("rightKnee", "rightFoot"),
]

BONE_INDICES = [
    (JOINT_ORDER.index(a), JOINT_ORDER.index(b)) for a, b in BONES
]

DARK_BG = "#0d1117"
FPS = 15


# ── Step 1: Load & validate ────────────────────────────────────────

def load_choreo(path: str) -> tuple[np.ndarray, dict]:
    """Load choreography JSON → position matrix (n_frames, 26).

    Missing joints are forward-filled from the last known position.
    If missing from frame 0, backfill from the first frame where it appears.
    """
    with open(path) as f:
        data = json.load(f)

    meta = data["meta"]
    poses = data["poses"]
    n_frames = len(poses)
    matrix = np.full((n_frames, N_JOINTS * 2), np.nan)

    for i, pose in enumerate(poses):
        for j, name in enumerate(JOINT_ORDER):
            if name in pose["joints"]:
                xy = pose["joints"][name]
                matrix[i, j * 2] = xy[0]
                matrix[i, j * 2 + 1] = xy[1]

    # Count missing before fill
    missing_frames = np.any(np.isnan(matrix), axis=1).sum()

    # Forward-fill then backfill
    for col in range(matrix.shape[1]):
        series = matrix[:, col]
        # Forward fill
        last = np.nan
        for i in range(len(series)):
            if np.isnan(series[i]):
                series[i] = last
            else:
                last = series[i]
        # Backfill (for leading NaNs)
        first = np.nan
        for i in range(len(series) - 1, -1, -1):
            if np.isnan(series[i]):
                series[i] = first
            else:
                first = series[i]

    assert not np.any(np.isnan(matrix)), "NaN remains after fill"

    print(f"File:     {Path(path).name}")
    print(f"Poses:    {n_frames}")
    print(f"Duration: {meta['duration']:.1f}s")
    print(f"Missing:  {missing_frames}/{n_frames} frames had missing joints")

    return matrix, meta


# ── Step 2: Build windowed patches ─────────────────────────────────

def build_patches(matrix: np.ndarray, window_sec: float) -> np.ndarray:
    """Window position matrix into overlapping patches.

    Returns (n_patches, window_frames * 26).
    """
    window_frames = int(window_sec * FPS)
    hop_frames = max(1, window_frames // 2)
    n_frames = matrix.shape[0]

    patches = []
    start = 0
    while start + window_frames <= n_frames:
        patch = matrix[start : start + window_frames].flatten()
        patches.append(patch)
        start += hop_frames

    X = np.array(patches)
    print(f"Patches:  {X.shape[0]} (window={window_frames} frames, hop={hop_frames})")
    return X


# ── Step 3: Preprocessing — center only ────────────────────────────

def center_patches(X: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Subtract per-column mean. No scaling."""
    col_means = X.mean(axis=0)
    X_centered = X - col_means
    return X_centered, col_means


# ── Step 4: Dictionary learning ────────────────────────────────────

def run_dictionary_learning(
    X_centered: np.ndarray, n_atoms: int, alpha: float
) -> tuple[np.ndarray, np.ndarray]:
    """Fit MiniBatchDictionaryLearning.

    Returns dictionary (n_atoms, dim) and activations (n_patches, n_atoms).
    """
    dl = MiniBatchDictionaryLearning(
        n_components=n_atoms,
        alpha=alpha,
        random_state=42,
        max_iter=500,
    )
    activations = dl.fit_transform(X_centered)
    dictionary = dl.components_

    # Reconstruction error
    recon = activations @ dictionary
    mse = np.mean((X_centered - recon) ** 2)
    sparsity = np.mean(np.count_nonzero(activations, axis=1))

    print(f"Atoms:    {n_atoms}")
    print(f"Alpha:    {alpha}")
    print(f"Recon MSE: {mse:.2f}")
    print(f"Sparsity: {sparsity:.1f} nonzeros/patch (of {n_atoms})")

    return dictionary, activations


# ── Step 5: Visualization ──────────────────────────────────────────

def draw_stick_figure(ax, joints_xy, alpha=1.0, color="white"):
    """Draw a 13-joint stick figure on ax.

    joints_xy: (13, 2) array of (x, y) positions.
    """
    xs, ys = joints_xy[:, 0], joints_xy[:, 1]

    # Draw bones
    for a, b in BONE_INDICES:
        ax.plot(
            [xs[a], xs[b]], [ys[a], ys[b]],
            color=color, alpha=alpha, linewidth=1.5,
        )

    # Draw joints
    ax.scatter(xs, ys, color=color, alpha=alpha, s=12, zorder=5)


def plot_atom_gallery(
    dictionary: np.ndarray, activations: np.ndarray,
    col_means: np.ndarray, window_sec: float, out_path: Path,
):
    """Plot 1 — Animated Atom Gallery saved as GIF.

    Each subplot animates its atom's 15-frame pose sequence. The atom is
    scaled by its median |activation| so the motion reflects actual
    contribution magnitude.
    """
    from matplotlib.animation import FuncAnimation
    from scipy.ndimage import gaussian_filter1d

    n_atoms = dictionary.shape[0]
    window_frames = int(window_sec * FPS)
    dim_per_frame = N_JOINTS * 2

    # Per-atom typical activation magnitude
    median_act = np.median(np.abs(activations), axis=0)  # (n_atoms,)

    ncols = min(4, n_atoms)
    nrows = (n_atoms + ncols - 1) // ncols

    fig, axes = plt.subplots(nrows, ncols, figsize=(4 * ncols, 4 * nrows))
    fig.patch.set_facecolor(DARK_BG)
    if n_atoms == 1:
        axes = np.array([axes])
    axes = np.atleast_2d(axes)

    # Precompute all atom pose sequences and axis limits
    atom_sequences = []  # list of (window_frames, N_JOINTS, 2)
    atom_limits = []     # list of (x_min, x_max, y_min, y_max)
    for idx in range(n_atoms):
        atom_flat = dictionary[idx] * median_act[idx] + col_means
        atom = atom_flat.reshape(window_frames, N_JOINTS, 2)

        # Temporal smoothing — Gaussian filter along frames (axis=0)
        atom = gaussian_filter1d(atom, sigma=1.5, axis=0)

        atom_sequences.append(atom)

        x_min, x_max = atom[:, :, 0].min() - 30, atom[:, :, 0].max() + 30
        y_min, y_max = atom[:, :, 1].min() - 30, atom[:, :, 1].max() + 30
        atom_limits.append((x_min, x_max, y_min, y_max))

    # Set up static elements
    artists = []  # (bone_lines, joint_scatter) per atom
    for idx in range(n_atoms):
        row, col = divmod(idx, ncols)
        ax = axes[row, col]
        ax.set_facecolor(DARK_BG)
        ax.set_title(f"Atom {idx}", color="white", fontsize=11)
        x_min, x_max, y_min, y_max = atom_limits[idx]
        ax.set_xlim(x_min, x_max)
        ax.set_ylim(y_max, y_min)  # Inverted Y
        ax.set_aspect("equal")
        ax.axis("off")

        bone_lines = []
        for _ in BONE_INDICES:
            line, = ax.plot([], [], color="#e8a735", linewidth=2.0)
            bone_lines.append(line)
        scatter = ax.scatter([], [], color="#e8a735", s=18, zorder=5)
        artists.append((bone_lines, scatter))

    # Hide unused axes
    for idx in range(n_atoms, nrows * ncols):
        row, col = divmod(idx, ncols)
        axes[row, col].set_visible(False)

    fig.suptitle("Dictionary Atoms — Pose Sequences", color="white", fontsize=14)
    fig.tight_layout(rect=[0, 0, 1, 0.95])

    def update(frame_idx):
        for idx in range(n_atoms):
            joints_xy = atom_sequences[idx][frame_idx]
            bone_lines, scatter = artists[idx]
            for bi, (a, b) in enumerate(BONE_INDICES):
                bone_lines[bi].set_data(
                    [joints_xy[a, 0], joints_xy[b, 0]],
                    [joints_xy[a, 1], joints_xy[b, 1]],
                )
            scatter.set_offsets(joints_xy)
        return []

    # GIF output path (change extension from .png to .gif)
    gif_path = out_path.with_suffix(".gif")
    anim = FuncAnimation(fig, update, frames=window_frames, interval=1000 / FPS, blit=False)
    anim.save(str(gif_path), writer="pillow", fps=FPS, savefig_kwargs={"facecolor": DARK_BG})
    plt.close(fig)
    print(f"Saved:    {gif_path}")


def plot_activation_timeline(
    activations: np.ndarray, window_sec: float,
    duration: float, out_path: Path,
):
    """Plot 2 — Activation Timeline heatmap."""
    n_patches = activations.shape[0]
    hop_sec = window_sec / 2
    times = np.arange(n_patches) * hop_sec + window_sec / 2  # Center of each window

    fig, ax = plt.subplots(figsize=(12, 4))
    fig.patch.set_facecolor(DARK_BG)
    ax.set_facecolor(DARK_BG)

    abs_act = np.abs(activations.T)  # (n_atoms, n_patches)

    im = ax.imshow(
        abs_act, aspect="auto", cmap="inferno",
        extent=[times[0], times[-1], abs_act.shape[0] - 0.5, -0.5],
        interpolation="nearest",
    )

    ax.set_xlabel("Time (s)", color="white")
    ax.set_ylabel("Atom", color="white")
    ax.set_title("Atom Activations Over Time", color="white", fontsize=13)
    ax.tick_params(colors="white")

    cbar = fig.colorbar(im, ax=ax, pad=0.02)
    cbar.set_label("|Activation|", color="white")
    cbar.ax.tick_params(colors="white")

    fig.tight_layout()
    fig.savefig(out_path, dpi=150, facecolor=DARK_BG)
    plt.close(fig)
    print(f"Saved:    {out_path}")


def plot_joint_energy(
    dictionary: np.ndarray, window_sec: float, out_path: Path,
) -> np.ndarray:
    """Plot 3 — Joint Energy per Atom heatmap.

    Returns energy matrix (n_atoms, n_joints) for console summary.
    """
    n_atoms = dictionary.shape[0]
    window_frames = int(window_sec * FPS)

    # Reshape each atom to (window_frames, 13, 2)
    energy = np.zeros((n_atoms, N_JOINTS))
    for idx in range(n_atoms):
        atom = dictionary[idx].reshape(window_frames, N_JOINTS, 2)
        # L2 norm over time×xy for each joint → sqrt(sum of squares over 15×2=30 values)
        for j in range(N_JOINTS):
            energy[idx, j] = np.linalg.norm(atom[:, j, :])

    fig, ax = plt.subplots(figsize=(10, max(3, n_atoms * 0.5 + 1)))
    fig.patch.set_facecolor(DARK_BG)
    ax.set_facecolor(DARK_BG)

    im = ax.imshow(energy, aspect="auto", cmap="viridis", interpolation="nearest")

    ax.set_xticks(range(N_JOINTS))
    ax.set_xticklabels(JOINT_ORDER, rotation=45, ha="right", fontsize=9, color="white")
    ax.set_yticks(range(n_atoms))
    ax.set_yticklabels([f"Atom {i}" for i in range(n_atoms)], color="white")
    ax.set_title("Joint Energy per Atom", color="white", fontsize=13)
    ax.tick_params(colors="white")

    cbar = fig.colorbar(im, ax=ax, pad=0.02)
    cbar.set_label("L2 norm", color="white")
    cbar.ax.tick_params(colors="white")

    fig.tight_layout()
    fig.savefig(out_path, dpi=150, facecolor=DARK_BG)
    plt.close(fig)
    print(f"Saved:    {out_path}")

    return energy


def print_console_summary(energy: np.ndarray):
    """Print top 3 joints per atom."""
    n_atoms = energy.shape[0]
    print("\n── Atom Summary ──────────────────────────────")
    for idx in range(n_atoms):
        top3 = np.argsort(energy[idx])[::-1][:3]
        parts = [f"{JOINT_ORDER[j]} ({energy[idx, j]:.1f})" for j in top3]
        print(f"  Atom {idx}: {', '.join(parts)}")
    print("──────────────────────────────────────────────")


# ── Main ────────────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(
        description="Dictionary learning on raw choreography positions"
    )
    parser.add_argument("--choreo", required=True, help="Path to choreography JSON")
    parser.add_argument("--n-atoms", type=int, default=8, help="Number of atoms (default: 8)")
    parser.add_argument("--window", type=float, default=1.0, help="Window size in seconds (default: 1.0)")
    parser.add_argument("--alpha", type=float, default=1.0, help="Sparsity penalty (default: 1.0)")
    args = parser.parse_args()

    # Output directory
    stem = Path(args.choreo).stem
    window_tag = f"{args.window:.1f}s".replace(".", "_")
    out_dir = Path("tools/analysis_output") / f"{stem}_dl_{window_tag}"
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"\n{'═' * 50}")
    print("Dictionary Learning on Choreography Positions")
    print(f"{'═' * 50}\n")

    # Pipeline
    matrix, meta = load_choreo(args.choreo)
    X = build_patches(matrix, args.window)
    X_centered, col_means = center_patches(X)
    dictionary, activations = run_dictionary_learning(X_centered, args.n_atoms, args.alpha)

    print(f"\nOutput:   {out_dir}/")
    plot_atom_gallery(dictionary, activations, col_means, args.window, out_dir / "atoms.png")
    plot_activation_timeline(activations, args.window, meta["duration"], out_dir / "activations.png")
    energy = plot_joint_energy(dictionary, args.window, out_dir / "joint_energy.png")
    print_console_summary(energy)


if __name__ == "__main__":
    main()
