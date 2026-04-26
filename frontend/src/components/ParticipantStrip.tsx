import { motion } from "framer-motion"
import { useAnalysis } from "../store/analysis"
import { formatSeconds } from "../lib/utils"

export function ParticipantStrip() {
  const data = useAnalysis((s) => s.data)
  const selectedUserId = useAnalysis((s) => s.selectedUserId)
  const selectUser = useAnalysis((s) => s.selectUser)

  if (!data) return null

  return (
    <section>
      <div className="label mb-3">Participants · select to inspect</div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {data.users.map((u, i) => {
          const active = u.id === selectedUserId
          return (
            <motion.button
              key={u.id}
              onClick={() => selectUser(u.id)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
              whileHover={{ y: -2 }}
              className={`text-left card p-4 transition-all ${
                active
                  ? "ring-2 ring-accent-500 border-accent-300 shadow-glow"
                  : "hover:border-ink-300"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-xs text-ink-400">Participant</div>
                  <div className="text-lg font-semibold text-ink-900 mt-0.5">
                    User {u.id}
                  </div>
                </div>
                <span
                  className={`chip ${
                    u.familiar
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : "bg-amber-50 border-amber-200 text-amber-700"
                  }`}
                >
                  {u.familiar ? "Familiar" : "Unfamiliar"}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-4 text-[11px] text-ink-500">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-400">
                    Duration
                  </div>
                  <div className="num text-sm">{formatSeconds(u.duration)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-400">
                    Avg dwell
                  </div>
                  <div className="num text-sm">{formatSeconds(u.avgDwell)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ink-400">
                    Steps
                  </div>
                  <div className="num text-sm">{u.workflow.length}</div>
                </div>
              </div>
            </motion.button>
          )
        })}
      </div>
    </section>
  )
}
