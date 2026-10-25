"use client";

import { forceCenter, forceCollide, forceLink, forceManyBody, forceSimulation, forceX, forceY } from "d3-force";
import { motion } from "motion/react";
import { useMemo } from "react";
import { mulberry32 } from "@/algorithms/core/prng";
import type { GraphEdge, GraphNode, GraphState } from "@/algorithms/core/states";
import { cn } from "@/lib/utils";
import { highlightMap, nodeFill, nodeStroke } from "./highlight";
import type { RendererProps } from "./types";

const R = 19;
const PAD = 44;

type Point = { x: number; y: number };

/**
 * Force-directed positions, computed once per graph (nodes/edges are frozen and shared by every
 * step, so the memo holds for the whole trace). Seeded, synchronous and therefore SSR-stable.
 */
function computeLayout(nodes: readonly GraphNode[], edges: readonly GraphEdge[]) {
  type SimNode = { id: string; x?: number; y?: number };
  const sim: SimNode[] = nodes.map((n) => ({ id: n.id }));
  const links = edges.map((e) => ({ source: e.from, target: e.to }));
  const simulation = forceSimulation(sim)
    .randomSource(mulberry32(7))
    .force("link", forceLink<SimNode, { source: string; target: string }>(links).id((d) => d.id).distance(110).strength(0.7))
    .force("charge", forceManyBody().strength(-520))
    .force("collide", forceCollide(R * 2.4))
    .force("x", forceX(0).strength(0.04))
    .force("y", forceY(0).strength(0.09))
    .force("center", forceCenter(0, 0))
    .stop();
  for (let i = 0; i < 320; i++) simulation.tick();
  const xs = sim.map((n) => n.x ?? 0);
  const ys = sim.map((n) => n.y ?? 0);
  const minX = Math.min(...xs) - PAD;
  const minY = Math.min(...ys) - PAD;
  const width = Math.max(...xs) - minX + PAD;
  const height = Math.max(...ys) - minY + PAD + 14;
  const pos = new Map<string, Point>(sim.map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]));
  return { pos, viewBox: `${minX} ${minY} ${width} ${height}` };
}

/** Pulls the endpoints of a segment in by `r` so arrows stop at the node outline. */
function trim(a: Point, b: Point, r: number): [Point, Point] {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  return [
    { x: a.x + ux * r, y: a.y + uy * r },
    { x: b.x - ux * r, y: b.y - uy * r },
  ];
}

function edgeClass(kind: string | undefined) {
  switch (kind) {
    case "path":
      return "stroke-viz-path";
    case "compare":
      return "stroke-viz-compare";
    case "delete":
      return "stroke-viz-delete";
    case "visited":
      return "stroke-viz-visited";
    case "frontier":
      return "stroke-viz-frontier";
    default:
      return "stroke-border";
  }
}

export function NodeGraph({ step, duration, compact }: RendererProps<GraphState>) {
  const { nodes, edges, nodeNotes, table, output } = step.state;
  const kinds = highlightMap(step.highlights);
  const { pos, viewBox } = useMemo(() => computeLayout(nodes, edges), [nodes, edges]);
  const side = !compact && (table || output);

  return (
    <div className={cn("flex h-full w-full gap-4", side && "flex-col @lg:flex-row")}>
      <div className="min-h-0 min-w-0 flex-1">
        <svg viewBox={viewBox} className="h-full w-full" role="img" aria-label="Graph">
          {edges.map((e) => {
            const a = pos.get(e.from)!;
            const b = pos.get(e.to)!;
            const kind = kinds.get(e.id);
            const [p, q] = trim(a, b, R + (e.directed ? 3 : 0));
            const angle = Math.atan2(q.y - p.y, q.x - p.x);
            const head = 9;
            const thick = kind === "path" || kind === "compare";
            return (
              <g key={e.id}>
                <line
                  x1={p.x}
                  y1={p.y}
                  x2={q.x}
                  y2={q.y}
                  className={cn("viz-color", edgeClass(kind))}
                  strokeWidth={thick ? 4 : 2}
                  strokeDasharray={kind === "delete" ? "6 5" : undefined}
                  strokeLinecap="round"
                  style={{ transitionDuration: `${duration}s` }}
                />
                {e.directed && (
                  <path
                    d={`M${q.x} ${q.y} L${q.x - head * Math.cos(angle - 0.45)} ${q.y - head * Math.sin(angle - 0.45)} L${q.x - head * Math.cos(angle + 0.45)} ${q.y - head * Math.sin(angle + 0.45)} Z`}
                    className={cn("viz-color", edgeClass(kind).replace("stroke-", "fill-"))}
                    style={{ transitionDuration: `${duration}s` }}
                  />
                )}
                {e.weight !== undefined && !compact && (
                  <g transform={`translate(${(a.x + b.x) / 2} ${(a.y + b.y) / 2})`}>
                    <rect x={-11} y={-9} width={22} height={18} rx={5} className="fill-card stroke-border" strokeWidth={1} />
                    <text textAnchor="middle" dominantBaseline="central" className="fill-foreground font-mono text-[11px] font-medium">
                      {e.weight}
                    </text>
                  </g>
                )}
              </g>
            );
          })}
          {nodes.map((n) => {
            const p = pos.get(n.id)!;
            const kind = kinds.get(n.id);
            const note = nodeNotes?.[n.id];
            return (
              <g key={n.id} transform={`translate(${p.x} ${p.y})`}>
                {kind === "current" && <circle r={R} className="viz-pulse fill-viz-current" />}
                <motion.circle
                  r={R}
                  className="viz-color"
                  initial={false}
                  animate={{ scale: kind === "current" ? 1.12 : 1 }}
                  transition={{ type: "spring", visualDuration: duration, bounce: 0.4 }}
                  style={{ fill: nodeFill(kind), stroke: nodeStroke(kind), transitionDuration: `${duration}s` }}
                  strokeWidth={2.5}
                />
                <text textAnchor="middle" dominantBaseline="central" className="fill-foreground font-mono text-[14px] font-semibold">
                  {n.label}
                </text>
                {note !== undefined && !compact && (
                  <text y={R + 14} textAnchor="middle" className="fill-muted-foreground font-mono text-[11px]">
                    {note}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
      {side && (
        <aside className="flex max-h-40 shrink-0 gap-3 overflow-auto text-xs @lg:max-h-none @lg:w-52 @lg:flex-col">
          {table && (
            <div className="min-w-0 flex-1 overflow-hidden rounded-xl border @lg:flex-none">
              <div className="border-b bg-muted/50 px-3 py-1.5 font-medium text-muted-foreground">{table.title}</div>
              <div className="max-h-28 overflow-auto @lg:max-h-72">
                <table className="w-full font-mono">
                  <thead>
                    <tr className="text-muted-foreground">
                      {table.columns.map((c) => (
                        <th key={c} className="px-2.5 py-1 text-left font-normal">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {table.rows.map((row, i) => (
                      <tr key={i} className="border-t border-border/60">
                        {row.map((cell, j) => (
                          <td key={j} className="px-2.5 py-1 tabular-nums">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {output && (
            <div className="min-w-0 flex-1 rounded-xl border p-3 @lg:flex-none">
              <div className="mb-2 font-medium text-muted-foreground">{output.title}</div>
              <ol className="flex flex-wrap gap-1.5 font-mono">
                {output.items.length === 0 && <li className="text-muted-foreground">none yet</li>}
                {output.items.map((item, i) => (
                  <motion.li
                    key={`${i}-${item}`}
                    initial={{ opacity: 0, scale: 0.7 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration }}
                    className="rounded-md bg-muted px-2 py-0.5"
                  >
                    {item}
                  </motion.li>
                ))}
              </ol>
            </div>
          )}
        </aside>
      )}
    </div>
  );
}
