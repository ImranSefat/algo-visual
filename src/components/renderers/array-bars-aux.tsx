"use client";

import { countId, type AuxState } from "@/algorithms/core/states";
import { cn } from "@/lib/utils";
import { BarRow, LABEL_LIMIT, maxValue, PointerRow } from "./array-bars";
import { highlightMap, vizColor, type HighlightMap } from "./highlight";
import type { RendererProps } from "./types";

function RowLabel({ children }: { children: string }) {
  return <span className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">{children}</span>;
}

/** Tally histogram (counting / radix sort). Heights ease with CSS as counts change. */
function CountsRow({
  counts,
  base,
  kinds,
  duration,
  compact,
}: {
  counts: number[];
  base: number;
  kinds: HighlightMap;
  duration: number;
  compact?: boolean;
}) {
  const k = counts.length;
  const max = Math.max(1, ...counts);
  const showCounts = !compact && k <= 32;
  const showKeys = !compact && k <= 16;
  return (
    <div className="flex h-full w-full items-end" style={{ gap: k > 40 ? 1 : 3 }}>
      {counts.map((c, i) => (
        <div key={i} className="flex h-full min-w-0 flex-1 flex-col text-center font-mono text-[10px] leading-4">
          {showCounts && <span className="text-foreground/80 tabular-nums">{c}</span>}
          <div className="relative min-h-0 flex-1">
            <div
              className="viz-size absolute inset-x-0 bottom-0 rounded-t-[2px]"
              style={{
                height: `${(c / max) * 100}%`,
                minHeight: 2,
                backgroundColor: vizColor(kinds.get(countId(i)) ?? "range"),
                transitionDuration: `${duration}s`,
              }}
            />
          </div>
          {showKeys && <span className="text-muted-foreground">{base + i}</span>}
        </div>
      ))}
    </div>
  );
}

/** Main array + auxiliary buffer (+ optional tally). Items fly between rows via shared layoutId. */
export function ArrayBarsAux({ step, duration, compact }: RendererProps<AuxState>) {
  const { main, aux, auxLabel, counts, countsBase = 0, countsLabel, pointers, auxPointers } = step.state;
  const kinds = highlightMap(step.highlights);
  const max = Math.max(maxValue(main), maxValue(aux));
  const labels = !compact && main.length <= LABEL_LIMIT;
  return (
    <div className="flex h-full w-full flex-col gap-1">
      {!compact && <RowLabel>main</RowLabel>}
      <BarRow className="min-h-0 flex-1" slots={main} max={max} kinds={kinds} duration={duration} labels={labels} />
      {pointers && !compact && <PointerRow pointers={pointers} n={main.length} duration={duration} />}
      {!compact && <RowLabel>{auxLabel ?? "aux"}</RowLabel>}
      <BarRow className={cn("min-h-0 flex-1", compact && "mt-1")} slots={aux} max={max} kinds={kinds} duration={duration} labels={labels} />
      {auxPointers && !compact && <PointerRow pointers={auxPointers} n={aux.length} duration={duration} />}
      {counts && (
        <>
          {!compact && <RowLabel>{countsLabel ?? "count"}</RowLabel>}
          <div className={compact ? "h-6" : "h-20"}>
            <CountsRow counts={counts} base={countsBase} kinds={kinds} duration={duration} compact={compact} />
          </div>
        </>
      )}
    </div>
  );
}
