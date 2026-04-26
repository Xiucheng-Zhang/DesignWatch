"""WebSocket server for DesignWatch.

Frontend (frontend/index.html) connects, uploads screen recordings + ground
truth + a familiarity CSV + a task scenario, then asks the backend to
analyze each video. The backend responds with workflow screenshots, a
topology graph, MLP scores, and a Claude-generated think-aloud narration.
"""
from __future__ import annotations

import asyncio
import base64
import json
import re
import shutil
from pathlib import Path
from typing import List

import cv2
import websockets
from dotenv import load_dotenv

from . import config
from .llm.client import think_aloud
from .models.inference import score as mlp_score
from .pipeline import topology
from .pipeline.labels import workflows_to_labels
from .pipeline.match import load_ground_truth
from .pipeline.workflow import process_video


load_dotenv()


class Session:
    """Per-connection state; reset every time the frontend reconnects."""

    def __init__(self):
        self.familiar: List[int] = []
        self.video_count: int = 0
        self.workflows: List[list] = []
        self.duration: List[float] = []
        self.avg_time: List[float] = []
        self.scenario: str = ""
        self.processed: set[str] = set()


# ----------------- helpers -----------------

async def _send_workflow_images(websocket, save_dir: Path) -> None:
    for fname in sorted(save_dir.iterdir(), key=lambda p: int(re.findall(r"\d+", p.stem)[-1])):
        b64 = base64.b64encode(fname.read_bytes()).decode("utf-8")
        idx = int(re.findall(r"\d+", fname.stem)[-1])
        await websocket.send(json.dumps({
            "type": "img",
            "identifier": idx,
            "content": b64,
        }))
        await asyncio.sleep(0.05)
    await websocket.send(json.dumps({"type": "end", "identifier": None, "content": None}))


def _clear_directory(path: Path) -> None:
    if not path.exists():
        return
    for child in path.iterdir():
        if child.name.startswith("."):
            continue
        if child.is_dir():
            shutil.rmtree(child)
        else:
            child.unlink()


def _next_filename(folder: Path, ext: str) -> Path:
    folder.mkdir(parents=True, exist_ok=True)
    nums = [int(n) for n in re.findall(r"\d+", " ".join(p.name for p in folder.iterdir()))]
    nxt = max(nums, default=0) + 1
    return folder / f"file_{nxt}.{ext}"


# ----------------- pipeline -----------------

async def _build_topology(session: Session, websocket):
    gt_imgs, _ = load_ground_truth(config.GROUND_TRUTH_DIR)
    if not gt_imgs:
        raise RuntimeError("No ground-truth images uploaded.")

    wf_labels, gt_label, recording = workflows_to_labels(session.workflows, gt_imgs)
    print(f"[pipeline] gt_label={gt_label}")

    # Split by familiarity flag (1 = familiar, 0 = unfamiliar).
    familiar_idx, unfamiliar_idx = [], []
    familiar_labels, unfamiliar_labels = [], []
    for i in range(min(len(session.familiar), len(wf_labels))):
        if session.familiar[i] == 1:
            familiar_idx.append(i)
            familiar_labels.append(wf_labels[i])
        else:
            unfamiliar_idx.append(i)
            unfamiliar_labels.append(wf_labels[i])

    fam_nodes, fam_edges, _ = topology.labels_to_graph(familiar_labels, wf_index=familiar_idx)
    unfam_nodes, unfam_edges, _ = topology.labels_to_graph(unfamiliar_labels, wf_index=unfamiliar_idx)
    all_nodes, all_edges, _ = topology.labels_to_graph(wf_labels)

    # Map node label -> screenshot (base64 jpg).
    point_data = {}
    for img, label in zip(recording[0], recording[1]):
        ok, buf = cv2.imencode(".jpg", img)
        if ok:
            point_data[label] = base64.b64encode(buf).decode("utf-8")

    await websocket.send(json.dumps({"type": "pointData", "content": point_data}))
    await websocket.send(json.dumps({
        "type": "topology",
        "content": topology.graph_to_json(all_nodes, all_edges),
        "gt_label": gt_label,
    }))
    await websocket.send(json.dumps({
        "type": "familiar",
        "content": topology.graph_to_json(fam_nodes, fam_edges),
        "gt_label": gt_label,
    }))
    await websocket.send(json.dumps({
        "type": "unfamiliar",
        "content": topology.graph_to_json(unfam_nodes, unfam_edges),
        "gt_label": gt_label,
    }))
    await websocket.send(json.dumps({"type": "wf_labels", "content": wf_labels}))


async def _send_statistics(session: Session, websocket):
    stats_file = config.STATS_DIR / "statistics.json"
    if stats_file.exists():
        await websocket.send(stats_file.read_text(encoding="utf-8"))
        return
    payload = {
        "type": "statistics",
        "duration": session.duration,
        "avg_times": session.avg_time,
        "acc_rate": [0.0] * len(session.duration),
    }
    await websocket.send(json.dumps(payload))


async def _handle_video_request(session: Session, websocket, message: str):
    if message in session.processed:
        return
    session.processed.add(message)
    index = int(message.split("_")[-1])
    video_path = config.VIDEO_DIR / message / "video.mp4"

    # MLP score
    try:
        result = mlp_score(video_path, config.GROUND_TRUTH_DIR)
        await websocket.send(json.dumps({
            "type": "model_out",
            "content": result,
            "index": str(index),
        }))
    except Exception as exc:
        print(f"[mlp] failed: {exc}")

    # Claude think-aloud
    try:
        wf = session.workflows[index - 1]
        b64_imgs = []
        for img in wf:
            ok, buf = cv2.imencode(".jpg", img)
            if ok:
                b64_imgs.append(base64.b64encode(buf).decode("utf-8"))
        text = think_aloud(b64_imgs, session.scenario or "Unknown task")
        await websocket.send(json.dumps({
            "type": "gpt",
            "content": text,
            "index": str(index),
        }))
    except Exception as exc:
        print(f"[claude] failed: {exc}")
        await websocket.send(json.dumps({
            "type": "gpt",
            "content": f"(LLM error) {exc}",
            "index": str(index),
        }))


# ----------------- connection handler -----------------

async def handle(websocket):
    session = Session()
    file_data = bytearray()
    file_type: str | None = None

    print("[ws] client connected")
    config.ensure_runtime_dirs()

    try:
        while True:
            message = await websocket.recv()

            # Binary frame -> file payload
            if isinstance(message, (bytes, bytearray)):
                file_data.extend(message)
                continue

            # ------ control messages ------
            if message.startswith("scenario:"):
                session.scenario = message.split(":", 1)[1]
                print(f"[ws] scenario: {session.scenario}")
                continue

            if message.startswith("start:"):
                file_type = message.split(":", 1)[1]
                file_data = bytearray()
                continue

            if message == "end":
                _save_uploaded_file(session, file_type, bytes(file_data))
                file_type = None
                file_data = bytearray()
                continue

            if message == "delete_video":
                session.familiar = []
                session.video_count = 0
                session.workflows = []
                session.duration = []
                session.avg_time = []
                session.processed = set()
                _clear_directory(config.VIDEO_DIR)
                _clear_directory(config.WORKFLOW_DIR)
                continue

            if message == "delete_image":
                _clear_directory(config.GROUND_TRUTH_DIR)
                continue

            if message == "session_end":
                await _process_uploads(session, websocket)
                continue

            # Frontend asks to analyze a specific video, e.g. "video_3".
            if message.startswith("video_"):
                await _handle_video_request(session, websocket, message)
                continue

            print(f"[ws] unknown message: {message!r}")

    except websockets.ConnectionClosed:
        print("[ws] client disconnected")


def _save_uploaded_file(session: Session, file_type: str | None, payload: bytes) -> None:
    if file_type in {"image/jpeg", "image/png"}:
        ext = "jpg" if file_type == "image/jpeg" else "png"
        path = _next_filename(config.GROUND_TRUTH_DIR, ext)
        path.write_bytes(payload)
        print(f"[ws] saved ground-truth image: {path.name}")

    elif file_type == "video/mp4":
        session.video_count += 1
        folder = config.VIDEO_DIR / f"video_{session.video_count}"
        folder.mkdir(parents=True, exist_ok=True)
        (folder / "video.mp4").write_bytes(payload)
        print(f"[ws] saved video #{session.video_count}")

    elif file_type == "csv":
        text = payload.decode("utf-8")
        rows = [r.split(",") for r in text.replace("\r\n", "\n").splitlines() if r]
        if not rows:
            print("[ws] empty CSV")
            return
        headers = rows[0]
        try:
            col = headers.index("familiar")
        except ValueError:
            print("[ws] CSV missing 'familiar' column")
            return
        session.familiar = [int(r[col]) for r in rows[1:] if len(r) > col]
        print(f"[ws] familiar: {session.familiar}")

    else:
        print(f"[ws] unsupported file_type: {file_type!r}")


async def _process_uploads(session: Session, websocket) -> None:
    """Run video -> workflow extraction for every uploaded video, then build topology."""
    print(f"[pipeline] processing {session.video_count} videos...")

    for i in range(1, session.video_count + 1):
        video_path = config.VIDEO_DIR / f"video_{i}" / "video.mp4"
        save_dir = config.WORKFLOW_DIR / f"video_{i}"
        save_dir.mkdir(parents=True, exist_ok=True)

        frames, (duration, avg_time) = process_video(str(video_path), save_dir)
        session.workflows.append(frames)
        session.duration.append(duration)
        session.avg_time.append(avg_time)

        await _send_workflow_images(websocket, save_dir)

    await _build_topology(session, websocket)
    await _send_statistics(session, websocket)


# ----------------- main -----------------

async def main():
    config.ensure_runtime_dirs()
    print(f"[server] listening on ws://{config.WS_HOST}:{config.WS_PORT}")
    async with websockets.serve(handle, config.WS_HOST, config.WS_PORT, max_size=None):
        await asyncio.Future()


if __name__ == "__main__":
    asyncio.run(main())
