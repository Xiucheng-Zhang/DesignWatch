"""Extract a 'workflow' (sequence of stable key frames) from a screen-recording video."""
from __future__ import annotations

from pathlib import Path
from typing import List, Tuple

import cv2
import numpy as np

from .. import config
from .features import similarity


def _open_video(video_path: str) -> Tuple[cv2.VideoCapture, float, int]:
    cap = cv2.VideoCapture(str(video_path))
    if not cap.isOpened():
        raise RuntimeError(f"Cannot open video: {video_path}")
    fps = cap.get(cv2.CAP_PROP_FPS)
    n_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    return cap, fps, n_frames


def extract_workflow(video_path: str) -> Tuple[List[np.ndarray], Tuple[float, float]]:
    """Return (key_frames, (duration_seconds, avg_dwell_seconds_per_keyframe))."""
    cap, fps, n_frames = _open_video(video_path)
    duration = n_frames / fps if fps else 0.0

    skip = max(1, round(fps / config.WORKFLOW_TARGET_FPS))

    ok, prev = cap.read()
    if not ok:
        cap.release()
        raise RuntimeError(f"Cannot read first frame: {video_path}")

    stable_frames: List[np.ndarray] = []
    stable_counter = 0
    frame_idx = 0

    while True:
        ok, frame = cap.read()
        if not ok:
            break
        if frame_idx % skip == 0:
            sim = similarity(prev, frame)
            if config.WORKFLOW_SIMILARITY_THRESHOLD <= sim <= 1.0:
                stable_counter += 1
                if stable_counter == config.WORKFLOW_STABLE_FRAME_COUNT:
                    stable_counter = 0
                    if stable_frames:
                        if similarity(stable_frames[-1], frame) >= config.WORKFLOW_DEDUP_THRESHOLD:
                            prev = frame
                            frame_idx += 1
                            continue
                    stable_frames.append(frame)
            else:
                stable_counter = 0
            prev = frame
        frame_idx += 1

    cap.release()
    if not stable_frames:
        return [], (duration, 0.0)
    return stable_frames, (duration, duration / len(stable_frames))


def save_workflow(frames: List[np.ndarray], save_dir: str | Path) -> None:
    save_dir = Path(save_dir)
    save_dir.mkdir(parents=True, exist_ok=True)
    for i, frame in enumerate(frames):
        cv2.imwrite(str(save_dir / f"{i}.jpg"), frame)


def process_video(video_path: str, save_dir: str | Path):
    """Backwards-compatible API for server.py — extract + save."""
    frames, meta = extract_workflow(video_path)
    save_workflow(frames, save_dir)
    return frames, meta
