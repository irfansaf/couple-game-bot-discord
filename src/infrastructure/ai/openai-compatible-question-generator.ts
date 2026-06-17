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
import { moods, promptTypes, type Prompt } from "../../domain/entities/prompt";
import { createPromptId } from "../../domain/value-objects/ids";
import { createIntensity } from "../../domain/value-objects/intensity";
import { PromptSafetyPolicy } from "../../domain/services/prompt-safety-policy";
import type { Logger } from "../logging/logger";

const generatedQuestionSchema = z.object({
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
    private readonly logger?: Logger,
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

    const requestContext = buildAiRequestLogContext(input, count, this.config);

    for (let attempt = 1; attempt <= this.config.maxAttempts; attempt += 1) {
      const attemptStartedAt = Date.now();
      const attemptContext = {
        ...requestContext,
        attempt,
        maxAttempts: this.config.maxAttempts,
      };

      this.logger?.debug("AI prompt batch request started.", attemptContext);

      try {
        const completion = await this.createCompletion(
          buildBatchQuestionGenerationMessages(input, count),
          attemptContext,
        );
        const generatedBatch = generatedQuestionBatchSchema.parse(
          JSON.parse(completion) as unknown,
        );
        const prompts = generatedBatch.questions.slice(0, count).map((question) =>
          toPrompt(question, this.safetyPolicy),
        );

        this.logger?.debug("AI prompt batch request succeeded.", {
          ...attemptContext,
          durationMs: Date.now() - attemptStartedAt,
          generatedCount: prompts.length,
        });

        return prompts;
      } catch (error) {
        this.logger?.warn("AI prompt batch attempt failed.", {
          ...attemptContext,
          durationMs: Date.now() - attemptStartedAt,
          error: error instanceof Error ? error.message : String(error),
        });

        if (attempt === this.config.maxAttempts) {
          throw error;
        }
      }
    }

    throw new Error("AI provider exhausted prompt generation attempts.");
  }

  private async createCompletion(
    messages: readonly ChatMessage[],
    requestContext: Record<string, unknown>,
  ): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    const startedAt = Date.now();
    const endpoint = `${trimTrailingSlash(this.config.baseUrl)}/chat/completions`;

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          model: this.config.model,
          temperature: this.config.temperature,
          max_tokens: this.config.maxTokens,
          response_format: { type: "json_object" },
          messages,
          ...deepSeekThinkingPayload(this.config),
        }),
        signal: controller.signal,
      });
      const durationMs = Date.now() - startedAt;

      if (!response.ok) {
        const responsePreview = await readResponsePreview(response);

        this.logger?.warn("AI provider returned non-OK response.", {
          ...requestContext,
          durationMs,
          status: response.status,
          statusText: response.statusText,
          responsePreview,
        });

        throw new Error(`AI provider returned HTTP ${response.status}.`);
      }

      const payload: unknown = await response.json();
      const completion = chatCompletionSchema.parse(payload);
      const content = completion.choices[0]?.message.content;

      if (content === undefined) {
        throw new Error("AI provider returned no message content.");
      }

      return content;
    } catch (error) {
      const durationMs = Date.now() - startedAt;

      if (isAbortError(error)) {
        this.logger?.warn("AI provider request timed out.", {
          ...requestContext,
          durationMs,
          timeoutMs: this.config.timeoutMs,
        });

        throw new Error(`AI provider timed out after ${this.config.timeoutMs}ms.`);
      }

      this.logger?.debug("AI provider request failed.", {
        ...requestContext,
        durationMs,
        error: error instanceof Error ? error.message : String(error),
      });

      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }
}

function buildAiRequestLogContext(
  input: GenerateQuestionInput,
  count: number,
  config: AiProviderConfig,
): Record<string, unknown> {
  return {
    provider: "openai-compatible",
    baseUrl: config.baseUrl,
    model: config.model,
    timeoutMs: config.timeoutMs,
    maxAttempts: config.maxAttempts,
    maxTokens: config.maxTokens,
    thinkingMode: resolvedThinkingMode(config),
    promptType: input.type,
    mood: input.mood,
    playContext: input.playContext ?? null,
    count,
    recentQuestionCount: input.recentQuestions.length,
  };
}

function trimTrailingSlash(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function deepSeekThinkingPayload(
  config: AiProviderConfig,
): { readonly thinking?: { readonly type: "disabled" | "enabled" } } {
  if (!isDeepSeekBaseUrl(config.baseUrl)) {
    return {};
  }

  const thinkingMode = resolvedThinkingMode(config);

  if (thinkingMode === "provider_default") {
    return {};
  }

  return {
    thinking: { type: thinkingMode },
  };
}

function resolvedThinkingMode(
  config: AiProviderConfig,
): "disabled" | "enabled" | "provider_default" {
  if (config.thinkingMode === "auto") {
    return isDeepSeekBaseUrl(config.baseUrl) ? "disabled" : "provider_default";
  }

  return config.thinkingMode;
}

function isDeepSeekBaseUrl(baseUrl: string): boolean {
  try {
    return new URL(baseUrl).hostname.endsWith("deepseek.com");
  } catch {
    return false;
  }
}

async function readResponsePreview(response: Response): Promise<string> {
  const text = await response.text();

  return preview(text);
}

function preview(value: string): string {
  return value.length > 500 ? `${value.slice(0, 500)}...` : value;
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.message.toLowerCase().includes("aborted"))
  );
}

function emptyStringToUndefined(value: unknown): unknown {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();

  return trimmed.length === 0 ? undefined : trimmed;
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
