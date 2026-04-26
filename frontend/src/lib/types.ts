export interface TopologyNode {
  id: number
  label: string
}

export interface TopologyEdge {
  id: number
  from: number
  to: number
  title?: string
  arrows?: string
}

export interface TopologyGraph {
  nodes: TopologyNode[]
  edges: TopologyEdge[]
}

export interface UserAnalysis {
  id: number
  video: string
  familiar: number
  duration: number
  avgDwell: number
  workflow: string[]
  labels: string[]
  mlp: number[]
  narration: string
}

export interface AnalysisData {
  scenario: string
  users: UserAnalysis[]
  groundTruth: { images: string[]; labels: string[] }
  topology: { all: TopologyGraph; familiar: TopologyGraph; unfamiliar: TopologyGraph }
  pointImages: Record<string, string>
}

export type CohortKey = "all" | "familiar" | "unfamiliar"
