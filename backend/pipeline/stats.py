"""Per-frame ResNet features + DTW distance — inputs for the MLP scorer."""
from __future__ import annotations

from pathlib import Path
from typing import List

import cv2
import numpy as np
from PIL import Image

from .features import features_from_bgr, features_from_pil


def video_features(video_path: str, target_fps: int = 20) -> np.ndarray:
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")
    fps = cap.get(cv2.CAP_PROP_FPS)
    skip = int(np.round(fps / target_fps)) if fps > target_fps else 1

    feats: List[np.ndarray] = []
    idx = 0
    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if fps > target_fps and idx % skip != 0:
            idx += 1
            continue
        feats.append(features_from_bgr(frame))
        idx += 1
    cap.release()
    return np.array(feats) if feats else np.zeros((0, 512), dtype=np.float32)


def ground_truth_features(image_dir: str | Path) -> np.ndarray:
    image_dir = Path(image_dir)
    paths = sorted(p for p in image_dir.iterdir() if p.suffix.lower() in {".jpg", ".jpeg", ".png"})
    feats = [features_from_pil(Image.open(p)) for p in paths]
    return np.array(feats) if feats else np.zeros((0, 512), dtype=np.float32)


def dtw_distance(a: np.ndarray, b: np.ndarray) -> float:
    m, n = len(a), len(b)
    if m == 0 or n == 0:
        return float("inf")
    cost = np.full((m + 1, n + 1), np.inf)
    cost[0, 0] = 0.0
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            d = np.linalg.norm(a[i - 1] - b[j - 1])
            cost[i, j] = d + min(cost[i - 1, j], cost[i, j - 1], cost[i - 1, j - 1])
    return float(cost[m, n])
