"use client";

import { scaleLinear } from "d3-scale";
import { curveMonotoneX, line } from "d3-shape";
import { useEffect, useRef, useState } from "react";
import type { Distribution } from "@/algorithms/core/input";
import type { AlgorithmMeta } from "@/algorithms/core/types";
import { getAlgorithm } from "@/algorithms/registry";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { ANIMATION_MAX_SIZE, GROWTH_DISTRIBUTIONS, measureGrowth, type GrowthData } from "@/lib/growth";

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

/** Measuring takes a moment, so each algorithm is measured once per page load. */
const cache = new Map<string, GrowthData>();

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
export function GrowthChart({ meta }: { meta: AlgorithmMeta }) {
  const [data, setData] = useState<GrowthData | null>(() => cache.get(meta.slug) ?? null);
  const [selected, setSelected] = useState<string | null>(null);
  const [wrapRef, width] = useWidth();

  useEffect(() => {
    if (cache.has(meta.slug)) return;
    const algo = getAlgorithm(meta.slug);
    if (!algo || algo.meta.defaultInput.kind !== "array") return;
    let cancelled = false;
    measureGrowth(algo, () => cancelled, setData).then((result) => {
      if (result) cache.set(meta.slug, result);
    });
    return () => {
      cancelled = true;
    };
  }, [meta.slug]);

  const counters = data ? Object.keys(data.series.random ?? {}) : [];
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
        {data && counter && data.done >= 2 && width > 0 ? (
          <Chart data={data} counter={counter} meta={meta} width={width} />
        ) : (
          <div className="flex items-center justify-center text-sm text-muted-foreground" style={{ height: HEIGHT }}>
            Measuring…
          </div>
        )}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Averaged over seeded runs for each size, on the same kinds of input as the Distribution control. Sizes above {ANIMATION_MAX_SIZE} are only for this chart; the animation stops at {ANIMATION_MAX_SIZE}.
      </p>
    </section>
  );
}

function Chart({ data, counter, meta, width }: { data: GrowthData; counter: string; meta: AlgorithmMeta; width: number }) {
  const { sizes } = data;
  const last = data.done - 1;
  const [hover, setHover] = useState<number | null>(null);
  const active = Math.min(hover ?? last, last);
  const lines = GROWTH_DISTRIBUTIONS.flatMap((distribution) => {
    const values = data.series[distribution]?.[counter]?.slice(0, data.done);
    return values ? [{ distribution, values }] : [];
  }).sort((a, b) => b.values[last] - a.values[last]);

  // Only the comparisons line is compared with a theoretical curve, scaled to meet the Random line at the latest size.
  const reference = counter === "comparisons" ? REFERENCES[meta.complexity.time.average] : undefined;
  const randomValues = data.series.random?.[counter];
  const referenceValues =
    reference && randomValues
      ? sizes.slice(0, data.done).map((n) => (randomValues[last] * reference.f(n)) / reference.f(sizes[last]))
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
  const xTicks = width < 480 ? sizes.filter((n) => [10, 100, 200, 400].includes(n)) : sizes;
  const name = counter.toLowerCase();

  // End-of-line value labels, nudged apart so close values stay readable.
  const endLabels: number[] = [];
  lines.forEach(({ values }, i) => {
    const wanted = y(values[last]);
    endLabels.push(i === 0 ? wanted : Math.max(wanted, endLabels[i - 1] + 13));
  });

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
        onPointerMove={(event) => track(event.clientX, event.currentTarget)}
        onPointerLeave={() => setHover(null)}
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
        {lines.map(({ distribution, values }, i) => (
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
              y={endLabels[i]}
              dy="0.32em"
              className="fill-foreground text-[11px] font-medium tabular-nums"
            >
              {formatCount(values[last])}
            </text>
          </g>
        ))}
      </svg>
      <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs" aria-live="off">
        <span className="font-mono text-muted-foreground">n = {sizes[active]}</span>
        {lines.map(({ distribution, values }) => (
          <span key={distribution} className="flex items-center gap-1.5 text-foreground/80">
            <span className="h-0.5 w-4 rounded-full" style={{ backgroundColor: COLORS[distribution] }} />
            {LABELS[distribution]}
            <span className="font-mono font-medium text-foreground tabular-nums">{formatCount(values[active])}</span>
          </span>
        ))}
        {reference && (
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="w-4 border-t-2 border-dashed" style={{ borderColor: "var(--viz-default)" }} />
            {reference.label} (scaled to Random)
          </span>
        )}
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-muted-foreground select-none">Show data</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full min-w-[360px] text-right font-mono tabular-nums">
            <thead className="text-muted-foreground">
              <tr>
                <th className="py-1 pr-3 text-left font-normal">n</th>
                {lines.map(({ distribution }) => (
                  <th key={distribution} className="px-2 py-1 font-normal">
                    {LABELS[distribution]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sizes.slice(0, data.done).map((size, i) => (
                <tr key={size} className="border-t">
                  <td className="py-1 pr-3 text-left">{size}</td>
                  {lines.map(({ distribution, values }) => (
                    <td key={distribution} className="px-2 py-1">
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
