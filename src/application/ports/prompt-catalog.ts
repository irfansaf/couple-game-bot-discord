import type { Mood, Prompt, PromptType } from "../../domain/entities/prompt";
import type { PlayContext } from "../../domain/entities/game-session";
import type { PromptId } from "../../domain/value-objects/ids";
import type { Intensity } from "../../domain/value-objects/intensity";

export interface PromptSelectionInput {
  readonly type: PromptType;
  readonly mood: Mood;
  readonly intensity: Intensity;
  readonly recentPromptIds: readonly PromptId[];
  readonly recentPromptTexts: readonly string[];
  readonly playContext?: PlayContext | undefined;
}

export interface PromptCatalog {
  select(input: PromptSelectionInput): Promise<Prompt | null>;
  selectBatch(input: PromptSelectionInput, count: number): Promise<readonly Prompt[]>;
}
