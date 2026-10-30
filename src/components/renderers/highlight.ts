import type { Highlight, HighlightKind } from "@/algorithms/core/types";

/** Highest precedence first: when an element carries several highlights, the earliest kind wins. */
export const HIGHLIGHT_PRECEDENCE: HighlightKind[] = [
  "found",
  "notfound",
  "path",
  "swap",
  "insert",
  "delete",
  "compare",
  "pivot",
  "boundary",
  "current",
  "frontier",
  "visited",
  "sorted",
  "range",
  "span",
  "wall",
];

const rank = new Map(HIGHLIGHT_PRECEDENCE.map((kind, i) => [kind, i]));

export type HighlightMap = Map<string, HighlightKind>;

/** Resolves every highlighted id to its winning kind in one pass. */
export function highlightMap(highlights: Highlight[]): HighlightMap {
  const map: HighlightMap = new Map();
  for (const { kind, ids } of highlights) {
    for (const id of ids) {
      const current = map.get(id);
      if (current === undefined || rank.get(kind)! < rank.get(current)!) map.set(id, kind);
    }
  }
  return map;
}

export function vizColor(kind: HighlightKind | undefined): string {
  return `var(--viz-${kind ?? "default"})`;
}

export function highlightColor(id: string, highlights: Highlight[]): string {
  return vizColor(highlightMap(highlights).get(id));
}

/** Node fill for tree/graph/list nodes: a tint of the highlight colour over the card surface. */
export function nodeFill(kind: HighlightKind | undefined): string {
  if (!kind) return "var(--card)";
  return `color-mix(in oklch, var(--viz-${kind}) var(--viz-node-tint), var(--card))`;
}

/** Node outline: the highlight colour itself, or the neutral token when unhighlighted. */
export function nodeStroke(kind: HighlightKind | undefined): string {
  return kind ? `var(--viz-${kind})` : "var(--viz-default)";
}
