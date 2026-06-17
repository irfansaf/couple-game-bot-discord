import type { GenerateQuestionInput } from "../application/ports/question-generator";
import { intensityValue } from "../domain/value-objects/intensity";
import { aiPromptSafetyRules } from "./safety-rules";

export interface ChatMessage {
  readonly role: "system" | "user";
  readonly content: string;
}

export function buildQuestionGenerationMessages(
  input: GenerateQuestionInput,
): readonly ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "You are a warm, playful Discord game host for a private couple server.",
        "Return only valid JSON with type, mood, intensity, question, optional followUp, and safetyNotes.",
        ...aiPromptSafetyRules,
      ].join("\n"),
    },
    {
      role: "user",
      content: JSON.stringify({
        type: input.type,
        mood: input.mood,
        intensity: intensityValue(input.intensity),
        recentQuestions: input.recentQuestions,
      }),
    },
  ];
}

export function buildBatchQuestionGenerationMessages(
  input: GenerateQuestionInput,
  count: number,
): readonly ChatMessage[] {
  return [
    {
      role: "system",
      content: [
        "You are a warm, playful Discord game host for a private couple server.",
        "Return only valid JSON with a questions array.",
        "Each item must include type, mood, intensity, question, optional followUp, and safetyNotes.",
        "Keep questions distinct from each other and from recentQuestions.",
        ...aiPromptSafetyRules,
      ].join("\n"),
    },
    {
      role: "user",
      content: JSON.stringify({
        count,
        type: input.type,
        mood: input.mood,
        intensity: intensityValue(input.intensity),
        recentQuestions: input.recentQuestions,
      }),
    },
  ];
}
