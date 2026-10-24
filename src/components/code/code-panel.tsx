"use client";

import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useCurrentStep } from "@/components/visualizer/context";
import { cn } from "@/lib/utils";
import { useStepDuration } from "@/store/playback";

/** Code metrics shared with the `.code-block` CSS: every line is exactly LINE_HEIGHT px (no wrapping). */
const LINE_HEIGHT = 22;
const PADDING = 12;

type View = "code" | "pseudo";

export function CodePanel({ code, pseudo, className }: { code: ReactNode; pseudo?: ReactNode; className?: string }) {
  const step = useCurrentStep();
  const duration = useStepDuration();
  const reduceMotion = useReducedMotion();
  const [view, setView] = useState<View>("code");
  const scrollRef = useRef<HTMLDivElement>(null);

  const [from, to] = Array.isArray(step.line) ? step.line : [step.line, step.line];
  const top = PADDING + (from - 1) * LINE_HEIGHT;
  const height = (to - from + 1) * LINE_HEIGHT;

  // Keep the active line in view, but only scroll when it has left the viewport.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || (top >= el.scrollTop && top + height <= el.scrollTop + el.clientHeight)) return;
    el.scrollTo({ top: top + height / 2 - el.clientHeight / 2, behavior: reduceMotion ? "auto" : "smooth" });
  }, [top, height, reduceMotion]);

  return (
    <section className={cn("flex min-h-0 flex-col overflow-hidden rounded-2xl border bg-card", className)}>
      <header className="flex h-11 shrink-0 items-center justify-between gap-2 border-b px-3">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Code</h2>
        {pseudo && (
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            spacing={0}
            value={view}
            onValueChange={(v) => v && setView(v as View)}
            aria-label="Code view"
          >
            <ToggleGroupItem value="code" className="text-xs">
              TypeScript
            </ToggleGroupItem>
            <ToggleGroupItem value="pseudo" className="text-xs">
              Pseudocode
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </header>
      <div
        ref={scrollRef}
        className="relative min-h-0 flex-1 overflow-auto"
        style={{ "--code-lh": `${LINE_HEIGHT}px`, "--code-pad": `${PADDING}px` } as CSSProperties}
      >
        <div className="relative min-w-max">
          <motion.div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 border-l-2"
            style={{ background: "var(--code-highlight)", borderColor: "var(--code-highlight-edge)" }}
            initial={false}
            animate={{ top, height }}
            transition={{ type: "spring", visualDuration: duration, bounce: 0.15 }}
          />
          <div className={cn("relative", view !== "code" && "hidden")}>{code}</div>
          {pseudo && <div className={cn("relative", view !== "pseudo" && "hidden")}>{pseudo}</div>}
        </div>
      </div>
    </section>
  );
}
