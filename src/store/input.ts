import { createContext, useContext } from "react";
import { createStore, useStore, type StoreApi } from "zustand";
import type { InputSpec } from "@/algorithms/core/input";
import { randomiseSpec } from "@/algorithms/core/randomise";

export type InputState = {
  spec: InputSpec;
  setSpec(spec: InputSpec): void;
  /** New random content of the same shape. */
  randomise(): void;
  /** Back to the algorithm's default input. */
  reset(): void;
};

export type InputStore = StoreApi<InputState>;

export function newSeed(): number {
  return Math.floor(Math.random() * 2 ** 31);
}

export function createInputStore(initial: InputSpec, defaults: InputSpec = initial): InputStore {
  return createStore<InputState>()((set) => ({
    spec: initial,
    setSpec: (spec) => set({ spec }),
    randomise: () => set((s) => ({ spec: randomiseSpec(s.spec, newSeed()) })),
    reset: () => set({ spec: defaults }),
  }));
}

export const InputContext = createContext<InputStore | null>(null);

export function useInputStore(): InputStore {
  const store = useContext(InputContext);
  if (!store) throw new Error("useInputStore must be used inside a Visualizer");
  return store;
}

export function useInput<T>(selector: (s: InputState) => T): T {
  return useStore(useInputStore(), selector);
}
