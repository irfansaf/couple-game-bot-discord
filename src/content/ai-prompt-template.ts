import type { GenerateQuestionInput } from "../application/ports/question-generator";
import { intensityValue } from "../domain/value-objects/intensity";
import { buildAiSystemPrompt } from "./ai-prompt-catalog";

export interface ChatMessage {
  readonly role: "system" | "user";
  readonly content: string;
}

export interface QuestionGenerationMessageOptions {
  readonly maxContextTokens?: number | undefined;
}

export function buildQuestionGenerationMessages(
  input: GenerateQuestionInput,
  options: QuestionGenerationMessageOptions = {},
): readonly ChatMessage[] {
  const systemContent = buildAiSystemPrompt({
    promptType: input.type,
    responseShape: "single",
  });
  const recentQuestions = fitRecentQuestionsToContext({
    input,
    systemContent,
    maxContextTokens: options.maxContextTokens,
  });

  return [
    {
      role: "system",
      content: systemContent,
    },
    {
      role: "user",
      content: buildUserPrompt(input, recentQuestions),
    },
  ];
}

export function buildBatchQuestionGenerationMessages(
  input: GenerateQuestionInput,
  count: number,
  options: QuestionGenerationMessageOptions = {},
): readonly ChatMessage[] {
  const systemContent = buildAiSystemPrompt({
    promptType: input.type,
    responseShape: "batch",
  });
  const recentQuestions = fitRecentQuestionsToContext({
    input,
    count,
    systemContent,
    maxContextTokens: options.maxContextTokens,
  });

  return [
    {
      role: "system",
      content: systemContent,
    },
    {
      role: "user",
      content: buildUserPrompt(input, recentQuestions, count),
    },
  ];
}

interface FitRecentQuestionsInput {
  readonly input: GenerateQuestionInput;
  readonly count?: number | undefined;
  readonly systemContent: string;
  readonly maxContextTokens?: number | undefined;
}

function fitRecentQuestionsToContext({
  input,
  count,
  systemContent,
  maxContextTokens,
}: FitRecentQuestionsInput): readonly string[] {
  if (maxContextTokens === undefined) {
    return input.recentQuestions;
  }

  let recentQuestions = [...input.recentQuestions];

  while (
    recentQuestions.length > 0 &&
    estimateMessagesTokens(systemContent, buildUserPrompt(input, recentQuestions, count)) >
      maxContextTokens
  ) {
    recentQuestions = recentQuestions.slice(0, -1);
  }

  return recentQuestions;
}

function buildUserPrompt(
  input: GenerateQuestionInput,
  recentQuestions: readonly string[],
  count?: number | undefined,
): string {
  return JSON.stringify({
    ...(count === undefined ? {} : { count }),
    type: input.type,
    mood: input.mood,
    intensity: intensityValue(input.intensity),
    playContext: input.playContext ?? "e_meet",
    recentQuestions,
  });
}

function estimateMessagesTokens(systemContent: string, userContent: string): number {
  return estimateTokens(systemContent) + estimateTokens(userContent);
}

function estimateTokens(value: string): number {
  return Math.ceil(value.length / 4);
}
