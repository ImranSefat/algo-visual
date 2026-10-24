"use client";

import { Brush, Eraser, Flag, Play, Shuffle, Trash2, Weight } from "lucide-react";
import type { Cell, GridInputSpec } from "@/algorithms/core/input";
import { Button } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useGridTool, WEIGHT_COST, type GridTool } from "@/store/grid-tool";
import { Field } from "./field";

const SIZES = [
  { label: "Small · 11 × 21", rows: 11, cols: 21 },
  { label: "Medium · 15 × 29", rows: 15, cols: 29 },
  { label: "Large · 21 × 41", rows: 21, cols: 41 },
] as const;

/** Re-fits a grid to new dimensions, keeping start/end inside and dropping walls that fall outside. */
function resize(spec: GridInputSpec, rows: number, cols: number): GridInputSpec {
  const inside = ([r, c]: Cell | [number, number, number]) => r < rows && c < cols;
  const mid = Math.floor(rows / 2);
  return {
    ...spec,
    rows,
    cols,
    start: inside(spec.start) ? spec.start : [mid, 2],
    end: inside(spec.end) ? spec.end : [mid, cols - 3],
    walls: spec.walls.filter(inside),
    ...(spec.weights ? { weights: spec.weights.filter(inside) } : {}),
  };
}

export function GridControls({
  spec,
  onChange,
  onRandomise,
}: {
  spec: GridInputSpec;
  onChange: (spec: GridInputSpec) => void;
  onRandomise: () => void;
}) {
  const tool = useGridTool((s) => s.tool);
  const setTool = useGridTool((s) => s.setTool);
  const weighted = spec.weights !== undefined;
  const size = SIZES.find((s) => s.rows === spec.rows && s.cols === spec.cols);

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-end gap-4">
        <Field label="Draw">
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            spacing={0}
            value={tool}
            onValueChange={(v) => v && setTool(v as GridTool)}
            aria-label="Grid tool"
          >
            <ToggleGroupItem value="wall" aria-label="Draw walls">
              <Brush /> Wall
            </ToggleGroupItem>
            <ToggleGroupItem value="erase" aria-label="Erase">
              <Eraser /> Erase
            </ToggleGroupItem>
            {weighted && (
              <ToggleGroupItem value="weight" aria-label={`Paint cost-${WEIGHT_COST} cells`}>
                <Weight /> Cost {WEIGHT_COST}
              </ToggleGroupItem>
            )}
            <ToggleGroupItem value="start" aria-label="Move start">
              <Play /> Start
            </ToggleGroupItem>
            <ToggleGroupItem value="end" aria-label="Move end">
              <Flag /> End
            </ToggleGroupItem>
          </ToggleGroup>
        </Field>
        <Field label="Size">
          <Select
            value={size ? `${size.rows}x${size.cols}` : "custom"}
            onValueChange={(v) => {
              const next = SIZES.find((s) => `${s.rows}x${s.cols}` === v);
              if (next) onChange(resize(spec, next.rows, next.cols));
            }}
          >
            <SelectTrigger className="w-44" aria-label="Grid size">
              <SelectValue placeholder={`${spec.rows} × ${spec.cols}`} />
            </SelectTrigger>
            <SelectContent>
              {SIZES.map((s) => (
                <SelectItem key={s.label} value={`${s.rows}x${s.cols}`}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" onClick={onRandomise}>
          <Shuffle /> Random walls <Kbd className="ml-1 bg-background/60">R</Kbd>
        </Button>
        <Button
          variant="ghost"
          onClick={() => onChange({ ...spec, walls: [], ...(weighted ? { weights: [] } : {}) })}
          disabled={spec.walls.length === 0 && !spec.weights?.length}
        >
          <Trash2 /> Clear
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Drag on the grid to draw. Grab the start or end cell to move it. Edits re-run the search from step 1.
      </p>
    </div>
  );
}
