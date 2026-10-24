"use client";

import { renderers } from "@/components/renderers";
import { cn } from "@/lib/utils";
import { useStepDuration } from "@/store/playback";
import { useAlgorithm, useCurrentStep } from "./context";

/** Renders the current step with the algorithm's renderer. */
export function Canvas({ className, compact }: { className?: string; compact?: boolean }) {
  const { meta } = useAlgorithm();
  const step = useCurrentStep();
  const duration = useStepDuration();
  const Renderer = renderers[meta.renderer];
  return (
    <div className={cn("relative h-full w-full", className)}>
      {Renderer ? (
        <Renderer step={step} duration={duration} compact={compact} />
      ) : (
        <div className="grid h-full place-items-center text-sm text-muted-foreground">
          The {meta.renderer} renderer is not built yet.
        </div>
      )}
    </div>
  );
}
