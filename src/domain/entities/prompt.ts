import type { PromptId } from "../value-objects/ids";
import type { Intensity } from "../value-objects/intensity";

export const gameModes = [
  "truth",
  "dare",
  "couple_question",
  "this_or_that",
] as const;

export type GameMode = (typeof gameModes)[number];

export const moods = ["cozy", "funny", "romantic", "deep", "flirty_safe"] as const;

export type Mood = (typeof moods)[number];

export type PromptSource = "static" | "ai";

export interface Prompt {
  readonly id: PromptId;
  readonly type: GameMode;
  readonly mood: Mood;
  readonly intensity: Intensity;
  readonly text: string;
  readonly followUp?: string;
  readonly safetyNotes: readonly string[];
  readonly source: PromptSource;
}
