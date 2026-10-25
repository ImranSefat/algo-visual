"use client";

import { Crosshair, Shuffle } from "lucide-react";
import { useState } from "react";
import { generateValues, type ArrayInputSpec, type Distribution } from "@/algorithms/core/input";
import { pickTarget } from "@/algorithms/core/randomise";
import { DISTRIBUTIONS, LIMITS, parseValues } from "@/algorithms/core/validate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { newSeed } from "@/store/input";
import { Field } from "./field";

const DISTRIBUTION_LABELS: Record<Distribution, string> = {
  random: "Random",
  "nearly-sorted": "Nearly sorted",
  reversed: "Reversed",
  "few-unique": "Few unique",
  custom: "Custom",
};

/** Size, distribution, randomise and custom values for an array input. */
export function ArrayControls({
  spec,
  onChange,
  onRandomise,
}: {
  spec: ArrayInputSpec;
  onChange: (spec: ArrayInputSpec) => void;
  onRandomise: () => void;
}) {
  // While dragging, only the label follows; the (possibly expensive) re-run happens on release.
  const [draftSize, setDraftSize] = useState<number | null>(null);
  const [customText, setCustomText] = useState(() => (spec.custom ?? generateValues(spec)).join(", "));
  const [error, setError] = useState<string | null>(null);

  const applyCustom = () => {
    const parsed = parseValues(customText);
    if ("error" in parsed) {
      setError(parsed.error);
      return;
    }
    setError(null);
    onChange({ ...spec, distribution: "custom", custom: parsed.values, size: parsed.values.length });
  };

  const fillCustom = () => setCustomText(generateValues(spec).join(", "));

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-end">
      <Field label="Size" hint={String(draftSize ?? spec.size)}>
        <Slider
          aria-label="Array size"
          min={LIMITS.arraySize[0]}
          max={LIMITS.arraySize[1]}
          step={1}
          value={[draftSize ?? spec.size]}
          onValueChange={([v]) => setDraftSize(v)}
          onValueCommit={([v]) => {
            setDraftSize(null);
            const distribution = spec.distribution === "custom" ? "random" : spec.distribution;
            onChange({ ...spec, size: v, distribution, custom: undefined });
          }}
          className="h-8"
        />
      </Field>
      <Field label="Distribution">
        <Select
          value={spec.distribution}
          onValueChange={(v) => {
            // "Custom" only pre-fills the editor below; the input changes when the user applies it.
            if (v === "custom") fillCustom();
            else onChange({ ...spec, distribution: v as Distribution, custom: undefined });
          }}
        >
          <SelectTrigger className="w-full sm:w-40" aria-label="Distribution">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {DISTRIBUTIONS.map((d) => (
              <SelectItem key={d} value={d}>
                {DISTRIBUTION_LABELS[d]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>
      <Button variant="secondary" onClick={onRandomise} className="justify-self-start">
        <Shuffle /> Randomise <Kbd className="ml-1 bg-background/60">R</Kbd>
      </Button>

      <Field label="Custom values" className="sm:col-span-3" hint={`${LIMITS.customLength[0]} to ${LIMITS.customLength[1]} whole numbers, each ${LIMITS.value[0]} to ${LIMITS.value[1]}`}>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            applyCustom();
          }}
        >
          <Input
            value={customText}
            onChange={(e) => setCustomText(e.target.value)}
            aria-label="Custom values, comma separated"
            aria-invalid={error !== null}
            className="font-mono text-xs"
            spellCheck={false}
          />
          <Button type="submit" variant="outline">
            Apply
          </Button>
        </form>
        {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
      </Field>
      <p className="font-mono text-[11px] text-muted-foreground sm:col-span-3">
        {spec.distribution === "custom" ? `custom · ${spec.size} values` : `seed ${spec.seed}`}
      </p>
    </div>
  );
}

/** Target value for a search, plus a quick "pick one from the array" action. */
export function TargetControl({ target, array, onChange }: { target: number; array: ArrayInputSpec; onChange: (target: number) => void }) {
  const [text, setText] = useState(String(target));
  const [synced, setSynced] = useState(target);
  // Follow external changes (randomise, URL) without an effect.
  if (synced !== target) {
    setSynced(target);
    setText(String(target));
  }
  const commit = () => {
    const value = Number(text);
    if (Number.isInteger(value) && value >= 0 && value <= LIMITS.value[1]) onChange(value);
    else setText(String(target));
  };
  return (
    <Field label="Target">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          commit();
        }}
      >
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          max={LIMITS.value[1]}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          aria-label="Search target"
          className="w-24 font-mono"
        />
        <Button type="button" variant="outline" onClick={() => onChange(pickTarget(generateValues(array), newSeed()))}>
          <Crosshair /> Pick
        </Button>
      </form>
    </Field>
  );
}
