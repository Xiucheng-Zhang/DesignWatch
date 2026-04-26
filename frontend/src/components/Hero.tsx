import { motion } from "framer-motion"

interface Props {
  scenario: string
  userCount: number
  mode: string
}

export function Hero({ scenario, userCount, mode }: Props) {
  const sourceLabel =
    mode === "live-ready" ? "Your uploaded session" : "Pre-computed sample"

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="pt-10 pb-2"
    >
      <div className="label mb-3">Scenario</div>
      <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-ink-900 max-w-3xl leading-tight">
        &ldquo;{scenario}&rdquo;
      </h1>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-ink-500">
        <span className="chip bg-ink-50 border-ink-200 text-ink-600">
          {userCount} participants
        </span>
        <span className="chip bg-ink-50 border-ink-200 text-ink-600">
          {sourceLabel}
        </span>
        <span className="text-ink-400">·</span>
        <span>
          Each recording is reduced to a workflow, scored against ground-truth, and
          narrated by an LLM acting as a think-aloud subject.
        </span>
      </div>
    </motion.section>
  )
}
