import type { GameMode, Mood, Prompt } from "../../domain/entities/prompt";
import type { PromptId } from "../../domain/value-objects/ids";
import type { Intensity } from "../../domain/value-objects/intensity";

export interface PromptSelectionInput {
  readonly type: GameMode;
  readonly mood: Mood;
  readonly intensity: Intensity;
  readonly recentPromptIds: readonly PromptId[];
}

export interface PromptCatalog {
  select(input: PromptSelectionInput): Promise<Prompt | null>;
  selectBatch(input: PromptSelectionInput, count: number): Promise<readonly Prompt[]>;
}
