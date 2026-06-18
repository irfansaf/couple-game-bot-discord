import { describe, expect, it } from "vitest";

import {
  normalizeGeneratedAiOutputPayload,
  validateGeneratedAiOutputPayload,
} from "../../src/content/ai-generated-output";

describe("ai generated output validation", () => {
  it("accepts raw generated batches", () => {
    const result = validateGeneratedAiOutputPayload({
      questions: [
        {
          type: "couple_question",
          mood: "romantic",
          intensity: 2,
          question: "What small ritual would you like us to repeat?",
          followUp: "",
          safetyNotes: "",
        },
      ],
    });

    expect(result).toEqual({
      status: "valid",
      questionCount: 1,
      errors: [],
    });
  });

  it("accepts OpenAI-compatible chat completion captures", () => {
    const batch = normalizeGeneratedAiOutputPayload({
      choices: [
        {
          message: {
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
          },
        },
      ],
    });

    expect(batch.questions).toHaveLength(1);
    expect(batch.questions[0]?.type).toBe("after_dark");
  });

  it("accepts provider batches returned as bare arrays", () => {
    const result = validateGeneratedAiOutputPayload([
      {
        type: "after_dark",
        mood: "flirty_safe",
        intensity: 2,
        question: "What private compliment would feel warm tonight?",
        safetyNotes: [],
      },
    ]);

    expect(result).toEqual({
      status: "valid",
      questionCount: 1,
      errors: [],
    });
  });

  it("reports schema and safety failures", () => {
    const unsafe = validateGeneratedAiOutputPayload({
      questions: [
        {
          type: "after_dark",
          mood: "flirty_safe",
          intensity: 2,
          question: "Do this without consent.",
          safetyNotes: [],
        },
      ],
    });
    const invalid = validateGeneratedAiOutputPayload({
      questions: [
        {
          type: "after_dark",
          mood: "flirty_safe",
          intensity: 9,
          question: "Too intense.",
          safetyNotes: [],
        },
      ],
    });

    expect(unsafe.status).toBe("invalid");
    expect(unsafe.errors[0]).toContain("safety");
    expect(invalid.status).toBe("invalid");
    expect(invalid.errors[0]).toContain("intensity");
  });
});
