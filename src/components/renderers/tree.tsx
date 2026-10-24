"use client";

import { hierarchy, tree as d3tree } from "d3-hierarchy";
import { AnimatePresence, motion } from "motion/react";
import type { TreeNode, TreeState } from "@/algorithms/core/states";
import { highlightMap, nodeFill, nodeStroke } from "./highlight";
import type { RendererProps } from "./types";

const R = 18;
const DX = 48;
const DY = 66;
const PAD = 40;
const MIN_W = 380;
const MIN_H = 220;

type Datum = { id: string | null; children?: Datum[] };
type Placed = { id: string; x: number; y: number; parent: string | null; node: TreeNode };

/**
 * Tidy-tree coordinates from d3-hierarchy, recomputed every step. Binary trees keep an invisible
 * placeholder for a missing child so a lone right child is still drawn to the right.
 */
function layout(state: TreeState) {
  if (!state.root) return { placed: [] as Placed[], viewBox: `${-MIN_W / 2} ${-PAD} ${MIN_W} ${MIN_H}` };
  const build = (id: string): Datum => {
    const n = state.nodes[id];
    const kids = state.binary
      ? n.children.some(Boolean)
        ? n.children.map((c) => (c ? build(c) : { id: null }))
        : []
      : n.children.filter((c): c is string => c !== null).map(build);
    return kids.length ? { id, children: kids } : { id };
  };
  const root = hierarchy(build(state.root));
  d3tree<Datum>()
    .nodeSize([DX, DY])
    .separation((a, b) => (a.parent === b.parent ? 1 : 1.25))(root);
  const placed: Placed[] = [];
  for (const d of root.descendants()) {
    if (!d.data.id) continue;
    placed.push({ id: d.data.id, x: d.x ?? 0, y: d.y ?? 0, parent: d.parent?.data.id ?? null, node: state.nodes[d.data.id] });
  }
  const xs = placed.map((p) => p.x);
  const minX = Math.min(...xs) - PAD;
  const maxX = Math.max(...xs) + PAD;
  const maxY = Math.max(...placed.map((p) => p.y)) + PAD + 12;
  const width = Math.max(MIN_W, maxX - minX);
  const height = Math.max(MIN_H, maxY + PAD);
  const cx = (minX + maxX) / 2;
  return { placed, viewBox: `${cx - width / 2} ${-PAD - 12} ${width} ${height}` };
}

/** BST / AVL / trie. Nodes and edges are keyed by id, so rotations and re-links glide. */
export function Tree({ step, duration, compact }: RendererProps<TreeState>) {
  const state = step.state;
  const kinds = highlightMap(step.highlights);
  const { placed, viewBox } = layout(state);
  const pos = new Map(placed.map((p) => [p.id, p]));
  const spring = { type: "spring", visualDuration: duration, bounce: 0.15 } as const;
  const probeAt = state.probe ? (state.probe.at ? pos.get(state.probe.at) : undefined) : undefined;
  const probeX = probeAt ? probeAt.x - R - 6 : 0;
  const probeY = probeAt ? probeAt.y - R - 6 : -PAD + 4;

  return (
    <motion.svg
      className="h-full w-full"
      viewBox={viewBox}
      initial={false}
      animate={{ viewBox }}
      transition={spring}
      role="img"
      aria-label="Tree"
    >
      <AnimatePresence initial={false}>
        {placed.map((p) => {
          if (!p.parent) return null;
          const parent = pos.get(p.parent)!;
          return (
            <motion.line
              key={`edge-${p.id}`}
              className="stroke-border"
              strokeWidth={1.6}
              vectorEffect="non-scaling-stroke"
              initial={{ x1: parent.x, y1: parent.y, x2: parent.x, y2: parent.y, opacity: 0 }}
              animate={{ x1: parent.x, y1: parent.y, x2: p.x, y2: p.y, opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={spring}
            />
          );
        })}
      </AnimatePresence>

      {state.edgeLabels &&
        placed.map((p) => {
          if (!p.parent) return null;
          const parent = pos.get(p.parent)!;
          return (
            <motion.text
              key={`label-${p.id}`}
              initial={false}
              animate={{ x: (parent.x + p.x) / 2 - 8, y: (parent.y + p.y) / 2 }}
              transition={spring}
              className="fill-muted-foreground font-mono text-[11px]"
              textAnchor="middle"
            >
              {p.node.label}
            </motion.text>
          );
        })}

      <AnimatePresence initial={false}>
        {placed.map((p) => {
          const kind = kinds.get(p.id);
          const label = p.node.label;
          return (
            <motion.g
              key={p.id}
              initial={{ x: p.x, y: p.y, scale: 0, opacity: 0 }}
              animate={{ x: p.x, y: p.y, scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={spring}
            >
              {p.node.terminal && (
                <circle r={R + 4} className="fill-none viz-color" style={{ stroke: nodeStroke(kind), transitionDuration: `${duration}s` }} strokeWidth={1.4} />
              )}
              <circle
                r={R}
                className="viz-color"
                style={{ fill: nodeFill(kind), stroke: nodeStroke(kind), transitionDuration: `${duration}s` }}
                strokeWidth={2}
              />
              {label ? (
                <text textAnchor="middle" dominantBaseline="central" className="fill-foreground font-mono text-[13px] font-semibold">
                  {label}
                </text>
              ) : (
                <circle r={3} className="fill-muted-foreground" />
              )}
              {p.node.badge && !compact && (
                <text x={R + 3} y={-R + 2} className="fill-muted-foreground font-mono text-[10px]">
                  {p.node.badge}
                </text>
              )}
            </motion.g>
          );
        })}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {state.probe && !compact && (
          <motion.g
            key="probe"
            initial={{ x: probeX, y: probeY, opacity: 0 }}
            animate={{ x: probeX, y: probeY, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={spring}
          >
            <rect
              x={-(state.probe.label.length * 7.6 + 14)}
              y={-11}
              width={state.probe.label.length * 7.6 + 14}
              height={22}
              rx={6}
              className="fill-foreground"
            />
            <text
              x={-(state.probe.label.length * 7.6 + 14) / 2}
              textAnchor="middle"
              dominantBaseline="central"
              className="fill-background font-mono text-[12px] font-semibold"
            >
              {state.probe.label}
            </text>
          </motion.g>
        )}
      </AnimatePresence>
    </motion.svg>
  );
}
