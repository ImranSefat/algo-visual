"use client";

import { CheckCircle2 } from "lucide-react";
import { LayoutGroup } from "motion/react";
import Link from "next/link";
import { categories } from "@/algorithms/categories";
import { algorithmHref, algorithmList, getAlgorithm } from "@/algorithms/registry";
import { StepNote } from "@/components/code/step-panels";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Canvas } from "@/components/visualizer/canvas";
import { AlgorithmContext, TraceContext, useCurrentStep } from "@/components/visualizer/context";
import { usePlayback } from "@/store/playback";
import { useCompare, type Side } from "./compare-store";

function PaneStatus({ total }: { total: number }) {
  const step = useCurrentStep();
  const index = usePlayback((s) => s.index);
  const done = index >= total - 1;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 font-mono text-xs text-muted-foreground">
      {done ? (
        <span className="inline-flex items-center gap-1 text-foreground">
          <CheckCircle2 className="size-3.5 text-viz-sorted" /> finished in {total} steps
        </span>
      ) : (
        <span>
          step {Math.min(index, total - 1) + 1} / {total}
        </span>
      )}
      {Object.entries(step.counters ?? {}).map(([name, value]) => (
        <span key={name}>
          {name.replace(/([a-z])([A-Z])/g, "$1 $2").toLowerCase()} <span className="text-foreground tabular-nums">{value}</span>
        </span>
      ))}
    </div>
  );
}

/** One side of the comparison: its own algorithm and trace, the shared clock. */
export function ComparePane({ side }: { side: Side }) {
  const slug = useCompare((s) => s[side]);
  const trace = useCompare((s) => s.traces[side]);
  const select = useCompare((s) => s.select);
  const algo = getAlgorithm(slug)!;

  return (
    <AlgorithmContext.Provider value={algo}>
      <TraceContext.Provider value={trace}>
        <LayoutGroup id={`compare-${side}`}>
          <section className="flex min-w-0 flex-col gap-3 rounded-2xl border bg-card p-4">
            <header className="flex flex-wrap items-center justify-between gap-2">
              <Select value={slug} onValueChange={(v) => select(side, v)}>
                <SelectTrigger className="w-56 font-medium" aria-label={`Algorithm ${side.toUpperCase()}`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectGroup key={c.id}>
                      <SelectLabel>{c.name}</SelectLabel>
                      {algorithmList
                        .filter((m) => m.category === c.id)
                        .map((m) => (
                          <SelectItem key={m.slug} value={m.slug}>
                            {m.name}
                          </SelectItem>
                        ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
                <span>
                  avg <span className="text-foreground">{algo.meta.complexity.time.average}</span>
                </span>
                <Link href={algorithmHref(algo.meta)} className="underline-offset-4 hover:text-foreground hover:underline">
                  code →
                </Link>
              </div>
            </header>
            <Canvas className="h-[clamp(220px,40vh,420px)]" dense />
            <StepNote className="min-h-10" />
            <PaneStatus total={trace.length} />
          </section>
        </LayoutGroup>
      </TraceContext.Provider>
    </AlgorithmContext.Provider>
  );
}
