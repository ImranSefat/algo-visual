"use client";

import { MotionConfig } from "motion/react";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ShortcutsDialog } from "./shortcuts-dialog";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <NuqsAdapter>
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={300}>
          {children}
          <ShortcutsDialog />
        </TooltipProvider>
      </MotionConfig>
    </NuqsAdapter>
  );
}
