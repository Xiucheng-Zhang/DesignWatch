import type { AnalysisData, TopologyGraph, UserAnalysis } from "./types"

const WS_URL = (import.meta.env.VITE_WS_URL as string) || "ws://127.0.0.1:6012"

export interface UploadInput {
  scenario: string
  videos: File[]
  groundTruth: File[]
  familiarCsv: File
  onProgress?: (msg: string) => void
}

interface WorkflowImage {
  identifier: number
  dataUrl: string
}

interface SessionState {
  scenario: string
  videos: File[]
  pointImages: Record<string, string>
  topologyAll?: TopologyGraph
  topologyFamiliar?: TopologyGraph
  topologyUnfamiliar?: TopologyGraph
  wfLabels?: string[][]
  duration: number[]
  avgTime: number[]
  familiar: number[]
  modelOut: Record<number, string>
  gpt: Record<number, string>
  workflowImages: Record<number, WorkflowImage[]>
  currentWorkflow: WorkflowImage[]
}

async function readFileAsArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result as ArrayBuffer)
    r.onerror = reject
    r.readAsArrayBuffer(file)
  })
}

async function readFamiliarCsv(file: File): Promise<number[]> {
  const text = await file.text()
  const lines = text.replace(/\r\n/g, "\n").split("\n").filter(Boolean)
  if (lines.length < 2) return []
  const headers = lines[0].split(",")
  const col = headers.indexOf("familiar")
  if (col < 0) return []
  return lines.slice(1).map((row) => parseInt(row.split(",")[col]) || 0)
}

export async function runLiveUpload(
  input: UploadInput,
): Promise<AnalysisData> {
  const ws = new WebSocket(WS_URL)
  ws.binaryType = "arraybuffer"

  const familiar = await readFamiliarCsv(input.familiarCsv)

  const session: SessionState = {
    scenario: input.scenario,
    videos: input.videos,
    pointImages: {},
    duration: [],
    avgTime: [],
    familiar,
    modelOut: {},
    gpt: {},
    workflowImages: {},
    currentWorkflow: [],
  }

  return new Promise((resolve, reject) => {
    let videoCounter = 0

    ws.onerror = () => reject(new Error("WebSocket connection failed."))
    ws.onclose = () => {
      // resolve only if all expected outputs arrived
    }

    ws.onopen = async () => {
      try {
        ws.send(`scenario:${input.scenario}`)

        for (const img of input.groundTruth) {
          input.onProgress?.(`Uploading ground-truth ${img.name}…`)
          ws.send(`start:${img.type || "image/jpeg"}`)
          ws.send(await readFileAsArrayBuffer(img))
          ws.send("end")
        }

        for (const v of input.videos) {
          videoCounter += 1
          input.onProgress?.(`Uploading video ${videoCounter}/${input.videos.length}…`)
          ws.send("start:video/mp4")
          ws.send(await readFileAsArrayBuffer(v))
          ws.send("end")
        }

        input.onProgress?.("Uploading familiarity CSV…")
        ws.send("start:csv")
        ws.send(await readFileAsArrayBuffer(input.familiarCsv))
        ws.send("end")

        input.onProgress?.("Processing recordings on the server…")
        ws.send("session_end")
      } catch (e) {
        reject(e)
      }
    }

    let videoIndexInFlight = 0

    ws.onmessage = async (ev) => {
      let msg: any
      try {
        msg = JSON.parse(ev.data)
      } catch {
        return
      }

      if (msg.type === "img") {
        session.currentWorkflow.push({
          identifier: msg.identifier,
          dataUrl: `data:image/jpeg;base64,${msg.content}`,
        })
        return
      }
      if (msg.type === "end") {
        videoIndexInFlight += 1
        session.workflowImages[videoIndexInFlight] = session.currentWorkflow.sort(
          (a, b) => a.identifier - b.identifier,
        )
        session.currentWorkflow = []
        input.onProgress?.(`Workflow extracted for video ${videoIndexInFlight}`)
        return
      }
      if (msg.type === "pointData") {
        const out: Record<string, string> = {}
        for (const [k, v] of Object.entries(msg.content as Record<string, string>)) {
          out[k] = `data:image/jpeg;base64,${v}`
        }
        session.pointImages = out
        return
      }
      if (msg.type === "topology") {
        session.topologyAll = msg.content as TopologyGraph
        return
      }
      if (msg.type === "familiar") {
        session.topologyFamiliar = msg.content as TopologyGraph
        return
      }
      if (msg.type === "unfamiliar") {
        session.topologyUnfamiliar = msg.content as TopologyGraph
        return
      }
      if (msg.type === "wf_labels") {
        session.wfLabels = msg.content as string[][]
        return
      }
      if (msg.type === "statistics") {
        session.duration = msg.duration ?? []
        session.avgTime = msg.avg_times ?? []
        input.onProgress?.("Topology built. Requesting per-user analysis…")
        for (let i = 1; i <= input.videos.length; i += 1) {
          ws.send(`video_${i}`)
        }
        return
      }
      if (msg.type === "model_out") {
        const idx = parseInt(msg.index)
        session.modelOut[idx] = msg.content as string
        maybeFinish()
        return
      }
      if (msg.type === "gpt") {
        const idx = parseInt(msg.index)
        session.gpt[idx] = msg.content as string
        input.onProgress?.(`Narration ready for user ${idx}`)
        maybeFinish()
        return
      }
    }

    function maybeFinish() {
      const n = input.videos.length
      const haveModel = Object.keys(session.modelOut).length === n
      const haveGpt = Object.keys(session.gpt).length === n
      if (
        haveModel &&
        haveGpt &&
        session.topologyAll &&
        session.topologyFamiliar &&
        session.topologyUnfamiliar &&
        session.wfLabels
      ) {
        const data = buildAnalysisData(session)
        ws.close()
        resolve(data)
      }
    }
  })
}

function buildAnalysisData(s: SessionState): AnalysisData {
  const users: UserAnalysis[] = s.videos.map((video, i) => {
    const id = i + 1
    const wfImgs = s.workflowImages[id] ?? []
    const labels = s.wfLabels?.[i] ?? []
    const mlpStr = s.modelOut[id] ?? ""
    const mlp = mlpStr.split(",").map((x) => parseInt(x) || 0)
    return {
      id,
      video: URL.createObjectURL(video),
      familiar: s.familiar[i] ?? 0,
      duration: s.duration[i] ?? 0,
      avgDwell: s.avgTime[i] ?? 0,
      workflow: wfImgs.map((w) => w.dataUrl),
      labels,
      mlp,
      narration: s.gpt[id] ?? "",
    }
  })
  return {
    scenario: s.scenario,
    users,
    groundTruth: { images: [], labels: [] },
    topology: {
      all: s.topologyAll!,
      familiar: s.topologyFamiliar!,
      unfamiliar: s.topologyUnfamiliar!,
    },
    pointImages: s.pointImages,
  }
}
