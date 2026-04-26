import { motion } from "framer-motion"

interface Props {
  workflow: string[]
  labels: string[]
  pointImages: Record<string, string>
}

export function WorkflowStrip({ workflow, labels, pointImages }: Props) {
  return (
    <div className="card p-4">
      <div className="flex items-end justify-between mb-3">
        <div>
          <div className="label">Workflow</div>
          <div className="text-sm text-ink-600">
            Key frames extracted from the recording, mapped to ground-truth screens.
          </div>
        </div>
        <span className="text-[11px] text-ink-400">{workflow.length} steps</span>
      </div>

      <div className="overflow-x-auto scroll-snap-x -mx-2 px-2 pb-2">
        <div className="flex items-stretch gap-3 min-w-min">
          {workflow.map((src, i) => {
            const label = labels[i]
            const groundSrc = label ? pointImages[label] : undefined
            return (
              <div key={i} className="flex items-center gap-3 shrink-0">
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: i * 0.04 }}
                  className="w-[140px]"
                >
                  <div className="text-[10px] text-ink-400 mb-1 flex items-center justify-between">
                    <span>Step {i + 1}</span>
                    {label && (
                      <span className="font-mono text-ink-700 bg-ink-100 px-1.5 rounded">
                        {label}
                      </span>
                    )}
                  </div>
                  <div className="rounded-lg overflow-hidden border border-ink-200 bg-ink-50 aspect-[9/16] hover-lift">
                    <img src={src} alt={`step ${i + 1}`} className="w-full h-full object-cover" />
                  </div>
                  {groundSrc && (
                    <div className="mt-1.5 text-[10px] text-ink-400">
                      matches{" "}
                      <span className="font-mono text-ink-600">{label}</span>
                    </div>
                  )}
                </motion.div>
                {i < workflow.length - 1 && (
                  <div className="text-ink-300 self-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M5 12h14M13 5l7 7-7 7" />
                    </svg>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
