import { createContext, useContext } from "react";
import type { Step } from "@/algorithms/core/types";
import type { AnyAlgorithm } from "@/algorithms/registry";
import { usePlayback } from "@/store/playback";

export const AlgorithmContext = createContext<AnyAlgorithm | null>(null);

export function useAlgorithm(): AnyAlgorithm {
  const algo = useContext(AlgorithmContext);
  if (!algo) throw new Error("useAlgorithm must be used inside a Visualizer");
  return algo;
}

/**
 * Overrides the playback store's timeline for one pane (compare mode: two traces,
 * one shared clock). The index is clamped to this trace's length.
 */
export const TraceContext = createContext<Step<unknown>[] | null>(null);

export function useCurrentStep(): Step<unknown> {
  const trace = useContext(TraceContext);
  return usePlayback((s) => {
    const steps = trace ?? s.steps;
    return steps[Math.min(s.index, steps.length - 1)];
  });
}
