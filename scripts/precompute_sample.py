"""Run the full pipeline + Claude on the bundled sample data and dump
everything the frontend needs into ``samples/task_check_ranking/precomputed/``.

Output layout:

    samples/task_check_ranking/precomputed/
        data.json                 # main payload, one fetch by the frontend
        workflows/user_N/i.jpg    # extracted key frames per video
        topology/{label}.jpg      # one screenshot per topology node

Run from the project root:

    python -m scripts.precompute_sample
"""
from __future__ import annotations

import argparse
import base64
import json
import shutil
import sys
from pathlib import Path
from typing import List

import cv2
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(PROJECT_ROOT))

from backend.llm.client import think_aloud  # noqa: E402
from backend.models.inference import score as mlp_score  # noqa: E402
from backend.pipeline import topology  # noqa: E402
from backend.pipeline.labels import workflows_to_labels  # noqa: E402
from backend.pipeline.match import load_ground_truth  # noqa: E402
from backend.pipeline.workflow import extract_workflow  # noqa: E402

SAMPLE_DIR = PROJECT_ROOT / "samples" / "task_check_ranking"
OUT_DIR = SAMPLE_DIR / "precomputed"


def _read_familiar(path: Path) -> List[int]:
    text = path.read_text(encoding="utf-8")
    rows = [r.split(",") for r in text.replace("\r\n", "\n").splitlines() if r.strip()]
    headers = rows[0]
    col = headers.index("familiar")
    return [int(r[col]) for r in rows[1:] if len(r) > col]


def _frame_to_b64(img) -> str:
    ok, buf = cv2.imencode(".jpg", img)
    if not ok:
        raise RuntimeError("cv2.imencode failed")
    return base64.b64encode(buf).decode("ascii")


def _save_frame(img, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    cv2.imwrite(str(path), img)


def _video_url(name: str) -> str:
    return f"/task_check_ranking/videos/{name}"


def _gt_url(name: str) -> str:
    return f"/task_check_ranking/ground_truth/{name}"


def _workflow_url(user_idx: int, frame_idx: int) -> str:
    return f"/task_check_ranking/precomputed/workflows/user_{user_idx}/{frame_idx}.jpg"


def _topology_url(label: str) -> str:
    return f"/task_check_ranking/precomputed/topology/{label}.jpg"


def main(*, skip_llm: bool = False) -> None:
    load_dotenv(PROJECT_ROOT / ".env", override=True)

    if OUT_DIR.exists():
        shutil.rmtree(OUT_DIR)
    OUT_DIR.mkdir(parents=True)

    scenario = (SAMPLE_DIR / "scenario.txt").read_text(encoding="utf-8").strip()
    familiar = _read_familiar(SAMPLE_DIR / "familiar.csv")

    video_paths = sorted((SAMPLE_DIR / "videos").glob("*.mp4"))
    print(f"[precompute] scenario: {scenario}")
    print(f"[precompute] {len(video_paths)} videos, familiar flags: {familiar}")

    # 1. Extract workflows
    workflows = []
    durations = []
    avg_dwells = []
    for i, vp in enumerate(video_paths, start=1):
        print(f"[precompute] extracting workflow for video {i}: {vp.name}")
        frames, (duration, avg_dwell) = extract_workflow(str(vp))
        workflows.append(frames)
        durations.append(duration)
        avg_dwells.append(avg_dwell)
        for j, frame in enumerate(frames):
            _save_frame(frame, OUT_DIR / "workflows" / f"user_{i}" / f"{j}.jpg")
        print(f"  → {len(frames)} key frames, duration={duration:.2f}s, avg_dwell={avg_dwell:.2f}s")

    # 2. Load ground truth, assign labels, build topology
    gt_imgs, _ = load_ground_truth(SAMPLE_DIR / "ground_truth")
    wf_labels, gt_label, recording = workflows_to_labels(workflows, gt_imgs)
    print(f"[precompute] gt labels: {gt_label}")
    for i, lbls in enumerate(wf_labels, start=1):
        print(f"  user_{i}: {lbls}")

    # Save one screenshot per topology node so the frontend can preview them.
    for img, label in zip(recording[0], recording[1]):
        _save_frame(img, OUT_DIR / "topology" / f"{label}.jpg")

    fam_labels = [wf_labels[i] for i, f in enumerate(familiar) if i < len(wf_labels) and f == 1]
    fam_idx = [i for i, f in enumerate(familiar) if i < len(wf_labels) and f == 1]
    unfam_labels = [wf_labels[i] for i, f in enumerate(familiar) if i < len(wf_labels) and f == 0]
    unfam_idx = [i for i, f in enumerate(familiar) if i < len(wf_labels) and f == 0]

    all_nodes, all_edges, _ = topology.labels_to_graph(wf_labels)
    fam_nodes, fam_edges, _ = topology.labels_to_graph(fam_labels, wf_index=fam_idx)
    unfam_nodes, unfam_edges, _ = topology.labels_to_graph(unfam_labels, wf_index=unfam_idx)

    # 3. Score + narrate per user
    users = []
    for i, vp in enumerate(video_paths, start=1):
        print(f"[precompute] scoring user_{i}...")
        try:
            mlp = mlp_score(vp, SAMPLE_DIR / "ground_truth")
        except Exception as exc:
            print(f"  MLP failed: {exc}")
            mlp = "0,0,0,0,0,0"

        if skip_llm:
            narration = "(LLM step skipped — re-run without --skip-llm to populate.)"
        else:
            print(f"[precompute] generating Claude narration for user_{i}...")
            try:
                images_b64 = [_frame_to_b64(f) for f in workflows[i - 1]]
                narration = think_aloud(images_b64, scenario)
            except Exception as exc:
                print(f"  LLM failed: {exc}")
                narration = f"(LLM error) {exc}"

        users.append({
            "id": i,
            "video": _video_url(vp.name),
            "familiar": familiar[i - 1] if i - 1 < len(familiar) else 0,
            "duration": round(durations[i - 1], 3),
            "avgDwell": round(avg_dwells[i - 1], 3),
            "workflow": [_workflow_url(i, j) for j in range(len(workflows[i - 1]))],
            "labels": wf_labels[i - 1],
            "mlp": [int(v) for v in mlp.split(",")],
            "narration": narration,
        })

    # 4. Ground-truth URLs
    gt_paths = sorted((SAMPLE_DIR / "ground_truth").glob("*.jpg"))
    point_images = {label: _topology_url(label) for label in recording[1]}

    payload = {
        "scenario": scenario,
        "users": users,
        "groundTruth": {
            "images": [_gt_url(p.name) for p in gt_paths],
            "labels": gt_label,
        },
        "topology": {
            "all": {"nodes": all_nodes, "edges": all_edges},
            "familiar": {"nodes": fam_nodes, "edges": fam_edges},
            "unfamiliar": {"nodes": unfam_nodes, "edges": unfam_edges},
        },
        "pointImages": point_images,
    }

    out_json = OUT_DIR / "data.json"
    out_json.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
    print(f"[precompute] wrote {out_json}")
    print(f"[precompute] done.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--skip-llm", action="store_true",
                        help="Skip the Claude narration step (faster, no API cost)")
    args = parser.parse_args()
    main(skip_llm=args.skip_llm)
