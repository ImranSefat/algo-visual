"use client";

import { Pause, Play, RotateCcw, SkipBack, SkipForward, StepBack, StepForward } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SPEEDS, usePlayback, usePlaybackStore, type Speed } from "@/store/playback";

function TransportButton({
  label,
  shortcut,
  onClick,
  disabled,
  primary,
  children,
}: {
  label: string;
  shortcut: string;
  onClick: () => void;
  disabled?: boolean;
  primary?: boolean;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant={primary ? "default" : "ghost"}
          size={primary ? "icon-lg" : "icon"}
          className={primary ? "rounded-full" : undefined}
          onClick={onClick}
          disabled={disabled}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label} <Kbd>{shortcut}</Kbd>
      </TooltipContent>
    </Tooltip>
  );
}

/** ⏮ ◀ ▶/⏸ ▶ ⏭ · speed · scrubber. */
export function Transport() {
  const store = usePlaybackStore();
  const index = usePlayback((s) => s.index);
  const total = usePlayback((s) => s.steps.length);
  const playing = usePlayback((s) => s.playing);
  const speed = usePlayback((s) => s.speed);
  const { toStart, stepBack, toggle, stepForward, toEnd, seek, pause, setSpeed } = store.getState();
  const atStart = index === 0;
  const atEnd = index >= total - 1;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Slider
          aria-label="Step"
          value={[index]}
          min={0}
          max={Math.max(0, total - 1)}
          step={1}
          onPointerDown={pause}
          onValueChange={([value]) => seek(value)}
          className="flex-1"
        />
        <span className="min-w-[7ch] text-right font-mono text-xs text-muted-foreground tabular-nums">
          {index + 1} / {total}
        </span>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <TransportButton label="First step" shortcut="Home" onClick={toStart} disabled={atStart}>
            <SkipBack />
          </TransportButton>
          <TransportButton label="Step back" shortcut="←" onClick={stepBack} disabled={atStart}>
            <StepBack />
          </TransportButton>
          <TransportButton label={playing ? "Pause" : atEnd ? "Replay" : "Play"} shortcut="Space" onClick={toggle} primary>
            {playing ? <Pause className="fill-current" /> : atEnd ? <RotateCcw /> : <Play className="translate-x-px fill-current" />}
          </TransportButton>
          <TransportButton label="Step forward" shortcut="→" onClick={stepForward} disabled={atEnd}>
            <StepForward />
          </TransportButton>
          <TransportButton label="Last step" shortcut="End" onClick={toEnd} disabled={atEnd}>
            <SkipForward />
          </TransportButton>
        </div>
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          spacing={0}
          value={String(speed)}
          onValueChange={(value) => value && setSpeed(Number(value) as Speed)}
          aria-label="Playback speed"
        >
          {SPEEDS.map((s, i) => (
            <ToggleGroupItem key={s} value={String(s)} aria-label={`${s}× speed (key ${i + 1})`} className="font-mono text-xs">
              {s}×
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
    </div>
  );
}
