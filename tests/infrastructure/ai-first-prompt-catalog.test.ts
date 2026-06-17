import { describe, expect, it } from "vitest";

import type { QuestionGenerator } from "../../src/application/ports/question-generator";
import { AiFirstPromptCatalog } from "../../src/infrastructure/content/ai-first-prompt-catalog";
import { StaticPromptCatalog } from "../../src/infrastructure/content/static-prompt-catalog";
import type { Logger } from "../../src/infrastructure/logging/logger";
import { createPromptId } from "../../src/domain/value-objects/ids";
import { createIntensity } from "../../src/domain/value-objects/intensity";

const selectionInput = {
  type: "truth",
  mood: "cozy",
  intensity: createIntensity(1),
  recentPromptIds: [],
} as const;

describe("AiFirstPromptCatalog", () => {
  it("uses AI prompts when generation succeeds", async () => {
    const aiPromptId = createPromptId("ai-truth-1");
    const catalog = new AiFirstPromptCatalog(
      {
        generate: async () => ({
          id: aiPromptId,
          type: "truth",
          mood: "cozy",
          intensity: createIntensity(1),
          text: "What is one AI-generated thing you appreciate today?",
          safetyNotes: [],
          source: "ai",
        }),
        generateBatch: async () => [
          {
            id: aiPromptId,
            type: "truth",
            mood: "cozy",
            intensity: createIntensity(1),
            text: "What is one AI-generated thing you appreciate today?",
            safetyNotes: [],
            source: "ai",
          },
        ],
      } satisfies QuestionGenerator,
      new StaticPromptCatalog(),
      new SilentLogger(),
    );

    const prompt = await catalog.select(selectionInput);

    expect(prompt?.id).toBe(aiPromptId);
    expect(prompt?.source).toBe("ai");
  });

  it("falls back to static prompts when generation fails", async () => {
    const logger = new SilentLogger();
    const catalog = new AiFirstPromptCatalog(
      {
        generate: async () => {
          throw new Error("provider down");
        },
        generateBatch: async () => {
          throw new Error("provider down");
        },
      } satisfies QuestionGenerator,
      new StaticPromptCatalog(),
      logger,
    );

    const prompt = await catalog.select(selectionInput);

    expect(prompt?.source).toBe("static");
    expect(logger.warnings).toHaveLength(1);
  });

  it("uses batch generation before falling back", async () => {
    const aiPromptId = createPromptId("ai-batch-truth-1");
    const catalog = new AiFirstPromptCatalog(
      {
        generate: async () => {
          throw new Error("unused");
        },
        generateBatch: async () => [
          {
            id: aiPromptId,
            type: "truth",
            mood: "cozy",
            intensity: createIntensity(1),
            text: "What is one batch-generated thing you appreciate today?",
            safetyNotes: [],
            source: "ai",
          },
        ],
      } satisfies QuestionGenerator,
      new StaticPromptCatalog(),
      new SilentLogger(),
    );

    const prompts = await catalog.selectBatch(selectionInput, 3);

    expect(prompts).toHaveLength(1);
    expect(prompts[0]?.source).toBe("ai");
  });
});

class SilentLogger implements Logger {
  public readonly warnings: string[] = [];

  public debug(): void {}

  public info(): void {}

  public warn(message: string): void {
    this.warnings.push(message);
  }

  public error(): void {}
}
