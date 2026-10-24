"use client";

import { Plus, Shuffle, X } from "lucide-react";
import { useState } from "react";
import type { KnapsackInputSpec, ScalarInputSpec, StringsInputSpec } from "@/algorithms/core/input";
import { LIMITS } from "@/algorithms/core/validate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Slider } from "@/components/ui/slider";
import { Field } from "./field";

function RandomiseButton({ onClick, children = "Randomise" }: { onClick: () => void; children?: string }) {
  return (
    <Button variant="secondary" onClick={onClick} className="justify-self-start">
      <Shuffle /> {children} <Kbd className="ml-1 bg-background/60">R</Kbd>
    </Button>
  );
}

const cleanWord = (s: string) => s.toUpperCase().replace(/[^A-Z]/g, "").slice(0, LIMITS.stringLength);

export function StringsControls({
  spec,
  onChange,
  onRandomise,
}: {
  spec: StringsInputSpec;
  onChange: (spec: StringsInputSpec) => void;
  onRandomise: () => void;
}) {
  const [a, setA] = useState(spec.a);
  const [b, setB] = useState(spec.b);
  const commit = () => {
    if (a !== spec.a || b !== spec.b) onChange({ kind: "strings", a, b });
  };
  return (
    <form
      className="grid gap-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        commit();
      }}
    >
      <Field label="String A" hint={`${a.length}/${LIMITS.stringLength}`}>
        <Input value={a} onChange={(e) => setA(cleanWord(e.target.value))} onBlur={commit} aria-label="String A" className="font-mono uppercase" />
      </Field>
      <Field label="String B" hint={`${b.length}/${LIMITS.stringLength}`}>
        <Input value={b} onChange={(e) => setB(cleanWord(e.target.value))} onBlur={commit} aria-label="String B" className="font-mono uppercase" />
      </Field>
      <RandomiseButton onClick={onRandomise}>Example</RandomiseButton>
    </form>
  );
}

export function ScalarControls({ spec, onChange }: { spec: ScalarInputSpec; onChange: (spec: ScalarInputSpec) => void }) {
  const [draft, setDraft] = useState<number | null>(null);
  return (
    <Field label="n" hint={String(draft ?? spec.n)}>
      <Slider
        aria-label="n"
        min={LIMITS.scalar[0]}
        max={LIMITS.scalar[1]}
        step={1}
        value={[draft ?? spec.n]}
        onValueChange={([v]) => setDraft(v)}
        onValueCommit={([v]) => {
          setDraft(null);
          onChange({ kind: "scalar", n: v });
        }}
        className="h-8"
      />
    </Field>
  );
}

function SmallNumber({ value, onChange, label }: { value: number; onChange: (v: number) => void; label: string }) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      min={1}
      max={99}
      value={value}
      onChange={(e) => {
        const v = Number(e.target.value);
        if (Number.isInteger(v) && v >= 1 && v <= 99) onChange(v);
      }}
      aria-label={label}
      className="h-7 w-16 font-mono text-xs"
    />
  );
}

export function KnapsackControls({
  spec,
  onChange,
  onRandomise,
}: {
  spec: KnapsackInputSpec;
  onChange: (spec: KnapsackInputSpec) => void;
  onRandomise: () => void;
}) {
  const [draftCap, setDraftCap] = useState<number | null>(null);
  const set = (i: number, key: "weights" | "values", v: number) =>
    onChange({ ...spec, [key]: spec[key].map((x, k) => (k === i ? v : x)) });
  const remove = (i: number) =>
    onChange({ ...spec, weights: spec.weights.filter((_, k) => k !== i), values: spec.values.filter((_, k) => k !== i) });

  return (
    <div className="grid gap-4">
      <Field label="Items" hint={`${spec.weights.length}/${LIMITS.knapsackItems}`}>
        <div className="grid gap-1.5">
          <div className="grid grid-cols-[2.5rem_4rem_4rem_2rem] gap-2 text-[11px] text-muted-foreground">
            <span>#</span>
            <span>weight</span>
            <span>value</span>
          </div>
          {spec.weights.map((w, i) => (
            <div key={i} className="grid grid-cols-[2.5rem_4rem_4rem_2rem] items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">#{i + 1}</span>
              <SmallNumber value={w} onChange={(v) => set(i, "weights", v)} label={`Item ${i + 1} weight`} />
              <SmallNumber value={spec.values[i]} onChange={(v) => set(i, "values", v)} label={`Item ${i + 1} value`} />
              <Button variant="ghost" size="icon-sm" onClick={() => remove(i)} disabled={spec.weights.length <= 1} aria-label={`Remove item ${i + 1}`}>
                <X />
              </Button>
            </div>
          ))}
        </div>
      </Field>
      <div className="flex flex-wrap items-end gap-3">
        <Button
          variant="outline"
          onClick={() => onChange({ ...spec, weights: [...spec.weights, 3], values: [...spec.values, 4] })}
          disabled={spec.weights.length >= LIMITS.knapsackItems}
        >
          <Plus /> Add item
        </Button>
        <RandomiseButton onClick={onRandomise} />
      </div>
      <Field label="Capacity" hint={String(draftCap ?? spec.capacity)}>
        <Slider
          aria-label="Capacity"
          min={LIMITS.capacity[0]}
          max={LIMITS.capacity[1]}
          step={1}
          value={[draftCap ?? spec.capacity]}
          onValueChange={([v]) => setDraftCap(v)}
          onValueCommit={([v]) => {
            setDraftCap(null);
            onChange({ ...spec, capacity: v });
          }}
          className="h-8"
        />
      </Field>
    </div>
  );
}
