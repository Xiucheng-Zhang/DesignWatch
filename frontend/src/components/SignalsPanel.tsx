interface Props {
  mlp: number[]
}

const SIGNAL_DEFS = [
  { key: "hard_med", title: "Hardness · median", desc: "Above median difficulty across users" },
  { key: "time_med", title: "Time · median", desc: "Slower than median completion" },
  { key: "inf_med", title: "Information · median", desc: "Above median info-seeking effort" },
  { key: "hard_mean", title: "Hardness · mean", desc: "Above mean difficulty" },
  { key: "time_mean", title: "Time · mean", desc: "Slower than mean completion" },
  { key: "inf_mean", title: "Information · mean", desc: "Above mean info-seeking effort" },
]

export function SignalsPanel({ mlp }: Props) {
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="label">MLP signals</div>
        <span className="text-[11px] text-ink-400">
          binary flags vs cohort baseline
        </span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {SIGNAL_DEFS.map((s, i) => {
          const on = mlp[i] === 1
          return (
            <div
              key={s.key}
              className={`rounded-lg border p-2.5 transition-colors ${
                on
                  ? "bg-accent-50 border-accent-200"
                  : "bg-white border-ink-200"
              }`}
              title={s.desc}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className={`size-1.5 rounded-full ${
                    on ? "bg-accent-600" : "bg-ink-300"
                  }`}
                />
                <span
                  className={`text-[11px] font-medium ${
                    on ? "text-accent-800" : "text-ink-500"
                  }`}
                >
                  {s.title}
                </span>
              </div>
              <div
                className={`mt-1 text-[10px] leading-snug ${
                  on ? "text-accent-700" : "text-ink-400"
                }`}
              >
                {s.desc}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
