"""Load ground-truth images from a directory."""
from __future__ import annotations

from pathlib import Path
from typing import List, Tuple

import cv2
import numpy as np


def load_ground_truth(gt_dir: str | Path) -> Tuple[List[np.ndarray], bool]:
    """Return (images, is_multi).

    If the directory contains image files directly: returns a flat list.
    If it contains subdirectories: returns a list-of-lists (one per scenario).
    """
    gt_dir = Path(gt_dir)
    entries = sorted(p for p in gt_dir.iterdir() if not p.name.startswith("."))
    if not entries:
        return [], False

    if entries[0].is_dir():
        groups: List[List[np.ndarray]] = []
        for sub in entries:
            imgs = [cv2.imread(str(p)) for p in sorted(sub.iterdir())]
            groups.append([img for img in imgs if img is not None])
        return groups, True

    imgs = [cv2.imread(str(p)) for p in entries if p.suffix.lower() in {".jpg", ".jpeg", ".png"}]
    return [img for img in imgs if img is not None], False
