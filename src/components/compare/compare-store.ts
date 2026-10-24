import { createContext, useContext } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import type { Step } from "@/algorithms/core/types";
import { algorithmList, getAlgorithm, runAlgorithm } from "@/algorithms/registry";
import { createInputStore, type InputStore } from "@/store/input";
import { createPlaybackStore, type PlaybackStore } from "@/store/playback";

export type Side = "a" | "b";

export type CompareState = {
  a: string;
  b: string;
  traces: Record<Side, Step<unknown>[]>;
  /** Picks an algorithm for one side; an incompatible input kind resets the input and the other side. */
  select(side: Side, slug: string): void;
};

export type CompareStores = { compare: StoreApi<CompareState>; input: InputStore; playback: PlaybackStore };

const longest = (traces: Record<Side, Step<unknown>[]>) => (traces.a.length >= traces.b.length ? traces.a : traces.b);

/** First other algorithm that accepts the same input kind. */
function partnerFor(slug: string): string {
  const kind = getAlgorithm(slug)!.meta.defaultInput.kind;
  return algorithmList.find((m) => m.slug !== slug && m.defaultInput.kind === kind)?.slug ?? slug;
}

/**
 * Two algorithms, one input, one clock. The playback store holds the longer trace (it only
 * drives `index`); each pane reads its own trace and clamps the index to its length.
 */
export function createCompareStores(a: string, b: string): CompareStores {
  const algoA = getAlgorithm(a)!;
  const input = createInputStore(algoA.meta.defaultInput);
  const trace = (slug: string) => runAlgorithm(getAlgorithm(slug)!, input.getState().spec);
  const traces = { a: trace(a), b: trace(b) };
  const playback = createPlaybackStore(longest(traces));

  const compare = createStore<CompareState>()((set, get) => ({
    a,
    b,
    traces,
    select(side, slug) {
      const algo = getAlgorithm(slug);
      if (!algo) return;
      const other: Side = side === "a" ? "b" : "a";
      const kind = algo.meta.defaultInput.kind;
      if (kind !== input.getState().spec.kind) {
        const otherSlug = getAlgorithm(get()[other])!.meta.defaultInput.kind === kind ? get()[other] : partnerFor(slug);
        set({ [side]: slug, [other]: otherSlug } as Pick<CompareState, Side>);
        // The input subscription below re-runs both traces.
        input.getState().setSpec(algo.meta.defaultInput);
        return;
      }
      set({ [side]: slug } as Pick<CompareState, Side>);
      const next = { ...get().traces, [side]: trace(slug) };
      set({ traces: next });
      playback.getState().load(longest(next));
    },
  }));

  input.subscribe((state, prev) => {
    if (state.spec === prev.spec) return;
    const { a: sa, b: sb } = compare.getState();
    const next = { a: trace(sa), b: trace(sb) };
    compare.setState({ traces: next });
    playback.getState().load(longest(next));
  });

  return { compare, input, playback };
}

export const CompareContext = createContext<StoreApi<CompareState> | null>(null);

export function useCompare<T>(selector: (s: CompareState) => T): T {
  const store = useContext(CompareContext);
  if (!store) throw new Error("useCompare must be used inside <CompareRoot>");
  return useStore(store, selector);
}

export function useCompareStore(): StoreApi<CompareState> {
  const store = useContext(CompareContext);
  if (!store) throw new Error("useCompareStore must be used inside <CompareRoot>");
  return store;
}
