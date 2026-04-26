"""Centralized config — paths and tunable parameters."""
from pathlib import Path
import os

BACKEND_DIR = Path(__file__).resolve().parent
PROJECT_DIR = BACKEND_DIR.parent

# Runtime data directories (created on demand, gitignored)
DATA_DIR = PROJECT_DIR / "data"
VIDEO_DIR = DATA_DIR / "videos"
WORKFLOW_DIR = DATA_DIR / "workflows"
GROUND_TRUTH_DIR = DATA_DIR / "ground_truth"
STATS_DIR = DATA_DIR / "stats"

# Static assets shipped with the repo
MLP_WEIGHTS_PATH = BACKEND_DIR / "models" / "weights" / "mlp_weight.pth"
FEW_SHOT_DIR = BACKEND_DIR / "llm" / "few_shot"

# WebSocket
WS_HOST = os.getenv("DESIGNWATCH_HOST", "127.0.0.1")
WS_PORT = int(os.getenv("DESIGNWATCH_PORT", "6012"))

# Pipeline tunables (these used to be sprinkled across modules)
WORKFLOW_TARGET_FPS = 20
WORKFLOW_STABLE_FRAME_COUNT = 7
WORKFLOW_SIMILARITY_THRESHOLD = 0.4
WORKFLOW_DEDUP_THRESHOLD = 0.86
LABEL_MATCH_THRESHOLD = 0.9

MLP_INPUT_DIM = 512 + 512 + 1
MLP_OUTPUT_DIM = 3
MLP_LAYERS = [MLP_INPUT_DIM, 512, 256, 256, 128, 64, 16]
MLP_FEATURE_FPS = 20
MLP_MEDIAN_THRESHOLD = 3.5
MLP_MEAN_THRESHOLD = 5.6


def ensure_runtime_dirs() -> None:
    for d in (VIDEO_DIR, WORKFLOW_DIR, GROUND_TRUTH_DIR, STATS_DIR):
        d.mkdir(parents=True, exist_ok=True)
