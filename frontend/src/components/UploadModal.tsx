import { useState } from "react"
import { AnimatePresence, motion } from "framer-motion"
import { useAnalysis } from "../store/analysis"
import { runLiveUpload } from "../lib/ws"

interface Props {
  open: boolean
  onClose: () => void
}

export function UploadModal({ open, onClose }: Props) {
  const setData = useAnalysis((s) => s.setData)
  const setMode = useAnalysis((s) => s.setMode)
  const [scenario, setScenario] = useState("")
  const [videos, setVideos] = useState<File[]>([])
  const [groundTruth, setGroundTruth] = useState<File[]>([])
  const [familiarCsv, setFamiliarCsv] = useState<File | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  function reset() {
    setScenario("")
    setVideos([])
    setGroundTruth([])
    setFamiliarCsv(null)
    setProgress(null)
    setError(null)
    setRunning(false)
  }

  async function start() {
    if (!scenario.trim()) {
      setError("Please describe the task scenario.")
      return
    }
    if (!videos.length) {
      setError("Upload at least one video.")
      return
    }
    if (!groundTruth.length) {
      setError("Upload at least one ground-truth screen.")
      return
    }
    if (!familiarCsv) {
      setError("Upload the familiarity CSV.")
      return
    }
    setError(null)
    setRunning(true)
    setMode("live-uploading")
    try {
      const data = await runLiveUpload({
        scenario: scenario.trim(),
        videos,
        groundTruth,
        familiarCsv,
        onProgress: (m) => setProgress(m),
      })
      setData(data)
      setMode("live-ready")
      onClose()
      reset()
    } catch (e: any) {
      setError(e?.message ?? "Live upload failed.")
      setMode("error")
    } finally {
      setRunning(false)
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-50 grid place-items-center bg-ink-900/40 backdrop-blur-sm p-4"
          onClick={() => !running && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            onClick={(e) => e.stopPropagation()}
            className="card w-full max-w-2xl p-6 max-h-[88vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="label">Live mode</div>
                <h2 className="mt-1 text-xl font-semibold text-ink-900">
                  Try with your own data
                </h2>
                <p className="mt-1 text-sm text-ink-600 max-w-md">
                  The Python backend extracts workflows, builds the topology, and
                  generates think-aloud narrations from your recordings.
                </p>
              </div>
              <button onClick={onClose} className="btn-ghost p-2" aria-label="Close" disabled={running}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-4">
              <Field
                label="Task scenario"
                hint="One sentence describing what each user is trying to do."
              >
                <input
                  className="input"
                  placeholder="e.g. Check my ranking in the user group"
                  value={scenario}
                  onChange={(e) => setScenario(e.target.value)}
                  disabled={running}
                />
              </Field>

              <Field
                label="Screen recordings (.mp4)"
                hint="One or more videos. Each becomes a participant."
              >
                <FileInput
                  accept="video/mp4"
                  multiple
                  files={videos}
                  onChange={setVideos}
                  disabled={running}
                />
              </Field>

              <Field
                label="Ground-truth screens (.jpg / .png)"
                hint="The canonical screens used to label the workflow."
              >
                <FileInput
                  accept="image/jpeg,image/png"
                  multiple
                  files={groundTruth}
                  onChange={setGroundTruth}
                  disabled={running}
                />
              </Field>

              <Field
                label="Familiarity CSV"
                hint='One column "familiar" with 1/0 per participant, in video order.'
              >
                <FileInput
                  accept=".csv,text/csv"
                  files={familiarCsv ? [familiarCsv] : []}
                  onChange={(f) => setFamiliarCsv(f[0] ?? null)}
                  disabled={running}
                />
              </Field>

              {error && (
                <div className="rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-700">
                  {error}
                </div>
              )}

              {progress && (
                <div className="rounded-lg bg-accent-50 border border-accent-200 px-3 py-2 text-sm text-accent-800 flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-accent-600 animate-pulse" />
                  {progress}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button onClick={onClose} className="btn-ghost" disabled={running}>
                  Cancel
                </button>
                <button onClick={start} className="btn-primary" disabled={running}>
                  {running ? "Running…" : "Run analysis"}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="text-sm font-medium text-ink-800">{label}</div>
      {hint && <div className="text-xs text-ink-500 mt-0.5 mb-2">{hint}</div>}
      {children}
    </div>
  )
}

function FileInput({
  accept,
  multiple,
  files,
  onChange,
  disabled,
}: {
  accept?: string
  multiple?: boolean
  files: File[]
  onChange: (files: File[]) => void
  disabled?: boolean
}) {
  return (
    <label
      className={`block rounded-xl border-2 border-dashed p-3 cursor-pointer transition-colors ${
        files.length
          ? "border-accent-300 bg-accent-50/50"
          : "border-ink-200 hover:border-ink-300 bg-ink-50"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        onChange={(e) => onChange(Array.from(e.target.files ?? []))}
        className="hidden"
      />
      {files.length === 0 ? (
        <div className="text-sm text-ink-500 text-center py-2">
          Click to choose {multiple ? "files" : "a file"}
        </div>
      ) : (
        <div className="space-y-1">
          {files.map((f, i) => (
            <div
              key={i}
              className="flex items-center justify-between text-xs text-ink-700 bg-white rounded-md border border-ink-200 px-2 py-1"
            >
              <span className="truncate">{f.name}</span>
              <span className="text-ink-400 tabular-nums">
                {(f.size / 1024).toFixed(0)} KB
              </span>
            </div>
          ))}
        </div>
      )}
    </label>
  )
}
