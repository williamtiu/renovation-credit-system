#!/usr/bin/env python3
"""Crop detail shots from UI screenshots for slide legibility (world-class fix)."""
from PIL import Image
import os

D = "/home/z/my-project/download/slides"

def crop(src, dst, x, y, w, h):
    """x,y,w,h as fractions of original size."""
    im = Image.open(os.path.join(D, src))
    W, H = im.size
    box = (int(W * x), int(H * y), int(W * (x + w)), int(H * (y + h)))
    im.crop(box).save(os.path.join(D, dst))
    out = Image.open(os.path.join(D, dst))
    print(f"{dst}: {out.size[0]}x{out.size[1]} (from {src} {W}x{H})")

# Control tab — slider detail (left column of sliders, near-native scale)
crop("shot-control.png", "shot-control-detail.png", 0.06, 0.50, 0.50, 0.47)
# Trajectory tab — recording state hero band (status + controls, end before library list)
crop("shot-trajectory.png", "shot-traj-hero.png", 0.05, 0.13, 0.99, 0.30)
# Logs tab — audit table hero band (header + first rows)
crop("shot-logs.png", "shot-logs-hero.png", 0.06, 0.26, 0.92, 0.48)
