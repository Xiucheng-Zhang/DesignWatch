"""Run the MLP scorer end-to-end over a (video, ground_truth) pair."""
from __future__ import annotations

from pathlib import Path

import torch

from .. import config
from ..pipeline.features import get_extractor
from ..pipeline.stats import dtw_distance, ground_truth_features, video_features
from .mlp import MLP


def _load_mlp(device: torch.device) -> MLP:
    model = MLP(config.MLP_INPUT_DIM, config.MLP_OUTPUT_DIM, config.MLP_LAYERS).to(device)
    state = torch.load(config.MLP_WEIGHTS_PATH, map_location=device, weights_only=True)
    model.load_state_dict(state)
    model.eval()
    return model


def score(video_path: str | Path, ground_truth_dir: str | Path) -> str:
    """Return a CSV string of 6 emoji-friendly binary flags.

    Format: hard_med, time_med, inf_med, hard_mean, time_mean, inf_mean
    where each flag is "1" if the corresponding score exceeds the threshold.
    """
    device, _, _ = get_extractor()

    seq_a = video_features(str(video_path), target_fps=config.MLP_FEATURE_FPS)
    seq_b = ground_truth_features(ground_truth_dir)
    if len(seq_a) == 0 or len(seq_b) == 0:
        raise ValueError("Empty video or ground-truth features.")

    dist = dtw_distance(seq_a, seq_b)

    a_t = torch.sum(torch.from_numpy(seq_a), dim=0).to(device)
    b_t = torch.sum(torch.from_numpy(seq_b), dim=0).to(device)
    d_t = torch.tensor([dist], dtype=torch.float).to(device)

    model = _load_mlp(device)
    with torch.no_grad():
        out = model(a_t, b_t, d_t).cpu().tolist()

    flags = (
        [int(v > config.MLP_MEDIAN_THRESHOLD) for v in out]
        + [int(v > config.MLP_MEAN_THRESHOLD) for v in out]
    )
    return ",".join(str(f) for f in flags)
