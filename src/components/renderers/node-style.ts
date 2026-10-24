import type { CSSProperties } from "react";
import type { HighlightKind } from "@/algorithms/core/types";
import { nodeFill, nodeStroke } from "./highlight";

/** Box-style node (list node, stack cell, chain entry): tinted fill + highlight outline, colour eased by CSS. */
export function nodeBoxStyle(kind: HighlightKind | undefined, duration: number, extra?: CSSProperties): CSSProperties {
  return {
    backgroundColor: nodeFill(kind),
    borderColor: nodeStroke(kind),
    transitionDuration: `${duration}s`,
    ...extra,
  };
}

/** Groups pointer labels by the node they point at: { head: "n1", cur: "n1" } → n1 → [head, cur]. */
export function labelsByNode(pointers: Record<string, string | null>): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const [label, id] of Object.entries(pointers)) {
    if (id) map.set(id, [...(map.get(id) ?? []), label]);
  }
  return map;
}
