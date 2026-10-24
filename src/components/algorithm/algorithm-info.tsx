import { categoryById } from "@/algorithms/categories";
import type { AlgorithmMeta } from "@/algorithms/core/types";
import { Badge } from "@/components/ui/badge";

export function AlgorithmHeader({ meta, actions }: { meta: AlgorithmMeta; actions?: React.ReactNode }) {
  const { time, space } = meta.complexity;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{meta.name}</h1>
      <Badge variant="secondary">{categoryById[meta.category].name}</Badge>
      <div className="flex flex-wrap items-center gap-1.5 font-mono text-xs">
        <Chip label="avg" value={time.average} />
        <Chip label="worst" value={time.worst} />
        <Chip label="space" value={space} />
      </div>
      {actions && <div className="ml-auto flex items-center gap-2">{actions}</div>}
    </div>
  );
}

function Chip({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5">
      <span className="text-muted-foreground">{label}</span>
      <span>{value}</span>
    </span>
  );
}

export function ComplexityCard({ meta }: { meta: AlgorithmMeta }) {
  const { time, space, stable, inPlace } = meta.complexity;
  const rows: [string, string][] = [
    ["Best", time.best],
    ["Average", time.average],
    ["Worst", time.worst],
    ["Space", space],
  ];
  if (stable !== undefined) rows.push(["Stable", stable ? "Yes" : "No"]);
  if (inPlace !== undefined) rows.push(["In place", inPlace ? "Yes" : "No"]);
  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">Complexity</h2>
      <dl className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {rows.map(([label, value]) => (
          <div key={label} className="rounded-xl bg-muted/50 px-3 py-2">
            <dt className="text-[11px] text-muted-foreground">{label}</dt>
            <dd className="font-mono text-sm font-medium">{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function DescriptionCard({ meta }: { meta: AlgorithmMeta }) {
  return (
    <section className="rounded-2xl border bg-card p-4">
      <h2 className="mb-3 text-xs font-medium tracking-wide text-muted-foreground uppercase">How it works</h2>
      <p className="text-sm leading-relaxed text-pretty">{meta.description}</p>
    </section>
  );
}
