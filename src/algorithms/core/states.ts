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

/**
 * `heap`: items[0..size) is the heap (drawn as a tree too); the rest is outside it.
 * `capacity` keeps the tree layout stable while a heap grows and shrinks.
 */
export type HeapState = { items: Item[]; size: number; capacity?: number; pointers?: Pointers };

/** `array-bars` for a fixed-capacity array: empty slots are drawn, so shifting is visible. */
export type SlotArrayState = { slots: Slot[]; size: number; pointers?: Pointers };

export function asArrayView(state: ArrayState): ArrayView {
  return Array.isArray(state) ? { items: state } : state;
}

export const countId = (index: number) => `count-${index}`;

// ---------- Linear structures ----------

/**
 * `linked-list`: nodes in list order. `pending` is a node that exists but is not linked in yet;
 * it is drawn raised above its target position. `pointers` label nodes (head, tail, cur, prev…).
 */
export type LinkedListState = {
  nodes: Item[];
  doubly: boolean;
  pending?: { node: Item; index: number };
  pointers: Record<string, string | null>;
};

/** `stack`: bottom → top. */
export type StackState = { items: Item[]; capacity?: number };

/** `queue`: front → rear. */
export type QueueState = { items: Item[] };

/** Bucket id for highlights. */
export const bucketId = (h: number) => `bucket-${h}`;

/**
 * `hash-table` with separate chaining. `incoming` is a key whose hash is being computed,
 * drawn in a staging slot before it moves into its bucket.
 */
export type HashTableState = {
  buckets: Item[][];
  incoming?: { item: Item; hash: number | null };
};

// ---------- Trees ----------

export type TreeNode = {
  id: string;
  label: string;
  /** Binary trees: [left, right] with null for a missing child. Tries: children in display order. */
  children: (string | null)[];
  /** Small annotation beside the node, e.g. an AVL height and balance factor. */
  badge?: string;
  /** Trie: a word ends at this node. */
  terminal?: boolean;
};

/** `tree`: nodes keyed by id so the renderer can glide them through rotations. */
export type TreeState = {
  root: string | null;
  nodes: Record<string, TreeNode>;
  /** Keep left/right slots even when a node has one child. */
  binary: boolean;
  /** A key travelling down the tree (insert / search), drawn beside node `at`. */
  probe?: { label: string; at: string | null };
  /** Draw each child's label on the edge leading to it (tries). */
  edgeLabels?: boolean;
};

// ---------- Graphs ----------

/** Grid cell id for highlights: `c<row * cols + col>`. Ids are cached so steps share the strings. */
const cellIds: string[] = [];
export function cellId(index: number): string {
  return (cellIds[index] ??= `c${index}`);
}

/**
 * `grid-graph`: constant layout (frozen arrays, shared by every step) plus optional per-step costs.
 * Cell status (visited / frontier / path / current) is carried by the step's highlights, keyed by cellId.
 */
export type GridState = {
  rows: number;
  cols: number;
  /** Row-major, length rows * cols. Frozen. */
  walls: readonly boolean[];
  /** Cost to enter each cell (weighted grids). Frozen. Omitted when every cell costs 1. */
  weights?: readonly number[];
  start: number;
  end: number;
  /** Best-known cost per cell (Dijkstra / A*); null = not reached yet. */
  dist?: (number | null)[];
};

export const nodeId = (i: number) => `n${i}`;
/** Undirected edges are keyed with the smaller endpoint first. */
export const edgeId = (from: number, to: number, directed: boolean) =>
  directed || from < to ? `e${from}-${to}` : `e${to}-${from}`;

export type GraphNode = { id: string; label: string };
export type GraphEdge = { id: string; from: string; to: string; weight?: number; directed: boolean };

/** A small side table drawn next to the graph (union-find parents, priority queue, in-degrees…). */
export type SideTable = { title: string; columns: string[]; rows: (string | number)[][] };

/**
 * `node-graph`: constant structure (frozen nodes/edges) plus per-step annotations.
 * Node / edge status is carried by the step's highlights, keyed by nodeId / edgeId.
 */
export type GraphState = {
  nodes: readonly GraphNode[];
  edges: readonly GraphEdge[];
  /** Small text under each node, e.g. its distance ("∞", "7") or in-degree. */
  nodeNotes?: Record<string, string>;
  table?: SideTable;
  /** Ordered output, e.g. visit order or topological order (node labels). */
  output?: { title: string; items: string[] };
};

// ---------- Dynamic programming ----------

/** Table cell id for highlights: `r<row>c<col>`. */
export const tableCellId = (row: number, col: number) => `r${row}c${col}`;

/**
 * `dp-table`: a 2-D table (1-D problems use a single row). `null` cells are not computed yet.
 * Highlights: the cell being filled is `current`, the cells it reads are `range`,
 * the traceback is `path`, the final answer is `found`.
 */
export type DPTableState = {
  rowHeaders: string[];
  colHeaders: string[];
  cells: (number | string | null)[][];
  /** Shown under the table once known, e.g. "LCS = GTAB". */
  result?: string;
};
