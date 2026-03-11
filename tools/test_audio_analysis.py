#!/usr/bin/env python3
"""Sanity test: run browser_fft_analysis on a known MP3 and print stats."""
import sys
import types

# move_mining_pipeline imports gi (GTK) at module level for the review GUI.
# Mock it out so this headless test can import just browser_fft_analysis.

class _FakeGtkBase:
    """Fake base class so `class Foo(Gtk.Window)` doesn't crash."""
    def __init_subclass__(cls, **kw):
        super().__init_subclass__(**kw)
    class Orientation:
        VERTICAL = 0
        HORIZONTAL = 1
    class PolicyType:
        NEVER = 0
        AUTOMATIC = 1
    class Align:
        CENTER = 0
    STYLE_PROVIDER_PRIORITY_APPLICATION = 0
    Window = type("Window", (), {"__init__": lambda self, **kw: None})
    Box = type("Box", (), {"__init__": lambda self, **kw: None})
    ScrolledWindow = type("ScrolledWindow", (), {})
    Grid = type("Grid", (), {})
    Label = type("Label", (), {})
    CheckButton = type("CheckButton", (), {})
    Entry = type("Entry", (), {})
    Button = type("Button", (), {})
    Image = type("Image", (), {})
    CssProvider = type("CssProvider", (), {"load_from_data": lambda self, d: None})
    StyleContext = type("StyleContext", (), {})
    StyleContext.add_provider_for_screen = staticmethod(lambda *a: None)
    @staticmethod
    def main(): pass
    @staticmethod
    def main_quit(): pass

gi_mock = types.ModuleType("gi")
gi_mock.require_version = lambda *a, **k: None
gi_repo = types.ModuleType("gi.repository")
gi_repo.Gtk = _FakeGtkBase
gi_repo.GdkPixbuf = types.ModuleType("GdkPixbuf")
gi_repo.GLib = types.ModuleType("GLib")
sys.modules["gi"] = gi_mock
sys.modules["gi.repository"] = gi_repo

sys.path.insert(0, "tools")
import numpy as np
import librosa
from move_mining_pipeline import browser_fft_analysis

mp3_path = "library/choreo_3d290c67.mp3"  # Levels by Avicii
audio, sr = librosa.load(mp3_path, sr=44100, mono=True)
print(f"Loaded: {mp3_path} ({len(audio)/sr:.1f}s)")

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

low = sum(1 for e in energies if e < 0.33)
mid_count = sum(1 for e in energies if 0.33 <= e < 0.66)
high = sum(1 for e in energies if e >= 0.66)
total = len(energies)
print(f"Energy tiers: low={low/total:.0%}, mid={mid_count/total:.0%}, high={high/total:.0%}")
