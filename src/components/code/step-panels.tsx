"use client";

import { AnimatePresence, motion } from "motion/react";
import type { ReactNode } from "react";
import type { HighlightKind } from "@/algorithms/core/types";
import { vizColor } from "@/components/renderers/highlight";
import { useCurrentStep } from "@/components/visualizer/context";
import { cn } from "@/lib/utils";
import { usePlayback, useStepDuration } from "@/store/playback";

function Panel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-2xl border bg-card p-3", className)}>
      <h2 className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">{title}</h2>
      {children}
    </section>
  );
}

function formatValue(value: string | number | boolean): string {
  if (typeof value === "number" && !Number.isInteger(value)) return value.toFixed(2);
  return String(value);
}

/** `name = value` chips; a chip remounts (and pulses) whenever its value changes. */
export function VariablesPanel() {
  const { vars, state } = useCurrentStep();
  const duration = useStepDuration();
  const entries = Object.entries(vars);
  // Pointer colours (if the algorithm defines any) so a chip matches its label under the bars.
  const raw = state as unknown;
  const kinds =
    typeof raw === "object" && raw !== null && "pointerKinds" in raw
      ? (raw.pointerKinds as Record<string, HighlightKind> | undefined)
      : undefined;
  return (
    <Panel title="Variables">
      <div className="flex min-h-7 flex-wrap gap-1.5">
        {entries.length === 0 && <span className="text-xs text-muted-foreground">none</span>}
        {entries.map(([name, value]) => {
          const kind = kinds?.[name];
          const color = kind ? vizColor(kind) : undefined;
          return (
            <motion.span
              key={`${name}=${String(value)}`}
              style={
                color
                  ? { borderColor: color, backgroundColor: `color-mix(in oklch, ${color} 22%, transparent)` }
                  : undefined
              }
              initial={{ scale: 1.2 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", visualDuration: duration, bounce: 0.4 }}
              className="inline-flex h-7 items-center rounded-lg border bg-muted/60 px-2 font-mono text-xs"
            >
              <span className="text-muted-foreground">{name}</span>
              <span className="mx-1.5 text-muted-foreground/60">=</span>
              <span className="font-medium">{formatValue(value)}</span>
            </motion.span>
          );
        })}
      </div>
    </Panel>
  );
}

function humanize(name: string): string {
  return name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase();
}

export function CountersPanel({ className }: { className?: string }) {
  const { counters } = useCurrentStep();
  if (!counters) return null;
  return (
    <Panel title="Counters" className={className}>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-2 xl:grid-cols-3">
        {Object.entries(counters).map(([name, value]) => (
          <div key={name} className="rounded-xl bg-muted/50 px-3 py-2">
            <dt className="text-[11px] text-muted-foreground capitalize">{humanize(name)}</dt>
            <dd className="font-mono text-lg font-semibold tabular-nums">{value}</dd>
          </div>
        ))}
      </dl>
    </Panel>
  );
}

/** Plain-English explanation of the current step, cross-faded. */
export function StepNote({ className }: { className?: string }) {
  const { note } = useCurrentStep();
  const duration = useStepDuration();
  const playing = usePlayback((s) => s.playing);
  return (
    <div aria-live={playing ? "off" : "polite"} className={cn("relative min-h-6 text-sm", className)}>
      <AnimatePresence mode="wait" initial={false}>
        <motion.p
          key={note}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: duration / 2 }}
        >
          {note}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}
