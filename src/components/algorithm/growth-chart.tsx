"use client";

import { scaleLinear } from "d3-scale";
import { curveMonotoneX, line } from "d3-shape";
import { useEffect, useRef, useState } from "react";
import type { Distribution } from "@/algorithms/core/input";
import type { AlgorithmMeta } from "@/algorithms/core/types";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ANIMATION_MAX_SIZE, GROWTH_DISTRIBUTIONS, type GrowthData } from "@/lib/growth";

const LABELS: Record<Distribution, string> = {
  random: "Random",
  "nearly-sorted": "Nearly sorted",
  reversed: "Reversed",
  "few-unique": "Few unique",
  custom: "Custom",
};

const COLORS: Record<Distribution, string> = {
  random: "var(--viz-current)",
  "nearly-sorted": "var(--viz-compare)",
  reversed: "var(--viz-swap)",
  "few-unique": "var(--viz-pivot)",
  custom: "var(--viz-default)",
};

/** Theoretical shapes a measured line can be compared with, keyed by the `complexity.time.average` text. */
const REFERENCES: Record<string, { label: string; f: (n: number) => number }> = {
  "O(n)": { label: "n", f: (n) => n },
  "O(n log n)": { label: "n log n", f: (n) => n * Math.log2(n) },
  "O(n²)": { label: "n²", f: (n) => n * n },
};

const HEIGHT = 220;
const MARGIN = { top: 12, right: 52, bottom: 34, left: 48 };

function capitalise(name: string): string {
  return name.charAt(0).toUpperCase() + name.slice(1);
}

function formatCount(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function formatTick(value: number): string {
  return value >= 1000 ? `${value / 1000}k` : String(value);
}

function useWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

/** How the cost of an algorithm grows with the array size, one line per kind of input. */
export function GrowthChart({ meta, data }: { meta: AlgorithmMeta; data: GrowthData }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [wrapRef, width] = useWidth();

  const counters = Object.keys(data.series.random ?? {});
  const counter = selected && counters.includes(selected) ? selected : counters[0];

  return (
    <section className="rounded-2xl border bg-card p-4 sm:p-5">
      <header className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">Growth by input size</h2>
        {counters.length > 1 && (
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            spacing={0}
            value={counter}
            onValueChange={(value) => value && setSelected(value)}
            aria-label="Counter"
          >
            {counters.map((name) => (
              <ToggleGroupItem key={name} value={name} className="text-xs">
                {capitalise(name)}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </header>
      <div ref={wrapRef} className="w-full">
        {counter && width > 0 ? <Chart data={data} counter={counter} meta={meta} width={width} /> : <div style={{ height: HEIGHT }} />}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Averaged over seeded runs for each size. Random, Nearly sorted and Reversed use distinct values (the site&apos;s own inputs pick values from 5 to 99, so they repeat even in small arrays), so the curves follow the textbook cases. Sizes above {ANIMATION_MAX_SIZE} are only for this chart; the animation stops at {ANIMATION_MAX_SIZE}.
      </p>
    </section>
  );
}

function Chart({ data, counter, meta, width }: { data: GrowthData; counter: string; meta: AlgorithmMeta; width: number }) {
  const { sizes } = data;
  const last = sizes.length - 1;
  const [hover, setHover] = useState<number | null>(null);
  const active = Math.min(hover ?? last, last);
  const lines = GROWTH_DISTRIBUTIONS.flatMap((distribution) => {
    const values = data.series[distribution]?.[counter];
    return values ? [{ distribution, values }] : [];
  });

  // Only the comparisons line is compared with a theoretical curve, scaled to meet the Random line at the latest size.
  const reference = counter === "comparisons" ? REFERENCES[meta.complexity.time.average] : undefined;
  const randomValues = data.series.random?.[counter];
  const referenceValues =
    reference && randomValues
      ? sizes.map((n) => (randomValues[last] * reference.f(n)) / reference.f(sizes[last]))
      : undefined;

  const peak = Math.max(...lines.flatMap((l) => l.values), ...(referenceValues ?? []));
  const x = scaleLinear()
    .domain([sizes[0], sizes[sizes.length - 1]])
    .range([MARGIN.left, width - MARGIN.right]);
  const y = scaleLinear()
    .domain([0, peak])
    .nice()
    .range([HEIGHT - MARGIN.bottom, MARGIN.top]);
  const path = line<number>()
    .x((_, i) => x(sizes[i]))
    .y((value) => y(value))
    .curve(curveMonotoneX);
  const xTicks = width < 480 ? sizes.filter((n) => [10, 100, 200, 300].includes(n)) : sizes;
  const name = counter.toLowerCase();

  // End-of-line value labels, nudged apart so close values stay readable.
  const endLabels = new Map<Distribution, number>();
  let previous = -Infinity;
  for (const { distribution, values } of [...lines].sort((a, b) => b.values[last] - a.values[last])) {
    previous = Math.max(y(values[last]), previous + 13);
    endLabels.set(distribution, previous);
  }

  function track(clientX: number, svg: SVGSVGElement) {
    const px = clientX - svg.getBoundingClientRect().left;
    const size = x.invert(px);
    let nearest = 0;
    for (let i = 1; i <= last; i++) if (Math.abs(sizes[i] - size) < Math.abs(sizes[nearest] - size)) nearest = i;
    setHover(nearest);
  }

  return (
    <>
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={`${capitalise(counter)} against array size`}
        onPointerDown={(event) => track(event.clientX, event.currentTarget)}
        onPointerMove={(event) => track(event.clientX, event.currentTarget)}
        onPointerLeave={(event) => {
          // A finger lifting also fires "leave"; keep the touched point readable until the next touch.
          if (event.pointerType === "mouse") setHover(null);
        }}
        className="touch-pan-y"
      >
        {y.ticks(4).map((tick) => (
          <g key={tick}>
            <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} className="stroke-border" />
            <text x={MARGIN.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-muted-foreground text-[11px]">
              {formatTick(tick)}
            </text>
          </g>
        ))}
        {xTicks.map((tick) => (
          <text
            key={tick}
            x={x(tick)}
            y={HEIGHT - MARGIN.bottom + 18}
            textAnchor="middle"
            className="fill-muted-foreground text-[11px]"
          >
            {tick}
          </text>
        ))}
        <text
          x={(MARGIN.left + width - MARGIN.right) / 2}
          y={HEIGHT - 4}
          textAnchor="middle"
          className="fill-muted-foreground text-[11px]"
        >
          Array size (n)
        </text>
        {hover !== null && (
          <line
            x1={x(sizes[active])}
            x2={x(sizes[active])}
            y1={MARGIN.top}
            y2={HEIGHT - MARGIN.bottom}
            className="stroke-foreground/30"
            strokeDasharray="3 3"
          />
        )}
        {referenceValues && (
          <path d={path(referenceValues) ?? ""} fill="none" stroke="var(--viz-default)" strokeWidth={1.5} strokeDasharray="4 4" />
        )}
        {lines.map(({ distribution, values }) => (
          <g key={distribution}>
            <path d={path(values) ?? ""} fill="none" stroke={COLORS[distribution]} strokeWidth={2.5} strokeLinecap="round" />
            {values.map((value, j) => (
              <circle
                key={sizes[j]}
                cx={x(sizes[j])}
                cy={y(value)}
                r={hover === j ? 5 : 3.5}
                fill={COLORS[distribution]}
                pointerEvents="none"
              />
            ))}
            <text
              x={x(sizes[last]) + 9}
              y={endLabels.get(distribution)}
              dy="0.32em"
              className="fill-foreground text-[11px] font-medium tabular-nums"
            >
              {formatCount(values[last])}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-1 grid grid-cols-1 gap-y-1.5 text-xs sm:flex sm:flex-wrap sm:items-center sm:gap-x-4 sm:gap-y-1" aria-live="off">
        <span className="font-mono text-muted-foreground">n = {sizes[active]}</span>
        {lines.map(({ distribution, values }) => (
          <span key={distribution} className="flex items-center gap-1.5 text-foreground/80">
            <span className="h-0.5 w-4 shrink-0 rounded-full" style={{ backgroundColor: COLORS[distribution] }} />
            <span className="whitespace-nowrap">{LABELS[distribution]}</span>
            <span className="ml-auto font-mono font-medium text-foreground tabular-nums sm:ml-0">{formatCount(values[active])}</span>
          </span>
        ))}
        {reference && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-4 shrink-0 border-t-2 border-dashed" style={{ borderColor: "var(--viz-default)" }} />
            {reference.label} (scaled to Random)
          </span>
        )}
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-muted-foreground select-none">Show data</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-right font-mono text-[11px] tabular-nums sm:text-xs">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 pr-2 text-left align-bottom font-normal">n</th>
                {lines.map(({ distribution }) => (
                  <th key={distribution} className="px-1 py-1 align-bottom font-sans font-normal sm:px-2">
                    {LABELS[distribution]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sizes.map((size, i) => (
                <tr key={size} className="border-t">
                  <td className="py-1 pr-2 text-left">{size}</td>
                  {lines.map(({ distribution, values }) => (
                    <td key={distribution} className="px-1 py-1 sm:px-2">
                      {formatCount(values[i])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-1 font-sans text-muted-foreground">Average {name} per run.</p>
        </div>
      </details>
    </>
  );
}
