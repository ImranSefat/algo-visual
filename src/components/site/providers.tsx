"use client";

import { MotionConfig } from "motion/react";
import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ShortcutsDialog } from "./shortcuts-dialog";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={300}>
        {children}
        <ShortcutsDialog />
      </TooltipProvider>
    </MotionConfig>
  );
}
