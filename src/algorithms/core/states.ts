import type { Item } from "./types";

/**
 * State shapes emitted by algorithms and consumed by renderers. Pure data, no React.
 * `pointers` map a short label (i, j, lo, mid…) to an array index; renderers draw them under the bars.
 */
export type Pointers = Record<string, number>;

/** `array-bars`: either a bare array or a view with a search target / pointers. */
export type ArrayView = { items: Item[]; target?: number; pointers?: Pointers };
export type ArrayState = Item[] | ArrayView;

/** An array slot; `null` when its item currently lives in the other row. */
export type Slot = Item | null;

/** `array-bars-aux`: main array, auxiliary buffer, optional tally (counting / radix sort). */
export type AuxState = {
  main: Slot[];
  aux: Slot[];
  auxLabel?: string;
  /** Tally cells, highlightable as `count-<index>`. */
  counts?: number[];
  /** Value represented by counts[0] (counting sort's min); labels are base + index. */
  countsBase?: number;
  countsLabel?: string;
  pointers?: Pointers;
  auxPointers?: Pointers;
};

/** `heap`: items[0..size) is the heap (drawn as a tree too); the rest is outside it. */
export type HeapState = { items: Item[]; size: number; pointers?: Pointers };

export function asArrayView(state: ArrayState): ArrayView {
  return Array.isArray(state) ? { items: state } : state;
}

export const countId = (index: number) => `count-${index}`;
