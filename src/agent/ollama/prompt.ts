/**
 * The instructions the model reads before every conversation, sent as the first ("system") message.
 *
 * TODO (#15): this is a placeholder. Try about 10 real questions with `pnpm agent:chat`, note what goes wrong,
 * and rewrite it until the model:
 *   - runs experiments instead of answering Big O from memory
 *   - never compares different counters (a swap is not a shift)
 *   - ends with a link when it ran something
 *   - says so when the tools can't answer the question
 */
export const SYSTEM_PROMPT = "You help people choose and understand algorithms. Use the tools to measure instead of guessing.";
