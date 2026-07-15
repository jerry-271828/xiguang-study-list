#!/usr/bin/env python3
"""Find single-frame glitches in a sequence of frame PNGs (e.g. from
page-turn-flicker-probe.cjs or frames extracted from a screen recording via
ffmpeg: `ffmpeg -i clip.mp4 -vsync 0 frames/f_%04d.png`).

A single-frame flash that reverts on the next frame produces a frame whose
neighbors are nearly identical to *each other* while both differ sharply from
the flagged frame itself — a much cleaner signal than a plain frame-to-frame
diff, which can't distinguish a glitch from ordinary fast motion (e.g. a page
fold animating).

Usage: python3 page-turn-flicker-diff.py <frames_dir> [top_n]
Requires: pillow, numpy (pip install pillow numpy)
"""
import sys
import glob
import os

import numpy as np
from PIL import Image

frames_dir = sys.argv[1]
top_n = int(sys.argv[2]) if len(sys.argv) > 2 else 20

files = sorted(glob.glob(os.path.join(frames_dir, "f_*.png")))
if len(files) < 3:
    print(f"need at least 3 frames in {frames_dir}, found {len(files)}")
    sys.exit(1)
print(f"{len(files)} frames")

imgs = [np.asarray(Image.open(f).convert("L").resize((148, 320)), dtype=np.float32) for f in files]

rows = []
for i in range(1, len(imgs) - 1):
    d_prev = np.abs(imgs[i] - imgs[i - 1]).mean()
    d_next = np.abs(imgs[i] - imgs[i + 1]).mean()
    d_skip = np.abs(imgs[i - 1] - imgs[i + 1]).mean()
    ratio = (d_prev + d_next) / (d_skip + 0.05)
    rows.append((ratio, i + 1, d_prev, d_next, d_skip))

rows.sort(reverse=True)
print(f"top {top_n} by clean-flash ratio (neighbors similar to each other, frame differs from both):")
for r in rows[:top_n]:
    print(f"  ratio={r[0]:7.2f} frame={r[1]:4d} ({files[r[1]-1]}) d_prev={r[2]:6.2f} d_next={r[3]:6.2f} d_skip={r[4]:6.2f}")

print()
print("A ratio well above ~1.3-1.5 (the usual noise floor for ordinary motion) with a small")
print("d_skip is a strong candidate — open that frame plus its immediate neighbors and look.")
