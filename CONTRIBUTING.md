# Contributing to algo·visual

Thanks for helping. This project exists so students can watch algorithms run, so any change that makes something easier to understand is welcome, even a one-word fix to a step explanation.

## Start with an issue

- Requesting an algorithm or a feature, or reporting a bug? Use one of the [issue forms](../../issues/new/choose).
- Planning a pull request that adds an algorithm, a renderer or a new page? Open an issue first (or comment on an existing one) so we can agree on the approach before you spend time on it.
- Small fixes such as typos, wrong highlights or broken links can go straight to a pull request.

## Set up

You need Node.js 20.9 or newer and pnpm. Running `corepack enable` once gives you the pnpm version pinned in `package.json`.

```bash
git clone https://github.com/ImranSefat/algo-visual.git
cd algo-visual
pnpm install
pnpm dev
```

Before opening a pull request, make sure all three pass:

```bash
pnpm lint
pnpm test
pnpm build
```

## How the code is organised

| Path | What lives there |
|---|---|
| `src/algorithms/core` | Step and metadata types, the step tracer, renderer state shapes, input specs, validation, seeded randomness |
| `src/algorithms/<category>` | One file per algorithm |
| `src/algorithms/registry.ts` | The list of algorithms every page reads from |
| `src/algorithms/__tests__` | Invariant and correctness tests |
| `src/components/renderers` | One renderer per kind of picture (bars, trees, grids…) |
| `src/components/controls` | Input editors |
| `src/store` | Playback and input stores |

The one hard rule: nothing in `src/algorithms` may import React or touch the DOM. Algorithms produce data, and renderers draw it.

## Adding an algorithm

1. Create `src/algorithms/<category>/<slug>.ts`. Copy the shape of a similar algorithm; [`bubble-sort.ts`](src/algorithms/sorting/bubble-sort.ts) is the simplest example. A module exports:
   - `source`: the TypeScript shown in the code panel. It has the same logic as your generator, without the `yield` lines.
   - `pseudocode` (optional): it must have exactly as many lines as `source`, because line N of the pseudocode is highlighted whenever line N of the source is.
   - `meta`: name, category, renderer, a two or three sentence description, honest complexity and a default input. Write it `satisfies AlgorithmMeta`.
   - `run`: a generator that yields steps built with `createTracer()`.
2. Make each step count:
   - `line` points at the line of `source` that is executing (a number, or `[from, to]` for a range).
   - `note` is one plain sentence explaining what just happened, such as "Compare 42 and 17".
   - Use highlight kinds for what they mean: `compare`, `swap`, `sorted`, `current`, `visited`, `frontier`, `path`, `found` and so on.
   - Create items once with stable ids and never mutate them. `Object.freeze` them, or use `makeItems` or `itemFactory`.
3. Add the module to `modules` in [`registry.ts`](src/algorithms/registry.ts). The landing page, ⌘K search, static routes and OG image pick it up automatically.
4. Test it. `lines.test.ts` and `randomise.test.ts` already check every registered algorithm: lines stay inside `source`, pseudocode is aligned, every step has a note, and randomised inputs don't break it. Add a correctness test that compares the final result against an independent reference implementation, like the existing tests in `src/algorithms/__tests__`.

If none of the existing renderers fits, discuss it in an issue first. A new renderer needs a state type in `src/algorithms/core/states.ts`, a component in `src/components/renderers` that is a pure function of the step, and an entry in `src/components/renderers/index.ts`.

## Style

- TypeScript strict mode, double quotes, semicolons, two-space indentation. `pnpm lint` catches most of it.
- Keep functions small and comments rare. Write a comment when it explains why something is done, not what the code does.
- Write user-facing text as plain sentences. Avoid marketing language and long dashes.
- Every animation duration comes from `useStepDuration()`, so playback at 8× never lags.

## Pull requests

- Keep one change per pull request, for example one algorithm or one fix.
- Include a screenshot or short screen recording for anything visual.
- Link the issue it closes.

By contributing, you agree that your contributions are licensed under the [MIT License](LICENSE).
