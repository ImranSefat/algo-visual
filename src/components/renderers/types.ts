import type { Step } from "@/algorithms/core/types";

export type RendererProps<S> = {
  step: Step<S>;
  /** Seconds; from useStepDuration() so motion never lags the clock. */
  duration: number;
  /** Compact mode for thumbnails: no labels, no chrome. */
  compact?: boolean;
};
