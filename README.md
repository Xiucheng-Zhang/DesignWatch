# DesignWatch

A research tool from **UIST 2024** that turns a folder of UI usability-test screen recordings into an explorable analytics dashboard.

For each user video it extracts a **page-flow workflow**, aligns it to a designer's **expected workflow**, builds a per-user and per-cohort **topology graph**, predicts task-difficulty signals from a small **MLP** model, and asks **Claude** to generate a step-by-step **think-aloud narration** of what the user was doing.

![architecture](docs/architecture.png)

> Origin: rewrote and cleaned up an earlier research codebase. The original was Chinese-commented, used a now-deprecated `gpt-4-vision-preview` endpoint, had hard-coded API keys, and shipped runtime data alongside the source. This repo is the same idea, structured for actual reuse.

---

## What it does

```
   user videos        ground-truth         familiar.csv         scenario.txt
      ↓                    ↓                    ↓                    ↓
 video2workflow  →  match  →  workflow2labels  →  topology graph
      ↓                                                ↓
  ResNet-18 features + DTW                       vis.js cohort graphs
      ↓                                          (all / familiar / unfamiliar)
   MLP scorer
      ↓
 6 binary signals                                Claude Sonnet 4.6
 (hard / time / inf,                             ↓
  vs median + mean)                              think-aloud narration
                                                 with [positive/neutral/negative] tags
```

The frontend is a small vanilla-JS app that talks to the backend over a single WebSocket connection on port `6012`.

---

## Project layout

```
DesignWatch/
├── backend/
│   ├── server.py            # WebSocket entry point
│   ├── config.py            # paths + tunables
│   ├── pipeline/
│   │   ├── features.py      # shared ResNet-18 extractor
│   │   ├── workflow.py      # video → key frames
│   │   ├── labels.py        # key frames → A/B/C labels
│   │   ├── match.py         # ground-truth loading
│   │   ├── topology.py      # labels → vis.js graph JSON
│   │   └── stats.py         # video features + DTW
│   ├── models/
│   │   ├── mlp.py           # the MLP head
│   │   ├── inference.py     # video → 6-flag score
│   │   └── weights/mlp_weight.pth
│   └── llm/
│       ├── client.py        # Claude Sonnet 4.6 with prompt caching
│       └── few_shot/*.jpg   # the static example screenshots
├── frontend/
│   ├── index.html
│   ├── script.js
│   ├── style.css
│   └── assets/
├── samples/
│   └── task_check_ranking/  # 4 user videos + 3 GT + scenario + familiar.csv
└── data/                    # runtime upload / output (gitignored)
```

---

## Quickstart

### 1. Backend

```bash
cd DesignWatch
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

cp .env.example .env
# put your ANTHROPIC_API_KEY in .env

python -m backend.server
# → ws://127.0.0.1:6012
```

The first request takes a few seconds extra because it downloads ResNet-18 weights into the torchvision cache.

### 2. Frontend

The frontend is plain HTML + JS and needs to be served over HTTP (not `file://`) for the WebSocket and `URL.createObjectURL` to work cleanly. Easiest way:

```bash
cd frontend
python3 -m http.server 5500
# → http://127.0.0.1:5500
```

Or open `frontend/` in VS Code and use the **Live Server** extension.

### 3. Try it with the sample data

In the UI:

1. **Screen Recordings** → upload all four `samples/task_check_ranking/videos/*.mp4`.
2. **User Familiarity** → upload `samples/task_check_ranking/familiar.csv`.
3. **Expected Workflow** → upload all three `samples/task_check_ranking/ground_truth/*.jpg`.
4. **Task Scenario** → upload `samples/task_check_ranking/scenario.txt`.
5. Click **Start Analysis**.

The first run takes ~30s for video processing on a CPU-only machine; the per-user think-aloud is generated lazily when you click that user's tab.

---

## Configuration

All tunables live in [`backend/config.py`](backend/config.py). The ones most worth touching:

| Parameter | Default | Effect |
|---|---|---|
| `WORKFLOW_TARGET_FPS` | 20 | Frame sampling rate while scanning the video |
| `WORKFLOW_STABLE_FRAME_COUNT` | 7 | How many similar consecutive frames count as "stable" |
| `WORKFLOW_SIMILARITY_THRESHOLD` | 0.4 | Minimum cosine similarity for stability |
| `WORKFLOW_DEDUP_THRESHOLD` | 0.86 | Skip a stable frame if it's this similar to the previous one |
| `LABEL_MATCH_THRESHOLD` | 0.9 | When two key frames count as the same page |

If the extracted workflow has too few / too many frames for a given task, the first three are the knobs to turn.

---

## Notes on the LLM step

The original tool called `gpt-4-vision-preview` (now deprecated). This rewrite uses **Claude Sonnet 4.6** via the Anthropic SDK and applies **prompt caching** (`cache_control: ephemeral`) on the static few-shot block — the eight example screenshots and their narration are uploaded once and reused on subsequent calls in the same 5-minute window, which materially cuts cost when you analyze multiple users back-to-back.

To switch models, set `ANTHROPIC_MODEL` in `.env` (e.g. `claude-opus-4-7`).

---

## License

Original research code from UIST 2024. No license declared — treat as research-only until one is added.
