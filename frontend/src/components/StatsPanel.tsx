import type { UserAnalysis } from "../lib/types"
import { formatSeconds } from "../lib/utils"

interface Props {
  user: UserAnalysis
}

export function StatsPanel({ user }: Props) {
  const items = [
    { label: "Duration", value: formatSeconds(user.duration), hint: "video length" },
    { label: "Avg dwell", value: formatSeconds(user.avgDwell), hint: "per screen" },
    { label: "Steps", value: String(user.workflow.length), hint: "key frames" },
    {
      label: "Cohort",
      value: user.familiar ? "Familiar" : "Unfamiliar",
      hint: "self-reported",
    },
  ]

  return (
    <div className="card p-4">
      <div className="label mb-3">Statistics</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {items.map((it) => (
          <div key={it.label} className="rounded-xl bg-ink-50 border border-ink-100 p-3">
            <div className="text-[10px] uppercase tracking-wider text-ink-400">{it.label}</div>
            <div className="mt-1 num text-lg leading-tight">{it.value}</div>
            <div className="text-[10px] text-ink-400 mt-0.5">{it.hint}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
