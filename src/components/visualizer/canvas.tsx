"use client";

import { useCallback } from "react";
import { renderers } from "@/components/renderers";
import { GridEditContext, type GridEdit } from "@/components/renderers/grid-graph";
import { cn } from "@/lib/utils";
import { useInputStore } from "@/store/input";
import { useStepDuration } from "@/store/playback";
import { useAlgorithm, useCurrentStep } from "./context";

/** Renders the current step with the algorithm's renderer. */
export function Canvas({ className, compact }: { className?: string; compact?: boolean }) {
  const { meta } = useAlgorithm();
  const step = useCurrentStep();
  const duration = useStepDuration();
  const input = useInputStore();
  const Renderer = renderers[meta.renderer];

  // Grid edits (walls, start/end, weights) are merged into the input, which re-runs the trace.
  const commitGrid = useCallback(
    (edit: GridEdit) => {
      const spec = input.getState().spec;
      if (spec.kind === "grid") input.getState().setSpec({ ...spec, ...edit });
    },
    [input],
  );

  return (
    <div className={cn("@container relative h-full w-full", className)}>
      <GridEditContext.Provider value={meta.defaultInput.kind === "grid" ? commitGrid : null}>
        <Renderer step={step} duration={duration} compact={compact} />
      </GridEditContext.Provider>
    </div>
  );
}
