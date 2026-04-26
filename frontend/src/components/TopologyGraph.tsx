import { useEffect, useMemo, useRef } from "react"
import { Network } from "vis-network/standalone"
import { DataSet } from "vis-data/standalone"
import type { TopologyGraph as TGraph } from "../lib/types"

interface Props {
  graph: TGraph
  onHoverNode?: (label: string | null) => void
}

const GROUP_COLORS = [
  "#6366F1", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
  "#06B6D4", "#EC4899", "#84CC16", "#F97316", "#3B82F6",
]

export function TopologyGraph({ graph, onHoverNode }: Props) {
  const containerRef = useRef<HTMLDivElement>(null)
  const networkRef = useRef<Network | null>(null)

  const { nodes, edges } = useMemo(() => {
    const colorMap = new Map<string, string>()
    const colored = graph.edges.map((e) => {
      const group = e.title ?? "default"
      if (!colorMap.has(group)) {
        colorMap.set(group, GROUP_COLORS[colorMap.size % GROUP_COLORS.length])
      }
      return {
        ...e,
        color: { color: colorMap.get(group)!, highlight: colorMap.get(group)! },
        smooth: { enabled: true, type: "curvedCW", roundness: 0.18 },
      }
    })
    return { nodes: graph.nodes, edges: colored }
  }, [graph])

  useEffect(() => {
    if (!containerRef.current) return

    const nodeData = new DataSet(
      nodes.map((n) => ({
        id: n.id,
        label: n.label,
        color: { background: "#FFFFFF", border: "#CBD5E1", highlight: { background: "#EEF2FF", border: "#6366F1" } },
        font: { color: "#0F172A", size: 14, face: "Inter, system-ui, sans-serif", strokeWidth: 0 },
        shape: "circle",
        size: 24,
        borderWidth: 1.5,
        shadow: { enabled: true, color: "rgba(15,23,42,0.06)", size: 8, x: 0, y: 2 },
      })),
    )
    const edgeData = new DataSet(
      edges.map((e) => ({
        id: e.id,
        from: e.from,
        to: e.to,
        title: e.title,
        arrows: e.arrows ?? "to",
        color: e.color,
        smooth: e.smooth,
        width: 1.5,
        selectionWidth: 1,
      })),
    )

    const network = new Network(
      containerRef.current,
      { nodes: nodeData, edges: edgeData },
      {
        autoResize: true,
        physics: {
          enabled: true,
          solver: "forceAtlas2Based",
          forceAtlas2Based: { gravitationalConstant: -50, centralGravity: 0.01, springLength: 120, springConstant: 0.08 },
          stabilization: { iterations: 200 },
        },
        interaction: { hover: true, dragNodes: true, zoomView: true, navigationButtons: false, tooltipDelay: 100 },
        nodes: { chosen: true },
        edges: { chosen: false },
      },
    )

    networkRef.current = network

    if (onHoverNode) {
      network.on("hoverNode", (params: { node: number }) => {
        const n = nodes.find((x) => x.id === params.node)
        onHoverNode(n?.label ?? null)
      })
      network.on("blurNode", () => onHoverNode(null))
    }

    return () => {
      network.destroy()
      networkRef.current = null
    }
  }, [nodes, edges, onHoverNode])

  return (
    <div
      ref={containerRef}
      className="rounded-xl bg-gradient-to-br from-ink-50 to-white border border-ink-200"
      style={{ height: 460 }}
    />
  )
}
