import type {
  PromptCatalog,
  PromptSelectionInput,
} from "../../application/ports/prompt-catalog";
import type { QuestionGenerator } from "../../application/ports/question-generator";
import { intensityValue } from "../../domain/value-objects/intensity";
import type { Logger } from "../logging/logger";

export class AiFirstPromptCatalog implements PromptCatalog {
  public constructor(
    private readonly questionGenerator: QuestionGenerator,
    private readonly fallback: PromptCatalog,
    private readonly logger: Logger,
  ) {}

  public async select(input: PromptSelectionInput) {
    try {
      return await this.questionGenerator.generate({
        type: input.type,
        mood: input.mood,
        intensity: input.intensity,
        recentQuestions: input.recentPromptTexts,
        playContext: input.playContext,
      });
    } catch (error) {
      this.logger.warn("AI prompt generation failed. Falling back to static prompt.", {
        ...promptSelectionLogContext(input),
        error: error instanceof Error ? error.message : String(error),
      });

      return this.fallback.select(input);
    }
  }

  public async selectBatch(input: PromptSelectionInput, count: number) {
    try {
      this.logger.debug("AI-first prompt batch selection started.", {
        ...promptSelectionLogContext(input),
        count,
      });

      const prompts = await this.questionGenerator.generateBatch(
        {
          type: input.type,
          mood: input.mood,
          intensity: input.intensity,
          recentQuestions: input.recentPromptTexts,
          playContext: input.playContext,
        },
        count,
      );

      if (prompts.length > 0) {
        this.logger.debug("AI-first prompt batch selection succeeded.", {
          ...promptSelectionLogContext(input),
          count,
          generatedCount: prompts.length,
        });

        return prompts;
      }
    } catch (error) {
      this.logger.warn("AI prompt batch generation failed. Falling back to static prompts.", {
        ...promptSelectionLogContext(input),
        count,
        error: error instanceof Error ? error.message : String(error),
      });
    }

    return this.fallback.selectBatch(input, count);
  }
}

function promptSelectionLogContext(
  input: PromptSelectionInput,
): Record<string, unknown> {
  return {
    promptType: input.type,
    mood: input.mood,
    intensity: intensityValue(input.intensity),
    playContext: input.playContext ?? null,
    recentPromptCount: input.recentPromptIds.length,
    recentPromptTextCount: input.recentPromptTexts.length,
  };
}
