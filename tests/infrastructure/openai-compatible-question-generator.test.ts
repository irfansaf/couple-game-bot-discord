import { afterEach, describe, expect, it } from "vitest";

import { OpenAiCompatibleQuestionGenerator } from "../../src/infrastructure/ai/openai-compatible-question-generator";
import { createIntensity } from "../../src/domain/value-objects/intensity";

const config = {
  enabled: true,
  baseUrl: "https://example.test/v1",
  apiKey: "test-key",
  model: "test-model",
  timeoutMs: 1000,
} as const;

const input = {
  type: "truth",
  mood: "cozy",
  intensity: createIntensity(1),
  recentQuestions: [],
} as const;

describe("OpenAiCompatibleQuestionGenerator", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("parses validated JSON responses into prompts", async () => {
    globalThis.fetch = Object.assign(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  questions: [
                    {
                      type: "truth",
                      mood: "cozy",
                      intensity: 1,
                      question: "What is one tiny thing you appreciated today?",
                      followUp: "When did you notice it?",
                      safetyNotes: "Keep it soft.",
                    },
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ), originalFetch);

    const prompt = await new OpenAiCompatibleQuestionGenerator(config).generate(input);

    expect(prompt.source).toBe("ai");
    expect(prompt.text).toBe("What is one tiny thing you appreciated today?");
    expect(prompt.followUp).toBe("When did you notice it?");
    expect(prompt.safetyNotes).toEqual(["Keep it soft."]);
  });

  it("rejects unsafe follow-up text", async () => {
    globalThis.fetch = Object.assign(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  questions: [
                    {
                      type: "truth",
                      mood: "cozy",
                      intensity: 1,
                      question: "What is one tiny thing you appreciated today?",
                      followUp: "Ask for their password.",
                      safetyNotes: [],
                    },
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ), originalFetch);

    await expect(
      new OpenAiCompatibleQuestionGenerator(config).generate(input),
    ).rejects.toThrow("follow-up");
  });

  it("returns multiple prompts from one provider response", async () => {
    globalThis.fetch = Object.assign(async () =>
      new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  questions: [
                    {
                      type: "truth",
                      mood: "cozy",
                      intensity: 1,
                      question: "What is one tiny thing you appreciated today?",
                      safetyNotes: [],
                    },
                    {
                      type: "truth",
                      mood: "cozy",
                      intensity: 1,
                      question: "What is one sweet thing you want more of?",
                      safetyNotes: [],
                    },
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ), originalFetch);

    const prompts = await new OpenAiCompatibleQuestionGenerator(config).generateBatch(
      input,
      2,
    );

    expect(prompts).toHaveLength(2);
    expect(prompts.map((prompt) => prompt.source)).toEqual(["ai", "ai"]);
  });
});
