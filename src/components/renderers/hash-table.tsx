"use client";

import { AnimatePresence, motion } from "motion/react";
import { bucketId, type HashTableState } from "@/algorithms/core/states";
import { cn } from "@/lib/utils";
import { highlightMap } from "./highlight";
import { nodeBoxStyle } from "./node-style";
import type { RendererProps } from "./types";

/**
 * Buckets as columns with their chains underneath. A key first appears in the staging slot
 * with its hash, then flies into its bucket (shared layoutId).
 */
export function HashTable({ step, duration, compact }: RendererProps<HashTableState>) {
  const { buckets, incoming } = step.state;
  const kinds = highlightMap(step.highlights);
  const m = buckets.length;
  const spring = { type: "spring", visualDuration: duration, bounce: 0.2 } as const;

  return (
    <div className="flex h-full w-full flex-col gap-3">
      {!compact && (
        <div className="flex h-14 shrink-0 items-center justify-center gap-4">
          <AnimatePresence initial={false} mode="popLayout">
            {incoming ? (
              <motion.div
                key={incoming.item.id}
                className="flex items-center gap-4"
                initial={{ opacity: 0, y: -12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={spring}
              >
                <motion.div
                  layoutId={incoming.item.id}
                  transition={spring}
                  className="viz-color grid h-10 min-w-12 place-items-center rounded-lg border-2 px-2 font-mono font-semibold"
                  style={nodeBoxStyle(kinds.get(incoming.item.id), duration)}
                >
                  {incoming.item.value}
                </motion.div>
                <span className="font-mono text-sm text-muted-foreground">
                  hash({incoming.item.value}) = {incoming.item.value} mod {m} ={" "}
                  <span className="font-semibold text-foreground">{incoming.hash ?? "?"}</span>
                </span>
              </motion.div>
            ) : (
              <motion.span key="idle" className="font-mono text-xs text-muted-foreground" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                h(k) = k mod {m}
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      )}
      <div className="grid min-h-0 flex-1 gap-2" style={{ gridTemplateColumns: `repeat(${m}, minmax(0, 1fr))` }}>
        {buckets.map((chain, h) => (
          <div key={h} className="flex min-w-0 flex-col items-center">
            <div
              className="viz-color grid h-9 w-full place-items-center rounded-md border-2 font-mono text-xs font-medium"
              style={nodeBoxStyle(kinds.get(bucketId(h)), duration)}
            >
              {h}
            </div>
            <div className={cn("w-px bg-border", chain.length ? "h-3" : "h-0")} />
            <div className="flex w-full flex-col items-center gap-1.5">
              <AnimatePresence initial={false} mode="popLayout">
                {chain.map((item) => (
                  <motion.div
                    key={item.id}
                    layout
                    layoutId={item.id}
                    exit={{ opacity: 0, scale: 0.6 }}
                    transition={spring}
                    className="viz-color grid h-9 w-full max-w-16 place-items-center rounded-lg border-2 font-mono text-sm font-semibold"
                    style={nodeBoxStyle(kinds.get(item.id), duration)}
                  >
                    {item.value}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
