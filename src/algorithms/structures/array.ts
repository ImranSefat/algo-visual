import type { ResolvedInput } from "../core/input";
import { createTracer, hl } from "../core/step";
import type { Slot, SlotArrayState } from "../core/states";
import type { AlgorithmMeta, Step } from "../core/types";
import { itemFactory, opLabel } from "./ops";

export const source = `class DynamicArray {
  data: number[] = new Array(8);
  size = 0;

  insert(index: number, value: number) {
    if (this.size === this.data.length) this.grow();
    for (let k = this.size; k > index; k--) {
      this.data[k] = this.data[k - 1];
    }
    this.data[index] = value;
    this.size++;
  }

  delete(index: number) {
    for (let k = index; k < this.size - 1; k++) {
      this.data[k] = this.data[k + 1];
    }
    this.size--;
  }

  search(value: number) {
    for (let k = 0; k < this.size; k++) {
      if (this.data[k] === value) return k;
    }
    return -1;
  }

  private grow() {
    const bigger = new Array(this.data.length * 2);
    for (let k = 0; k < this.size; k++) bigger[k] = this.data[k];
    this.data = bigger;
  }
}`;

export const pseudocode = `structure DynamicArray
  data ← array of capacity 8
  size ← 0

  procedure insert(index, value)
    if size = capacity then grow()
    for k ← size down to index + 1 do
      data[k] ← data[k − 1]    ▷ shift right
    end for
    data[index] ← value
    size ← size + 1
  end procedure

  procedure delete(index)
    for k ← index to size − 2 do
      data[k] ← data[k + 1]    ▷ shift left
    end for
    size ← size − 1
  end procedure

  procedure search(value)
    for k ← 0 to size − 1 do
      if data[k] = value then return k
    end for
    return −1
  end procedure

  procedure grow()
    bigger ← array of capacity 2 × capacity
    copy data[0..size) into bigger
    data ← bigger
  end procedure
end structure`;

export const meta = {
  slug: "array",
  name: "Dynamic Array",
  category: "structures",
  renderer: "array-bars",
  description:
    "A contiguous block of slots with a size and a capacity. Inserting or deleting in the middle shifts every later element one slot over, and a full array doubles its capacity. That keeps appends at amortised O(1), while edits in the middle cost O(n).",
  complexity: {
    time: { best: "O(1)", average: "O(n)", worst: "O(n)" },
    space: "O(n)",
  },
  source,
  pseudocode,
  defaultInput: {
    kind: "sequence",
    initial: [42, 17, 88, 23, 65, 9],
    ops: [
      { op: "insert", index: 2, value: 50 },
      { op: "delete", index: 0 },
      { op: "insert", index: 6, value: 31 },
      { op: "insert", index: 1, value: 74 },
      { op: "search", value: 23 },
    ],
  },
} satisfies AlgorithmMeta;

export function* run({ initial, ops }: ResolvedInput<"sequence">): Generator<Step<SlotArrayState>> {
  const t = createTracer<SlotArrayState>(["shifts", "resizes"]);
  const make = itemFactory("a");
  let capacity = 8;
  while (capacity < initial.length) capacity *= 2;
  let data: Slot[] = Array.from({ length: capacity }, (_, k) => (k < initial.length ? make(initial[k]) : null));
  let size = initial.length;
  const state = (pointers: SlotArrayState["pointers"] = {}): SlotArrayState => ({ slots: data, size, pointers });
  const live = () => data.slice(0, size).flatMap((x) => (x ? [x.id] : []));

  yield t.step(state(), [], [2, 3], { size, capacity }, `An array holding ${size} values in ${capacity} slots`);

  for (const op of ops) {
    if (op.op === "insert") {
      const value = op.value ?? 0;
      const index = op.index ?? size;
      yield t.step(state({ index }), [], 5, { index, value, size, capacity }, `${opLabel(op)}: insert ${value} at index ${index}`);
      if (index < 0 || index > size) {
        yield t.step(state(), [], 5, { index, size }, `Index ${index} is outside 0…${size} , so nothing changes`);
        continue;
      }
      if (size === capacity) {
        capacity *= 2;
        data = [...data, ...Array<Slot>(capacity - data.length).fill(null)];
        t.count("resizes");
        yield t.step(state(), [hl("range", ...live())], [28, 31], { size, capacity }, `The array is full: allocate ${capacity} slots and copy the ${size} values over`);
      }
      for (let k = size; k > index; k--) {
        data[k] = data[k - 1];
        data[k - 1] = null;
        t.count("shifts");
        yield t.step(state({ k }), [hl("swap", data[k]!.id)], [7, 8], { index, value, k }, `Shift ${data[k]!.value} right into slot ${k}`);
      }
      const item = make(value);
      data[index] = item;
      size++;
      yield t.step(state({ index }), [hl("insert", item.id)], [10, 11], { index, value, size }, `Write ${value} into slot ${index}; size is now ${size}`);
    } else if (op.op === "delete") {
      const index = op.index ?? size - 1;
      yield t.step(state({ index }), [], 14, { index, size }, `${opLabel(op)}: delete the value at index ${index}`);
      if (index < 0 || index >= size) {
        yield t.step(state(), [], 14, { index, size }, `Index ${index} is outside 0…${size - 1} , so nothing changes`);
        continue;
      }
      const removed = data[index]!;
      yield t.step(state({ index }), [hl("delete", removed.id)], 14, { index, size }, `${removed.value} will be overwritten by the values after it`);
      data[index] = null;
      for (let k = index; k < size - 1; k++) {
        data[k] = data[k + 1];
        data[k + 1] = null;
        t.count("shifts");
        yield t.step(state({ k }), [hl("swap", data[k]!.id)], [15, 16], { index, k }, `Shift ${data[k]!.value} left into slot ${k}`);
      }
      size--;
      yield t.step(state(), [], 18, { size }, index === size ? `Drop the last value; size is now ${size}` : `size is now ${size}`);
    } else if (op.op === "search") {
      const value = op.value ?? 0;
      yield t.step(state(), [], 21, { value }, `${opLabel(op)}: scan for ${value}`);
      let found = -1;
      for (let k = 0; k < size; k++) {
        const item = data[k]!;
        if (item.value === value) {
          found = k;
          yield t.step(state({ k }), [hl("found", item.id)], 23, { value, k, result: k }, `Found ${value} at index ${k}`);
          break;
        }
        yield t.step(state({ k }), [hl("compare", item.id)], 23, { value, k }, `${item.value} ≠ ${value}`);
      }
      if (found === -1) yield t.step(state(), [hl("notfound", ...live())], 25, { value, result: -1 }, `${value} is not in the array`);
    } else {
      yield t.step(state(), [], 1, {}, `Skipping ${opLabel(op)}: it is not an array operation`);
    }
  }
  yield t.step(state(), [], 1, { size, capacity }, `Done: ${size} values in ${capacity} slots`);
}
