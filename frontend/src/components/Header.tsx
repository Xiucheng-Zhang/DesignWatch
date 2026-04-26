import { motion } from "framer-motion"
import { useAnalysis } from "../store/analysis"

interface Props {
  onTryYourOwn: () => void
}

export function Header({ onTryYourOwn }: Props) {
  const mode = useAnalysis((s) => s.mode)
  const liveBadge =
    mode === "live-uploading"
      ? { label: "Processing live data", tone: "amber" }
      : mode === "live-ready"
        ? { label: "Your data", tone: "green" }
        : null

  return (
    <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 border-b border-ink-200">
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10 h-16 flex items-center justify-between">
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex items-center gap-3"
        >
          <div className="size-8 rounded-lg bg-gradient-to-br from-accent-500 to-accent-700 grid place-items-center shadow-soft">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2 L12 5 M12 19 L12 22 M2 12 L5 12 M19 12 L22 12" />
            </svg>
          </div>
          <div className="leading-tight">
            <div className="font-semibold tracking-tight text-ink-900">DesignWatch</div>
            <div className="text-[11px] text-ink-500">Automated UI usability think-aloud</div>
          </div>
        </motion.div>

        <div className="flex items-center gap-3">
          {liveBadge && (
            <motion.span
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`chip ${
                liveBadge.tone === "amber"
                  ? "bg-amber-50 border-amber-200 text-amber-700"
                  : "bg-emerald-50 border-emerald-200 text-emerald-700"
              }`}
            >
              <span className="size-1.5 rounded-full bg-current opacity-60" />
              {liveBadge.label}
            </motion.span>
          )}
          <a
            href="https://doi.org/10.1145/3640471.3680231"
            target="_blank"
            rel="noreferrer"
            className="btn-ghost text-sm"
            aria-label="Read the paper"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6" />
              <path d="M9 13h6M9 17h4" />
            </svg>
            Paper
          </a>
          <button onClick={onTryYourOwn} className="btn-outline">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Try with your own data
          </button>
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="text-ink-400 hover:text-ink-700 transition-colors"
            aria-label="GitHub"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
            </svg>
          </a>
        </div>
      </div>
    </header>
  )
}
