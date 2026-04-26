import { useEffect, useState } from "react"
import { useAnalysis } from "./store/analysis"
import type { AnalysisData } from "./lib/types"
import { Header } from "./components/Header"
import { Hero } from "./components/Hero"
import { TopologySection } from "./components/TopologySection"
import { ParticipantStrip } from "./components/ParticipantStrip"
import { UserDetail } from "./components/UserDetail"
import { UploadModal } from "./components/UploadModal"
import { ErrorBanner } from "./components/ErrorBanner"
import { LoadingScreen } from "./components/LoadingScreen"

const SAMPLE_URL = "/task_check_ranking/precomputed/data.json"

export default function App() {
  const mode = useAnalysis((s) => s.mode)
  const data = useAnalysis((s) => s.data)
  const setData = useAnalysis((s) => s.setData)
  const setError = useAnalysis((s) => s.setError)
  const errorMessage = useAnalysis((s) => s.errorMessage)
  const [uploadOpen, setUploadOpen] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetch(SAMPLE_URL)
      .then((r) => {
        if (!r.ok) throw new Error(`Failed to load sample (${r.status})`)
        return r.json() as Promise<AnalysisData>
      })
      .then((d) => {
        if (!cancelled) setData(d)
      })
      .catch((e) => {
        if (!cancelled) setError(e.message ?? "Failed to load sample.")
      })
    return () => {
      cancelled = true
    }
  }, [setData, setError])

  return (
    <div className="min-h-full">
      <Header onTryYourOwn={() => setUploadOpen(true)} />

      {mode === "loading" && <LoadingScreen />}
      {mode === "error" && <ErrorBanner message={errorMessage ?? "Unknown error"} />}

      {data && (
        <main className="mx-auto max-w-[1400px] px-6 lg:px-10 pb-24 space-y-10">
          <Hero scenario={data.scenario} userCount={data.users.length} mode={mode} />
          <TopologySection />
          <ParticipantStrip />
          <UserDetail />
        </main>
      )}

      <UploadModal open={uploadOpen} onClose={() => setUploadOpen(false)} />

      <footer className="mx-auto max-w-[1400px] px-6 lg:px-10 py-10 text-xs text-ink-400 border-t border-ink-200">
        DesignWatch · Automated think-aloud analysis · UIST 2024
      </footer>
    </div>
  )
}
