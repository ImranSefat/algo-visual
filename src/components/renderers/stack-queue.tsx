"use client";

import { AnimatePresence, motion } from "motion/react";
import type { QueueState, StackState } from "@/algorithms/core/states";
import { cn } from "@/lib/utils";
import { highlightMap } from "./highlight";
import { nodeBoxStyle } from "./node-style";
import type { RendererProps } from "./types";

const GAP = 6;

/** Vertical column, bottom → top. Pushes drop in from above, pops lift out. */
export function Stack({ step, duration, compact }: RendererProps<StackState>) {
  const { items, capacity = 8 } = step.state;
  const kinds = highlightMap(step.highlights);
  const spring = { type: "spring", visualDuration: duration, bounce: 0.2 } as const;
  return (
    <div className="flex h-full w-full items-end justify-center">
      <div className="flex h-full max-h-[440px] items-end gap-3">
        <div
          className={cn(
            "relative flex h-full flex-col-reverse rounded-b-2xl border-2 border-t-0 border-muted-foreground/30",
            compact ? "w-20 p-1" : "w-40 p-2",
          )}
          style={{ gap: GAP }}
        >
          <AnimatePresence initial={false} mode="popLayout">
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                layout
                initial={{ y: -40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -40, opacity: 0 }}
                transition={spring}
                className="viz-color relative grid shrink-0 place-items-center rounded-lg border-2 font-mono font-semibold"
                style={nodeBoxStyle(kinds.get(item.id), duration, {
                  height: `calc((100% - ${(capacity - 1) * GAP}px) / ${capacity})`,
                })}
              >
                {!compact && item.value}
                {i === items.length - 1 && !compact && (
                  <motion.span
                    layoutId="stack-top"
                    transition={spring}
                    className="absolute left-full ml-3 font-mono text-xs whitespace-nowrap text-muted-foreground"
                  >
                    ← top
                  </motion.span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {items.length === 0 && (
            <span className="absolute inset-x-0 bottom-3 text-center font-mono text-xs text-muted-foreground">empty</span>
          )}
        </div>
        {!compact && (
          <span className="mb-1 font-mono text-[10px] text-muted-foreground [writing-mode:vertical-rl]">
            capacity {capacity}
          </span>
        )}
      </div>
    </div>
  );
}

/** Horizontal pipe, front on the left. Enqueues slide in from the right, dequeues leave to the left. */
export function Queue({ step, duration, compact }: RendererProps<QueueState>) {
  const { items } = step.state;
  const kinds = highlightMap(step.highlights);
  const spring = { type: "spring", visualDuration: duration, bounce: 0.2 } as const;
  const small = items.length > 9;
  return (
    <div className="flex h-full w-full items-center overflow-x-auto">
      <div className="mx-auto flex min-w-max items-center gap-3 px-2">
        {!compact && <span className="font-mono text-xs text-muted-foreground">← out</span>}
        <div className={cn("flex min-h-24 min-w-56 items-center gap-2 border-y-2 border-muted-foreground/30 px-3", compact ? "py-2" : "py-8")}>
          <AnimatePresence initial={false} mode="popLayout">
            {items.map((item, i) => (
              <motion.div
                key={item.id}
                layout
                initial={{ x: 48, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -48, opacity: 0 }}
                transition={spring}
                className={cn(
                  "viz-color relative grid shrink-0 place-items-center rounded-lg border-2 font-mono font-semibold",
                  small ? "size-11 text-sm" : "size-14",
                )}
                style={nodeBoxStyle(kinds.get(item.id), duration)}
              >
                {item.value}
                {!compact && i === 0 && (
                  <motion.span layoutId="queue-front" transition={spring} className="absolute top-full mt-2 font-mono text-[10px] text-muted-foreground">
                    front
                  </motion.span>
                )}
                {!compact && i === items.length - 1 && (
                  <motion.span layoutId="queue-rear" transition={spring} className="absolute bottom-full mb-2 font-mono text-[10px] text-muted-foreground">
                    rear
                  </motion.span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
          {items.length === 0 && <span className="w-full text-center font-mono text-xs text-muted-foreground">empty</span>}
        </div>
        {!compact && <span className="font-mono text-xs text-muted-foreground">← in</span>}
      </div>
    </div>
  );
}
