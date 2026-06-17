import type { Mood, Prompt, PromptType } from "../../domain/entities/prompt";
import type { Intensity } from "../../domain/value-objects/intensity";

export interface GenerateQuestionInput {
  readonly type: PromptType;
  readonly mood: Mood;
  readonly intensity: Intensity;
  readonly recentQuestions: readonly string[];
}

export interface QuestionGenerator {
  generate(input: GenerateQuestionInput): Promise<Prompt>;
  generateBatch(
    input: GenerateQuestionInput,
    count: number,
  ): Promise<readonly Prompt[]>;
}
