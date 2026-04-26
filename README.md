# DesignWatch

A research tool from **UIST 2024** that turns a folder of UI usability-test screen recordings into an explorable analytics dashboard.

For each user video it extracts a **page-flow workflow**, aligns it to a designer's **expected workflow**, builds a per-user and per-cohort **topology graph**, predicts task-difficulty signals from a small **MLP** model, and asks **Claude** to generate a step-by-step **think-aloud narration** of what the user was doing.

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

The frontend is a **React + TypeScript + Tailwind** app. On page load it shows a **pre-computed sample** so the project is browsable without a backend; clicking *Try with your own data* opens a modal that uploads recordings to the Python backend over a single WebSocket connection on port `6012`.

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
├── frontend/                # Vite + React + TypeScript
│   ├── index.html
│   ├── src/
│   │   ├── App.tsx          # root: fetches sample, orchestrates layout
│   │   ├── components/      # Header, TopologyGraph, UserDetail, ...
│   │   ├── lib/ws.ts        # WebSocket client for live mode
│   │   ├── store/analysis.ts # Zustand store
│   │   └── index.css        # Tailwind layers + custom theme
│   └── tailwind.config.js
├── samples/
│   └── task_check_ranking/
│       ├── videos/          # 4 user videos
│       ├── ground_truth/    # 3 expected screens
│       ├── familiar.csv     # 1 = familiar with the app
│       ├── scenario.txt     # the task description
│       └── precomputed/     # cached output (data.json + thumbnails)
├── scripts/
│   └── precompute_sample.py # runs the full pipeline, dumps to samples/.../precomputed/
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

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

The page opens directly into a **pre-computed sample** — four participants on the *Check my ranking in the user group* task — so you can browse the topology, per-user workflows, MLP signals, and Claude narrations without running the backend at all.

### 3. Try it with your own data

Click **Try with your own data** in the header. The modal accepts:

- **Screen recordings** (`.mp4`) — one per participant
- **Ground-truth screens** (`.jpg` / `.png`) — the canonical screens to label workflow steps against
- **Familiarity CSV** — one column named `familiar` with `1`/`0` per participant, in video order
- **Task scenario** — one sentence describing what each user was trying to do

Click **Run analysis**. Uploads stream to the backend over WebSocket; the page swaps from the sample view to the freshly-computed analysis when results are in.

### 4. Re-generating the precomputed sample

If you change the pipeline or rotate the API key, regenerate the bundled sample:

```bash
python -m scripts.precompute_sample
# writes samples/task_check_ranking/precomputed/{data.json, workflows/*, topology/*}
```

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
