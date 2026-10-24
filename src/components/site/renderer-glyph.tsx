import type { RendererKind } from "@/algorithms/core/types";

/** Tiny static illustration of each renderer, used on cards. Colours come from the viz tokens. */
export function RendererGlyph({ kind, className }: { kind: RendererKind; className?: string }) {
  return (
    <svg viewBox="0 0 120 64" className={className} aria-hidden>
      {GLYPHS[kind]}
    </svg>
  );
}

const bars = (heights: number[], y0: number, h: number, colors: Record<number, string> = {}) =>
  heights.map((v, i) => (
    <rect
      key={`${y0}-${i}`}
      x={6 + i * (108 / heights.length)}
      y={y0 + h - v * h}
      width={108 / heights.length - 2}
      height={v * h}
      rx={1.2}
      className={colors[i] ?? "fill-viz-default"}
    />
  ));

const node = (x: number, y: number, cls = "stroke-viz-default", r = 6) => (
  <circle key={`${x}-${y}`} cx={x} cy={y} r={r} className={`fill-card ${cls}`} strokeWidth={1.6} />
);

const edge = (x1: number, y1: number, x2: number, y2: number, cls = "stroke-border") => (
  <line key={`${x1}-${y1}-${x2}-${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} className={cls} strokeWidth={1.4} />
);

const GLYPHS: Record<RendererKind, React.ReactNode> = {
  "array-bars": bars([0.45, 0.7, 0.3, 0.9, 0.55, 0.8, 0.2, 0.62, 0.38, 1], 6, 52, {
    3: "fill-viz-compare",
    4: "fill-viz-compare",
    8: "fill-viz-sorted",
    9: "fill-viz-sorted",
  }),
  "array-bars-aux": (
    <>
      {bars([0.4, 0.8, 0, 0.6, 0.3, 0.9, 0, 0.5], 4, 24, { 1: "fill-viz-compare" })}
      {bars([0, 0, 0.35, 0, 0, 0, 0.55, 0], 36, 24, { 2: "fill-viz-insert", 6: "fill-viz-insert" })}
    </>
  ),
  heap: (
    <>
      {edge(60, 10, 36, 28)}
      {edge(60, 10, 84, 28)}
      {edge(36, 28, 24, 46)}
      {edge(36, 28, 48, 46)}
      {edge(84, 28, 72, 46)}
      {node(60, 10, "stroke-viz-found")}
      {node(36, 28, "stroke-viz-compare")}
      {node(84, 28)}
      {node(24, 46)}
      {node(48, 46, "stroke-viz-compare")}
      {node(72, 46)}
      {bars([1, 0.7, 0.6, 0.3, 0.5, 0.4], 54, 8)}
    </>
  ),
  "linked-list": (
    <>
      {[0, 1, 2, 3].map((i) => (
        <g key={i}>
          <rect x={6 + i * 29} y={22} width={20} height={20} rx={4} className={`fill-card ${i === 2 ? "stroke-viz-current" : "stroke-viz-default"}`} strokeWidth={1.6} />
          {i < 3 && <path d={`M${27 + i * 29} 32 h6 m-3 -3 l3 3 l-3 3`} className="fill-none stroke-muted-foreground" strokeWidth={1.4} />}
        </g>
      ))}
    </>
  ),
  stack: (
    <>
      {[0, 1, 2, 3].map((i) => (
        <rect key={i} x={40} y={50 - i * 12} width={40} height={10} rx={2.5} className={i === 3 ? "fill-viz-insert" : "fill-viz-default"} />
      ))}
      <path d="M86 14 h10" className="stroke-muted-foreground" strokeWidth={1.4} />
    </>
  ),
  queue: (
    <>
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x={12 + i * 20} y={24} width={16} height={16} rx={3} className={i === 0 ? "fill-viz-delete" : i === 4 ? "fill-viz-insert" : "fill-viz-default"} />
      ))}
    </>
  ),
  "hash-table": (
    <>
      {[0, 1, 2, 3, 4].map((col) => (
        <g key={col}>
          <rect x={10 + col * 21} y={6} width={17} height={10} rx={2} className="fill-muted stroke-border" />
          {Array.from({ length: [2, 0, 3, 1, 2][col] }, (_, k) => (
            <rect key={k} x={10 + col * 21} y={20 + k * 12} width={17} height={9} rx={2} className={col === 2 && k === 2 ? "fill-viz-insert" : "fill-viz-default"} />
          ))}
        </g>
      ))}
    </>
  ),
  tree: (
    <>
      {edge(60, 10, 34, 30)}
      {edge(60, 10, 86, 30)}
      {edge(34, 30, 20, 52)}
      {edge(86, 30, 72, 52)}
      {edge(86, 30, 100, 52, "stroke-viz-path")}
      {node(60, 10)}
      {node(34, 30)}
      {node(86, 30, "stroke-viz-path")}
      {node(20, 52)}
      {node(72, 52)}
      {node(100, 52, "stroke-viz-found")}
    </>
  ),
  "grid-graph": (
    <>
      {Array.from({ length: 6 * 11 }, (_, k) => {
        const r = Math.floor(k / 11);
        const c = k % 11;
        const wall = c === 5 && r < 4;
        const path = (r === 4 && c >= 1 && c <= 9) || (c === 9 && r <= 4 && r >= 1);
        const visited = !path && !wall && Math.abs(r - 3) + Math.abs(c - 3) < 4;
        const cls = wall ? "fill-viz-wall" : path ? "fill-viz-path" : visited ? "fill-viz-visited" : "fill-muted";
        return <rect key={k} x={5 + c * 10} y={3 + r * 10} width={9} height={9} rx={1.5} className={cls} />;
      })}
    </>
  ),
  "node-graph": (
    <>
      {edge(20, 32, 48, 12)}
      {edge(20, 32, 46, 52, "stroke-viz-path")}
      {edge(48, 12, 80, 18)}
      {edge(46, 52, 78, 46, "stroke-viz-path")}
      {edge(80, 18, 104, 34)}
      {edge(78, 46, 104, 34, "stroke-viz-path")}
      {edge(48, 12, 78, 46)}
      {node(20, 32, "stroke-viz-current")}
      {node(48, 12, "stroke-viz-visited")}
      {node(46, 52, "stroke-viz-path")}
      {node(80, 18, "stroke-viz-visited")}
      {node(78, 46, "stroke-viz-path")}
      {node(104, 34, "stroke-viz-found")}
    </>
  ),
  "dp-table": (
    <>
      {Array.from({ length: 5 * 8 }, (_, k) => {
        const r = Math.floor(k / 8);
        const c = k % 8;
        const filled = r < 3 || (r === 3 && c < 5);
        const cls = r === 3 && c === 4 ? "fill-viz-current" : (r === 2 && c === 4) || (r === 3 && c === 3) ? "fill-viz-range" : filled ? "fill-viz-default" : "fill-muted";
        return <rect key={k} x={8 + c * 13.5} y={4 + r * 11.5} width={12} height={10} rx={1.5} className={cls} />;
      })}
    </>
  ),
};
