"use client";

import { AnimatePresence, motion } from "motion/react";
import type { LinkedListState } from "@/algorithms/core/states";
import type { Item } from "@/algorithms/core/types";
import { cn } from "@/lib/utils";
import { highlightMap } from "./highlight";
import { labelsByNode, nodeBoxStyle } from "./node-style";
import type { RendererProps } from "./types";

/** Horizontal arrow(s) to the next node; drawn in (pathLength 0 → 1) when a node joins. */
function Connector({ doubly, last, hidden, duration }: { doubly: boolean; last: boolean; hidden: boolean; duration: number }) {
  const forward = doubly ? 15 : 22;
  return (
    <svg
      width={last ? 46 : 38}
      height={44}
      viewBox={`0 0 ${last ? 46 : 38} 44`}
      className={cn("shrink-0 overflow-visible transition-opacity", hidden && "opacity-0")}
      aria-hidden
    >
      <motion.path
        d={`M3 ${forward} H32 M27 ${forward - 4} L32 ${forward} L27 ${forward + 4}`}
        className="fill-none stroke-muted-foreground"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration }}
      />
      {doubly && !last && (
        <motion.path
          d="M35 29 H6 M11 25 L6 29 L11 33"
          className="fill-none stroke-muted-foreground/60"
          strokeWidth={1.6}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration }}
        />
      )}
      {last && (
        <text x={40} y={forward} dominantBaseline="central" textAnchor="middle" className="fill-muted-foreground font-mono text-[13px]">
          ∅
        </text>
      )}
    </svg>
  );
}

function insertAt(nodes: Item[], index: number, node: Item): Item[] {
  return [...nodes.slice(0, index), node, ...nodes.slice(index)];
}

/** Nodes in a row with next (and prev) arrows; pointer labels slide between nodes. */
export function LinkedList({ step, duration, compact }: RendererProps<LinkedListState>) {
  const { nodes, doubly, pending, pointers } = step.state;
  const kinds = highlightMap(step.highlights);
  const display = pending ? insertAt(nodes, pending.index, pending.node) : nodes;
  const labels = labelsByNode(pointers);
  const spring = { type: "spring", visualDuration: duration, bounce: 0.2 } as const;

  return (
    <div className="flex h-full w-full items-center overflow-x-auto overflow-y-hidden">
      <div className={cn("mx-auto flex min-w-max items-start px-4", compact ? "py-2" : "pt-20 pb-16")}>
        {display.length === 0 && (
          <div className="flex h-11 items-center gap-2 font-mono text-sm text-muted-foreground">
            head <span className="text-muted-foreground/60">→</span> ∅
          </div>
        )}
        <AnimatePresence initial={false} mode="popLayout">
          {display.map((node, i) => {
            const raised = pending?.node.id === node.id;
            const kind = kinds.get(node.id);
            return (
              <motion.div
                key={node.id}
                layout
                initial={{ opacity: 0, y: -40, scale: 0.8 }}
                animate={{ opacity: 1, y: raised ? -64 : 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.6, y: 24 }}
                transition={spring}
                className="relative flex items-start"
              >
                <div className="relative">
                  <div
                    className={cn(
                      "viz-color flex h-11 items-stretch overflow-hidden rounded-lg border-2 font-mono",
                      raised && "border-dashed",
                    )}
                    style={nodeBoxStyle(kind, duration)}
                  >
                    {doubly && <span className="w-3 border-r border-current/20 bg-muted/40" aria-hidden />}
                    <span className="grid min-w-11 place-items-center px-1.5 text-sm font-semibold">{node.value}</span>
                    <span className="grid w-4 place-items-center border-l border-current/20 bg-muted/40" aria-hidden>
                      <span className="size-1.5 rounded-full bg-muted-foreground" />
                    </span>
                  </div>
                  {!compact && (
                    <div className="absolute top-full left-1/2 mt-1.5 flex -translate-x-1/2 flex-col items-center gap-0.5">
                      {labels.get(node.id)?.map((label) => (
                        <motion.span
                          key={label}
                          layoutId={`ptr-${label}`}
                          transition={spring}
                          className={cn(
                            "rounded px-1 font-mono text-[10px] leading-4 whitespace-nowrap",
                            label === "head" || label === "tail"
                              ? "bg-foreground text-background"
                              : "bg-muted text-foreground/80",
                          )}
                        >
                          {label}
                        </motion.span>
                      ))}
                    </div>
                  )}
                </div>
                <Connector doubly={doubly} last={i === display.length - 1} hidden={raised} duration={duration} />
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
    </div>
  );
}
