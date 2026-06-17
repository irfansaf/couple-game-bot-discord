import { afterEach, describe, expect, it } from "vitest";

import { OpenAiCompatibleQuestionGenerator } from "../../src/infrastructure/ai/openai-compatible-question-generator";
import { createIntensity } from "../../src/domain/value-objects/intensity";

const config = {
  enabled: true,
  baseUrl: "https://example.test/v1",
  apiKey: "test-key",
  model: "test-model",
  timeoutMs: 1000,
  maxAttempts: 3,
  maxTokens: 1800,
  temperature: 1.15,
  maxContextTokens: 16000,
  outputCapture: {
    enabled: false,
    batchSize: 20,
    flushIntervalMs: 10000,
  },
  thinkingMode: "auto",
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

  it("treats an empty follow-up as omitted", async () => {
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
                      followUp: "",
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

    const prompt = await new OpenAiCompatibleQuestionGenerator(config).generate(input);

    expect(prompt.followUp).toBeUndefined();
  });

  it("retries invalid AI responses before returning prompts", async () => {
    let calls = 0;

    globalThis.fetch = Object.assign(async () => {
      calls += 1;

      if (calls === 1) {
        return new Response(
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
                        question: "",
                        safetyNotes: [],
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        );
      }

      return new Response(
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
                      question: "What is one small comfort you noticed today?",
                      safetyNotes: [],
                    },
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      );
    }, originalFetch);

    const prompt = await new OpenAiCompatibleQuestionGenerator(config).generate(input);

    expect(calls).toBe(2);
    expect(prompt.text).toBe("What is one small comfort you noticed today?");
  });

  it("disables DeepSeek thinking mode by default for fast JSON prompts", async () => {
    let capturedBody: unknown;

    globalThis.fetch = Object.assign(async (_url: URL | RequestInfo, init?: RequestInit) => {
      capturedBody = JSON.parse(String(init?.body)) as unknown;

      return new Response(
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
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      );
    }, originalFetch);

    await new OpenAiCompatibleQuestionGenerator({
      ...config,
      baseUrl: "https://api.deepseek.com",
      model: "deepseek-v4-flash",
    }).generate(input);

    expect(capturedBody).toMatchObject({
      model: "deepseek-v4-flash",
      max_tokens: 1800,
      thinking: { type: "disabled" },
    });
  });

  it("trims old recent questions to stay within the configured context budget", async () => {
    let recentQuestions: unknown;

    globalThis.fetch = Object.assign(async (_url: URL | RequestInfo, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as {
        readonly messages?: readonly { readonly role: string; readonly content: string }[];
      };
      const userMessage = body.messages?.find((message) => message.role === "user");
      recentQuestions = userMessage === undefined
        ? undefined
        : (JSON.parse(userMessage.content) as { readonly recentQuestions: unknown })
            .recentQuestions;

      return new Response(
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
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      );
    }, originalFetch);

    await new OpenAiCompatibleQuestionGenerator({
      ...config,
      maxContextTokens: 320,
    }).generate({
      ...input,
      recentQuestions: [
        "newest prompt to keep",
        "middle prompt to drop because the budget is tiny",
        "oldest prompt to drop because it is least useful",
      ],
    });

    expect(recentQuestions).toEqual(["newest prompt to keep"]);
  });

  it("enqueues generated output captures without blocking prompt parsing", async () => {
    const captured: unknown[] = [];

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
                  ],
                }),
              },
            },
          ],
        }),
        { status: 200 },
      ), originalFetch);

    const prompt = await new OpenAiCompatibleQuestionGenerator(
      {
        ...config,
        outputCapture: {
          enabled: true,
          batchSize: 20,
          flushIntervalMs: 10000,
        },
      },
      undefined,
      undefined,
      {
        enqueue: (record) => captured.push(record),
        flush: async () => {},
        close: async () => {},
      },
    ).generate(input);

    expect(prompt.source).toBe("ai");
    expect(captured).toHaveLength(1);
    expect(captured[0]).toMatchObject({
      promptType: "truth",
      validationStatus: "valid",
      questionCount: 1,
    });
  });
});
