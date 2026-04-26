"""Build vis.js-compatible {nodes, edges} JSON from sequences of labels."""
from __future__ import annotations

import json
from typing import Dict, List, Sequence, Tuple


def _build_point_dict(workflows: Sequence[Sequence[str]], existing: Dict[str, int] | None = None) -> Dict[str, int]:
    pd: Dict[str, int] = dict(existing) if existing else {}
    counter = max(pd.values(), default=-1) + 1
    for wf in workflows:
        for p in wf:
            if p not in pd:
                pd[p] = counter
                counter += 1
    return pd


def _build_nodes(point_dict: Dict[str, int]) -> List[dict]:
    return [{"id": v, "label": k} for k, v in point_dict.items()]


def _build_edges(workflows: Sequence[Sequence[str]], point_dict: Dict[str, int], wf_index: Sequence[int]) -> List[dict]:
    edges = []
    eid = 0
    for i, wf in enumerate(workflows):
        group = wf_index[i] if wf_index else i
        for a, b in zip(wf, wf[1:]):
            edges.append({
                "from": point_dict[a],
                "to": point_dict[b],
                "title": f"group{group}",
                "arrows": "to",
                "id": eid,
            })
            eid += 1
    return edges


def labels_to_graph(
    workflows: Sequence[Sequence[str]],
    point_dict: Dict[str, int] | None = None,
    wf_index: Sequence[int] = (),
) -> Tuple[List[dict], List[dict], Dict[str, int]]:
    """Return (nodes, edges, point_dict). wf_index lets you tag edges with original wf indices."""
    pd = _build_point_dict(workflows, point_dict)
    edges = _build_edges(workflows, pd, list(wf_index))
    nodes = _build_nodes(pd)
    return nodes, edges, pd


def graph_to_json(nodes: List[dict], edges: List[dict]) -> str:
    return json.dumps({"nodes": nodes, "edges": edges})
