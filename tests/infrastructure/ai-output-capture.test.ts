import { describe, expect, it } from "vitest";

import type {
  AiOutputCaptureRecord,
  AiOutputCaptureRepository,
} from "../../src/application/ports/ai-output-capture-repository";
import {
  BufferedAiOutputCapture,
  buildAiOutputCaptureRecord,
} from "../../src/infrastructure/ai/ai-output-capture";
import { createIntensity } from "../../src/domain/value-objects/intensity";

describe("BufferedAiOutputCapture", () => {
  it("stores queued records in batches", async () => {
    const repository = new MemoryAiOutputCaptureRepository();
    const capture = new BufferedAiOutputCapture(repository, {
      batchSize: 2,
      flushIntervalMs: 10000,
    });

    capture.enqueue(fakeRecord("First prompt?"));
    expect(repository.batches).toHaveLength(0);

    capture.enqueue(fakeRecord("Second prompt?"));
    await capture.close();

    expect(repository.batches).toHaveLength(1);
    expect(repository.batches[0]).toHaveLength(2);
  });

  it("builds privacy-light records from generated content", () => {
    const record = buildAiOutputCaptureRecord({
      config: {
        enabled: true,
        baseUrl: "https://api.deepseek.com",
        apiKey: "secret",
        model: "deepseek-v4-flash",
        timeoutMs: 30000,
        maxAttempts: 3,
        maxTokens: 1800,
        temperature: 1.15,
        maxContextTokens: 16000,
        outputCapture: {
          enabled: true,
          batchSize: 20,
          flushIntervalMs: 10000,
        },
        thinkingMode: "auto",
      },
      input: {
        type: "after_dark",
        mood: "flirty_safe",
        intensity: createIntensity(2),
        recentQuestions: ["Do not persist this recent history."],
      },
      count: 1,
      attempt: 1,
      content: JSON.stringify({
        questions: [
          {
            type: "after_dark",
            mood: "flirty_safe",
            intensity: 2,
            question: "What private compliment would feel warm tonight?",
            safetyNotes: [],
          },
        ],
      }),
      now: new Date("2026-06-18T00:00:00.000Z"),
    });

    expect(record).toMatchObject({
      provider: "openai-compatible",
      model: "deepseek-v4-flash",
      promptType: "after_dark",
      validationStatus: "valid",
      questionCount: 1,
    });
    expect(JSON.stringify(record)).not.toContain("secret");
    expect(JSON.stringify(record)).not.toContain("recent history");
  });
});

class MemoryAiOutputCaptureRepository implements AiOutputCaptureRepository {
  public readonly batches: readonly AiOutputCaptureRecord[][] = [];

  public async saveBatch(
    records: readonly AiOutputCaptureRecord[],
  ): Promise<void> {
    (this.batches as AiOutputCaptureRecord[][]).push([...records]);
  }
}

function fakeRecord(content: string): AiOutputCaptureRecord {
  return {
    provider: "openai-compatible",
    baseUrl: "https://example.test",
    model: "test-model",
    promptType: "truth",
    mood: "cozy",
    intensity: 1,
    playContext: null,
    requestedCount: 1,
    attempt: 1,
    maxTokens: 1800,
    temperature: 1.15,
    validationStatus: "valid",
    validationErrors: [],
    questionCount: 1,
    content,
    createdAt: new Date(),
  };
}
