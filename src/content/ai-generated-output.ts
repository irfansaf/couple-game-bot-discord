import { z } from "zod";

import { PromptSafetyPolicy } from "../domain/services/prompt-safety-policy";
import { moods, promptTypes, type Prompt } from "../domain/entities/prompt";
import { createPromptId } from "../domain/value-objects/ids";
import { createIntensity } from "../domain/value-objects/intensity";

export const generatedAiQuestionSchema = z.object({
  type: z.enum(promptTypes),
  mood: z.enum(moods),
  intensity: z.number().int().min(1).max(3),
  question: z.string().min(5).max(280),
  followUp: z.preprocess(
    emptyStringToUndefined,
    z.string().min(1).max(180).optional(),
  ),
  safetyNotes: z
    .union([z.array(z.string().max(120)), z.string().max(500)])
    .default([])
    .transform((value) => {
      if (Array.isArray(value)) {
        return value;
      }

      const trimmed = value.trim();

      return trimmed.length === 0 ? [] : [trimmed];
    }),
});

export type GeneratedAiQuestion = z.infer<typeof generatedAiQuestionSchema>;

export const generatedAiQuestionBatchSchema = z.object({
  questions: z.array(generatedAiQuestionSchema).min(1),
});

export type GeneratedAiQuestionBatch = z.infer<
  typeof generatedAiQuestionBatchSchema
>;

export const chatCompletionCaptureSchema = z.object({
  choices: z
    .array(
      z.object({
        message: z.object({
          content: z.string().min(1),
        }),
      }),
    )
    .min(1),
});

export interface AiOutputValidationReport {
  readonly status: "valid" | "invalid";
  readonly questionCount: number;
  readonly errors: readonly string[];
}

export function normalizeGeneratedAiOutputPayload(
  payload: unknown,
): GeneratedAiQuestionBatch {
  const chatCompletion = chatCompletionCaptureSchema.safeParse(payload);

  if (chatCompletion.success) {
    const content = chatCompletion.data.choices[0]?.message.content;

    if (content === undefined) {
      throw new Error("Chat completion capture has no message content.");
    }

    return normalizeGeneratedAiOutputPayload(JSON.parse(content) as unknown);
  }

  if (isRecord(payload) && typeof payload.content === "string") {
    return normalizeGeneratedAiOutputPayload(JSON.parse(payload.content) as unknown);
  }

  if (isRecord(payload) && "questions" in payload) {
    return generatedAiQuestionBatchSchema.parse(payload);
  }

  return generatedAiQuestionBatchSchema.parse({ questions: [payload] });
}

export function validateGeneratedAiOutputPayload(
  payload: unknown,
  safetyPolicy = new PromptSafetyPolicy(),
): AiOutputValidationReport {
  try {
    const batch = normalizeGeneratedAiOutputPayload(payload);
    const errors = batch.questions.flatMap((question, index) => {
      try {
        generatedAiQuestionToPrompt(question, safetyPolicy);

        return [];
      } catch (error) {
        return [
          `questions.${index}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        ];
      }
    });

    return {
      status: errors.length === 0 ? "valid" : "invalid",
      questionCount: batch.questions.length,
      errors,
    };
  } catch (error) {
    return {
      status: "invalid",
      questionCount: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

export function generatedAiQuestionToPrompt(
  generated: GeneratedAiQuestion,
  safetyPolicy: PromptSafetyPolicy,
): Prompt {
  if (!safetyPolicy.isAllowed(generated.question)) {
    throw new Error("AI provider returned a prompt that failed safety validation.");
  }

  if (
    generated.followUp !== undefined &&
    !safetyPolicy.isAllowed(generated.followUp)
  ) {
    throw new Error("AI provider returned a follow-up that failed safety validation.");
  }

  return {
    id: createPromptId(),
    type: generated.type,
    mood: generated.mood,
    intensity: createIntensity(generated.intensity),
    text: generated.question,
    safetyNotes: generated.safetyNotes,
    source: "ai",
    ...(generated.followUp === undefined
      ? {}
      : { followUp: generated.followUp }),
  };
}

function emptyStringToUndefined(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  return trimmed.length === 0 ? undefined : trimmed;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}
