"""Assign string labels (A, B, ..., Z, a, ..., z) to workflow images by visual similarity."""
from typing import List, Tuple

import numpy as np

from .. import config
from .features import similarity

_GLOBAL_LABELS = [chr(ord("A") + i) for i in range(26)] + [chr(ord("a") + i) for i in range(26)]


class LabelAssigner:
    """Stateful labeler — keeps a recording of (image, label) seen so far."""

    def __init__(self):
        self.images: List[np.ndarray] = []
        self.labels: List[str] = []
        self._cursor = -1

    def _new_label(self) -> str:
        self._cursor = (self._cursor + 1) % len(_GLOBAL_LABELS)
        return _GLOBAL_LABELS[self._cursor]

    def assign(self, workflow: List[np.ndarray]) -> List[str]:
        out: List[str] = []
        for frame in workflow:
            matched = None
            for ref_img, ref_label in zip(self.images, self.labels):
                if similarity(frame, ref_img) >= config.LABEL_MATCH_THRESHOLD:
                    matched = ref_label
                    break
            if matched is None:
                matched = self._new_label()
                self.images.append(frame)
                self.labels.append(matched)
            out.append(matched)
        return out


def workflows_to_labels(
    workflows: List[List[np.ndarray]],
    ground_truth: List[np.ndarray],
) -> Tuple[List[List[str]], List[str], Tuple[List[np.ndarray], List[str]]]:
    """Label all workflows. Ground-truth frames are seeded first to bias label assignment."""
    assigner = LabelAssigner()
    gt_labels = assigner.assign(ground_truth)
    wf_labels = [assigner.assign(wf) for wf in workflows]
    return wf_labels, gt_labels, (assigner.images, assigner.labels)
