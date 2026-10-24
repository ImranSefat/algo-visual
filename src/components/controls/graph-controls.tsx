"use client";

import { Shuffle } from "lucide-react";
import { useState } from "react";
import type { GraphInputSpec } from "@/algorithms/core/input";
import { randomGraph } from "@/algorithms/core/randomise";
import { LIMITS } from "@/algorithms/core/validate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { newSeed } from "@/store/input";
import { Field } from "./field";

const label = (i: number) => String.fromCharCode(65 + i);

function formatEdges(spec: GraphInputSpec): string {
  const sep = spec.directed ? ">" : "-";
  return spec.edges.map(([a, b, w]) => `${label(a)}${sep}${label(b)}${w !== undefined ? ` ${w}` : ""}`).join(", ");
}

/** Parses "A-B 4, B>C 2" (weights optional) for a graph with `nodes` nodes. */
function parseEdges(text: string, nodes: number, weighted: boolean): GraphInputSpec["edges"] | string {
  const edges: GraphInputSpec["edges"] = [];
  for (const raw of text.split(",").map((s) => s.trim()).filter(Boolean)) {
    const m = /^([A-Za-z])\s*[-–>]\s*([A-Za-z])(?:\s+(\d{1,2}))?$/.exec(raw);
    if (!m) return `Can't read "${raw}" — use the form A-B 4`;
    const a = m[1].toUpperCase().charCodeAt(0) - 65;
    const b = m[2].toUpperCase().charCodeAt(0) - 65;
    if (a >= nodes || b >= nodes) return `"${raw}" uses a node beyond ${label(nodes - 1)}`;
    if (a === b) return `"${raw}" is a self-loop`;
    const w = m[3] ? Number(m[3]) : undefined;
    if (weighted && (w === undefined || w < 1)) return `"${raw}" needs a weight from 1 to 99`;
    edges.push(weighted ? [a, b, w] : [a, b]);
  }
  return edges.length ? edges : "Add at least one edge";
}

export function GraphControls({
  spec,
  onChange,
  onRandomise,
}: {
  spec: GraphInputSpec;
  onChange: (spec: GraphInputSpec) => void;
  onRandomise: () => void;
}) {
  const weighted = spec.edges.some((e) => e[2] !== undefined);
  const [draftNodes, setDraftNodes] = useState<number | null>(null);
  const [text, setText] = useState(() => formatEdges(spec));
  const [error, setError] = useState<string | null>(null);
  const nodeOptions = Array.from({ length: spec.nodes }, (_, i) => i);

  return (
    <div className="grid gap-4">
      <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
        <Field label="Nodes" hint={String(draftNodes ?? spec.nodes)}>
          <Slider
            aria-label="Number of nodes"
            min={4}
            max={LIMITS.graphNodes[1]}
            step={1}
            value={[draftNodes ?? spec.nodes]}
            onValueChange={([v]) => setDraftNodes(v)}
            onValueCommit={([v]) => {
              setDraftNodes(null);
              onChange(randomGraph(spec, newSeed(), v));
            }}
            className="h-8"
          />
        </Field>
        <Field label="Source">
          <Select value={String(spec.source)} onValueChange={(v) => onChange({ ...spec, source: Number(v) })}>
            <SelectTrigger className="w-20" aria-label="Source node">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {nodeOptions.map((i) => (
                <SelectItem key={i} value={String(i)}>
                  {label(i)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {spec.target !== undefined && (
          <Field label="Target">
            <Select value={String(spec.target)} onValueChange={(v) => onChange({ ...spec, target: Number(v) })}>
              <SelectTrigger className="w-20" aria-label="Target node">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {nodeOptions.map((i) => (
                  <SelectItem key={i} value={String(i)}>
                    {label(i)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
      </div>
      <Field label={`Edges${spec.directed ? " (directed: A>B)" : ""}`} hint={weighted ? "weights 1–99" : undefined}>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const parsed = parseEdges(text, spec.nodes, weighted);
            if (typeof parsed === "string") return setError(parsed);
            setError(null);
            onChange({ ...spec, edges: parsed });
          }}
        >
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label="Edge list"
            aria-invalid={error !== null}
            className="font-mono text-xs"
            spellCheck={false}
          />
          <Button type="submit" variant="outline">
            Apply
          </Button>
        </form>
        {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
      </Field>
      <div>
        <Button variant="secondary" onClick={onRandomise}>
          <Shuffle /> Random graph <Kbd className="ml-1 bg-background/60">R</Kbd>
        </Button>
      </div>
    </div>
  );
}
