"use client";

import { Plus, Shuffle, Trash2, X } from "lucide-react";
import { useState } from "react";
import type { SequenceInputSpec, SequenceOp, SequenceOpName } from "@/algorithms/core/input";
import { LIMITS, parseValues } from "@/algorithms/core/validate";
import { opLabel } from "@/algorithms/structures/ops";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Kbd } from "@/components/ui/kbd";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "./field";

/** Ops that always carry a value. `delete` does too unless the structure deletes by index. */
const VALUE_OPS: SequenceOpName[] = ["insert", "push", "enqueue", "search", "delete"];

/** What the op builder offers is learned from the algorithm's default ops. */
function opShapes(defaults: SequenceInputSpec) {
  const names = [...new Set(defaults.ops.map((o) => o.op))];
  const shape = (name: SequenceOpName) => {
    const ops = defaults.ops.filter((o) => o.op === name);
    const indexed = ops.some((o) => o.index !== undefined);
    const word = ops.some((o) => o.word !== undefined);
    return {
      index: indexed ? (ops.every((o) => o.index !== undefined) ? "required" : "optional") : "none",
      value: !word && VALUE_OPS.includes(name) && !(name === "delete" && indexed),
      word,
    } as const;
  };
  return { names, shape };
}

function NumberInput({
  value,
  onChange,
  placeholder,
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
}) {
  return (
    <Input
      type="number"
      inputMode="numeric"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      aria-label={label}
      className="w-20 font-mono"
    />
  );
}

/** Op builder: initial contents + an editable list of operations. */
export function SequenceControls({
  spec,
  defaults,
  onChange,
  onRandomise,
}: {
  spec: SequenceInputSpec;
  defaults: SequenceInputSpec;
  onChange: (spec: SequenceInputSpec) => void;
  onRandomise: () => void;
}) {
  const { names, shape } = opShapes(defaults);
  const [op, setOp] = useState<SequenceOpName>(names[0]);
  const [value, setValue] = useState("");
  const [index, setIndex] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [initialText, setInitialText] = useState((spec.initial ?? []).join(", "));
  const [initialError, setInitialError] = useState<string | null>(null);
  const current = shape(op);

  const addOp = () => {
    const next: SequenceOp = { op };
    if (current.word) {
      const w = value.trim().toLowerCase();
      if (!/^[a-z]{1,12}$/.test(w)) return setError("Use 1–12 letters a–z");
      next.word = w;
    }
    if (current.value) {
      const v = Number(value);
      if (value === "" || !Number.isInteger(v) || v < 0 || v > 99) return setError("Value must be a whole number 0–99");
      next.value = v;
    }
    if (current.index !== "none" && (index !== "" || current.index === "required")) {
      const i = Number(index);
      if (index === "" || !Number.isInteger(i) || i < 0 || i > LIMITS.ops) return setError(`Index must be a whole number 0–${LIMITS.ops}`);
      next.index = i;
    }
    if (spec.ops.length >= LIMITS.ops) return setError(`At most ${LIMITS.ops} operations`);
    setError(null);
    setValue("");
    onChange({ ...spec, ops: [...spec.ops, next] });
  };

  const applyInitial = () => {
    if (initialText.trim() === "") {
      setInitialError(null);
      return onChange({ ...spec, initial: [] });
    }
    const parsed = parseValues(initialText, [1, LIMITS.initial]);
    if ("error" in parsed) return setInitialError(parsed.error);
    if (parsed.values.some((v) => v > 99)) return setInitialError("Keep values between 1 and 99");
    setInitialError(null);
    onChange({ ...spec, initial: parsed.values });
  };

  return (
    <div className="grid gap-4">
      {!names.some((n) => shape(n).word) && (
        <Field label="Starting contents" hint={`${spec.initial?.length ?? 0} values`}>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              applyInitial();
            }}
          >
            <Input
              value={initialText}
              onChange={(e) => setInitialText(e.target.value)}
              placeholder="empty"
              aria-label="Starting contents, comma separated"
              aria-invalid={initialError !== null}
              className="font-mono text-xs"
              spellCheck={false}
            />
            <Button type="submit" variant="outline">
              Apply
            </Button>
          </form>
          {initialError && <p className="mt-1.5 text-xs text-destructive">{initialError}</p>}
        </Field>
      )}

      <Field label="Operations" hint={`${spec.ops.length} / ${LIMITS.ops}`}>
        <ol className="flex min-h-9 flex-wrap gap-1.5">
          {spec.ops.length === 0 && <li className="text-xs text-muted-foreground">No operations yet — add one below.</li>}
          {spec.ops.map((o, i) => (
            <li
              key={i}
              className="inline-flex h-7 items-center gap-1 rounded-lg border bg-muted/50 pr-0.5 pl-2 font-mono text-xs"
            >
              <span className="text-muted-foreground">{i + 1}.</span> {opLabel(o)}
              <button
                type="button"
                onClick={() => onChange({ ...spec, ops: spec.ops.filter((_, k) => k !== i) })}
                className="grid size-6 place-items-center rounded-md text-muted-foreground hover:bg-background hover:text-foreground"
                aria-label={`Remove ${opLabel(o)}`}
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ol>
      </Field>

      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          addOp();
        }}
      >
        <Select value={op} onValueChange={(v) => setOp(v as SequenceOpName)}>
          <SelectTrigger className="w-32" aria-label="Operation">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {names.map((n) => (
              <SelectItem key={n} value={n}>
                {n}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {current.value && <NumberInput value={value} onChange={setValue} placeholder="value" label="Operation value" />}
        {current.word && (
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="word"
            aria-label="Operation word"
            className="w-32 font-mono"
            spellCheck={false}
            autoCapitalize="off"
          />
        )}
        {current.index !== "none" && (
          <NumberInput
            value={index}
            onChange={setIndex}
            placeholder={current.index === "optional" ? "at end" : "index"}
            label="Operation index"
          />
        )}
        <Button type="submit" variant="outline">
          <Plus /> Add
        </Button>
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="ghost" onClick={() => onChange({ ...spec, ops: [] })} disabled={spec.ops.length === 0}>
            <Trash2 /> Clear
          </Button>
          <Button type="button" variant="secondary" onClick={onRandomise}>
            <Shuffle /> Randomise <Kbd className="ml-1 bg-background/60">R</Kbd>
          </Button>
        </div>
      </form>
      {error && <p className="-mt-2 text-xs text-destructive">{error}</p>}
    </div>
  );
}
