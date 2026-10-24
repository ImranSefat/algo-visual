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
  "current",
  "frontier",
  "visited",
  "sorted",
  "range",
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
