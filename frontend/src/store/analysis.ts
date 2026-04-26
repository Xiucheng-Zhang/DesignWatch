import { create } from "zustand"
import type { AnalysisData, CohortKey } from "../lib/types"

type Mode = "loading" | "sample" | "live-uploading" | "live-ready" | "error"

interface State {
  mode: Mode
  data: AnalysisData | null
  cohort: CohortKey
  selectedUserId: number | null
  errorMessage: string | null

  setData: (data: AnalysisData) => void
  setMode: (mode: Mode) => void
  setError: (msg: string) => void
  setCohort: (cohort: CohortKey) => void
  selectUser: (id: number | null) => void
}

export const useAnalysis = create<State>((set) => ({
  mode: "loading",
  data: null,
  cohort: "all",
  selectedUserId: null,
  errorMessage: null,

  setData: (data) =>
    set(() => ({
      data,
      mode: "sample",
      selectedUserId: data.users[0]?.id ?? null,
      errorMessage: null,
    })),
  setMode: (mode) => set(() => ({ mode })),
  setError: (msg) => set(() => ({ mode: "error", errorMessage: msg })),
  setCohort: (cohort) => set(() => ({ cohort })),
  selectUser: (id) => set(() => ({ selectedUserId: id })),
}))
