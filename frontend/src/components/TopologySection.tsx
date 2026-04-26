import { useMemo, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useAnalysis } from "../store/analysis"
import type { CohortKey } from "../lib/types"
import { TopologyGraph } from "./TopologyGraph"

const TABS: { key: CohortKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "familiar", label: "Familiar" },
  { key: "unfamiliar", label: "Unfamiliar" },
]

export function TopologySection() {
  const data = useAnalysis((s) => s.data)
  const cohort = useAnalysis((s) => s.cohort)
  const setCohort = useAnalysis((s) => s.setCohort)
  const [hoverNode, setHoverNode] = useState<string | null>(null)

  const counts = useMemo(() => {
    if (!data)
      return { all: 0, familiar: 0, unfamiliar: 0 } as Record<CohortKey, number>
    const familiar = data.users.filter((u) => u.familiar === 1).length
    return {
      all: data.users.length,
      familiar,
      unfamiliar: data.users.length - familiar,
    }
  }, [data])

  if (!data) return null
  const graph = data.topology[cohort]

  const previewLabel = hoverNode ?? graph.nodes[0]?.label ?? null
  const previewSrc = previewLabel ? data.pointImages[previewLabel] : undefined

  return (
    <section>
      <div className="flex items-end justify-between flex-wrap gap-3 mb-4">
        <div>
          <div className="label">Workflow topology</div>
          <h2 className="mt-1 text-xl font-semibold text-ink-900 tracking-tight">
            How participants move between screens
          </h2>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-ink-100 border border-ink-200">
          {TABS.map((t) => {
            const active = t.key === cohort
            return (
              <button
                key={t.key}
                onClick={() => setCohort(t.key)}
                className={`relative px-3.5 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  active ? "text-ink-900" : "text-ink-500 hover:text-ink-700"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="cohort-pill"
                    className="absolute inset-0 bg-white rounded-lg shadow-sm border border-ink-200"
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                  />
                )}
                <span className="relative flex items-center gap-1.5">
                  {t.label}
                  <span className={`text-[11px] tabular-nums ${active ? "text-ink-500" : "text-ink-400"}`}>
                    {counts[t.key]}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        <div className="card p-2">
          <TopologyGraph
            graph={graph}
            onHoverNode={(label) => setHoverNode(label)}
          />
          <div className="px-3 py-2 flex items-center justify-between text-[11px] text-ink-400">
            <span>Drag to pan · scroll to zoom · hover a node to preview</span>
            <span className="tabular-nums">
              {graph.nodes.length} nodes · {graph.edges.length} edges
            </span>
          </div>
        </div>

        <div className="card p-4 flex flex-col">
          <div className="label mb-2">Node preview</div>
          <AnimatePresence mode="wait">
            <motion.div
              key={previewLabel ?? "none"}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              className="flex-1 flex flex-col"
            >
              {previewSrc ? (
                <>
                  <div className="rounded-lg overflow-hidden border border-ink-200 bg-ink-50 aspect-[9/16] grid place-items-center">
                    <img src={previewSrc} alt={previewLabel ?? ""} className="max-h-full object-contain" />
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="font-mono text-sm text-ink-700">{previewLabel}</span>
                    <span className="text-[11px] text-ink-400">
                      {hoverNode ? "hovering" : "default"}
                    </span>
                  </div>
                </>
              ) : (
                <div className="flex-1 grid place-items-center text-sm text-ink-400">
                  Hover a node
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  )
}
