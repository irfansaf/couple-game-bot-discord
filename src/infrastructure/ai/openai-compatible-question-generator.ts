import { z } from "zod";

import type {
  GenerateQuestionInput,
  QuestionGenerator,
} from "../../application/ports/question-generator";
import type { AiProviderConfig } from "../../config/env";
import {
  buildBatchQuestionGenerationMessages,
  type ChatMessage,
} from "../../content/ai-prompt-template";
import { gameModes, moods, type Prompt } from "../../domain/entities/prompt";
import { createPromptId } from "../../domain/value-objects/ids";
import { createIntensity } from "../../domain/value-objects/intensity";
import { PromptSafetyPolicy } from "../../domain/services/prompt-safety-policy";

const generatedQuestionSchema = z.object({
  type: z.enum(gameModes),
  mood: z.enum(moods),
  intensity: z.number().int().min(1).max(3),
  question: z.string().min(5).max(280),
  followUp: z.string().min(1).max(180).optional(),
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

type GeneratedQuestion = z.infer<typeof generatedQuestionSchema>;

const generatedQuestionBatchSchema = z.object({
  questions: z.array(generatedQuestionSchema).min(1),
});

const chatCompletionSchema = z.object({
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

export class OpenAiCompatibleQuestionGenerator implements QuestionGenerator {
  public constructor(
    private readonly config: AiProviderConfig,
    private readonly safetyPolicy = new PromptSafetyPolicy(),
  ) {}

  public async generate(input: GenerateQuestionInput): Promise<Prompt> {
    const prompts = await this.generateBatch(input, 1);
    const prompt = prompts[0];

    if (prompt === undefined) {
      throw new Error("AI provider returned no generated prompts.");
    }

    return prompt;
  }

  public async generateBatch(
    input: GenerateQuestionInput,
    count: number,
  ): Promise<readonly Prompt[]> {
    if (!Number.isInteger(count) || count <= 0) {
      return [];
    }

    const completion = await this.createCompletion(
      buildBatchQuestionGenerationMessages(input, count),
    );
    const generatedBatch = generatedQuestionBatchSchema.parse(
      JSON.parse(completion) as unknown,
    );

    return generatedBatch.questions.slice(0, count).map((question) =>
      toPrompt(question, this.safetyPolicy),
    );
  }

  private async createCompletion(
    messages: readonly ChatMessage[],
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);

    try {
      const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          temperature: 0.7,
          response_format: { type: "json_object" },
          messages,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        throw new Error(`AI provider returned HTTP ${response.status}.`);
      }

      const payload: unknown = await response.json();
      const completion = chatCompletionSchema.parse(payload);
      const content = completion.choices[0]?.message.content;

      if (content === undefined) {
        throw new Error("AI provider returned no message content.");
      }

      return content;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function toPrompt(
  generated: GeneratedQuestion,
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
