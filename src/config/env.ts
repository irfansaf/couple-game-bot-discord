import "dotenv/config";

import { z } from "zod";

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  DISCORD_TOKEN: z.string().min(1, "DISCORD_TOKEN is required."),
  DISCORD_CLIENT_ID: z.string().min(1, "DISCORD_CLIENT_ID is required."),
  DISCORD_GUILD_ID: z.string().min(1, "DISCORD_GUILD_ID is required."),
  AI_BASE_URL: z
    .string()
    .url("AI_BASE_URL must be a valid URL.")
    .default("https://api.openai.com/v1"),
  AI_API_KEY: z.string().trim().default(""),
  AI_MODEL: z.string().trim().default(""),
  AI_TIMEOUT_MS: z.coerce.number().int().positive().default(30000),
  AI_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(3).default(3),
  AI_MAX_TOKENS: z.coerce.number().int().positive().default(1800),
  AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(1.15),
  AI_MAX_CONTEXT_TOKENS: z.coerce.number().int().min(1024).default(16000),
  AI_CAPTURE_OUTPUTS: z.enum(["true", "false"]).default("false"),
  AI_CAPTURE_BATCH_SIZE: z.coerce.number().int().min(1).max(500).default(20),
  AI_CAPTURE_FLUSH_INTERVAL_MS: z.coerce
    .number()
    .int()
    .min(1000)
    .default(10000),
  AI_THINKING_MODE: z
    .enum(["auto", "disabled", "enabled", "provider_default"])
    .default("auto"),
  SESSION_TTL_MINUTES: z.coerce.number().int().min(5).max(4320).default(360),
  DATABASE_URL: z
    .string()
    .url("DATABASE_URL must be a valid Postgres URL.")
    .refine(
      (value) => value.startsWith("postgres://") || value.startsWith("postgresql://"),
      "DATABASE_URL must use postgres:// or postgresql://.",
    ),
  POSTGRES_SSL: z.enum(["true", "false"]).default("false"),
}).superRefine((value, context) => {
  const hasAiKey = value.AI_API_KEY.length > 0;
  const hasAiModel = value.AI_MODEL.length > 0;

  if (hasAiKey !== hasAiModel) {
    context.addIssue({
      code: "custom",
      path: hasAiKey ? ["AI_MODEL"] : ["AI_API_KEY"],
      message: "AI_API_KEY and AI_MODEL must be configured together.",
    });
  }
});

export interface AiProviderConfig {
  readonly enabled: true;
  readonly baseUrl: string;
  readonly apiKey: string;
  readonly model: string;
  readonly timeoutMs: number;
  readonly maxAttempts: number;
  readonly maxTokens: number;
  readonly temperature: number;
  readonly maxContextTokens: number;
  readonly outputCapture: AiOutputCaptureConfig;
  readonly thinkingMode: "auto" | "disabled" | "enabled" | "provider_default";
}

export interface DisabledAiConfig {
  readonly enabled: false;
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly maxAttempts: number;
  readonly maxTokens: number;
  readonly temperature: number;
  readonly maxContextTokens: number;
  readonly outputCapture: AiOutputCaptureConfig;
  readonly thinkingMode: "auto" | "disabled" | "enabled" | "provider_default";
}

export type AiConfig = AiProviderConfig | DisabledAiConfig;

export interface AiOutputCaptureConfig {
  readonly enabled: boolean;
  readonly batchSize: number;
  readonly flushIntervalMs: number;
}

export interface RuntimeConfig {
  readonly nodeEnv: "development" | "test" | "production";
  readonly logLevel: "debug" | "info" | "warn" | "error";
  readonly discord: {
    readonly token: string;
    readonly clientId: string;
    readonly guildId: string;
  };
  readonly ai: AiConfig;
  readonly database: {
    readonly url: string;
    readonly ssl: boolean;
  };
  readonly sessions: {
    readonly ttlMinutes: number;
    readonly ttlMs: number;
  };
}

export function loadEnv(
  source: Record<string, string | undefined> = process.env,
): RuntimeConfig {
  const parsed = environmentSchema.parse(source);

  return {
    nodeEnv: parsed.NODE_ENV,
    logLevel: parsed.LOG_LEVEL,
    discord: {
      token: parsed.DISCORD_TOKEN,
      clientId: parsed.DISCORD_CLIENT_ID,
      guildId: parsed.DISCORD_GUILD_ID,
    },
    ai:
      parsed.AI_API_KEY.length > 0
        ? {
            enabled: true,
            baseUrl: parsed.AI_BASE_URL,
            apiKey: parsed.AI_API_KEY,
            model: parsed.AI_MODEL,
            timeoutMs: parsed.AI_TIMEOUT_MS,
            maxAttempts: parsed.AI_MAX_ATTEMPTS,
            maxTokens: parsed.AI_MAX_TOKENS,
            temperature: parsed.AI_TEMPERATURE,
            maxContextTokens: parsed.AI_MAX_CONTEXT_TOKENS,
            outputCapture: {
              enabled: parsed.AI_CAPTURE_OUTPUTS === "true",
              batchSize: parsed.AI_CAPTURE_BATCH_SIZE,
              flushIntervalMs: parsed.AI_CAPTURE_FLUSH_INTERVAL_MS,
            },
            thinkingMode: parsed.AI_THINKING_MODE,
          }
        : {
            enabled: false,
            baseUrl: parsed.AI_BASE_URL,
            timeoutMs: parsed.AI_TIMEOUT_MS,
            maxAttempts: parsed.AI_MAX_ATTEMPTS,
            maxTokens: parsed.AI_MAX_TOKENS,
            temperature: parsed.AI_TEMPERATURE,
            maxContextTokens: parsed.AI_MAX_CONTEXT_TOKENS,
            outputCapture: {
              enabled: parsed.AI_CAPTURE_OUTPUTS === "true",
              batchSize: parsed.AI_CAPTURE_BATCH_SIZE,
              flushIntervalMs: parsed.AI_CAPTURE_FLUSH_INTERVAL_MS,
            },
            thinkingMode: parsed.AI_THINKING_MODE,
          },
    database: {
      url: parsed.DATABASE_URL,
      ssl: parsed.POSTGRES_SSL === "true",
    },
    sessions: {
      ttlMinutes: parsed.SESSION_TTL_MINUTES,
      ttlMs: parsed.SESSION_TTL_MINUTES * 60 * 1000,
    },
  };
}

export function summarizeConfig(config: RuntimeConfig): Record<string, unknown> {
  return {
    nodeEnv: config.nodeEnv,
    logLevel: config.logLevel,
    discord: {
      clientId: config.discord.clientId,
      guildId: config.discord.guildId,
      tokenConfigured: config.discord.token.length > 0,
    },
    ai: {
      enabled: config.ai.enabled,
      baseUrl: config.ai.baseUrl,
      model: config.ai.enabled ? config.ai.model : null,
      apiKeyConfigured: config.ai.enabled,
      timeoutMs: config.ai.timeoutMs,
      maxAttempts: config.ai.maxAttempts,
      maxTokens: config.ai.maxTokens,
      temperature: config.ai.temperature,
      maxContextTokens: config.ai.maxContextTokens,
      outputCapture: {
        enabled: config.ai.outputCapture.enabled,
        batchSize: config.ai.outputCapture.batchSize,
        flushIntervalMs: config.ai.outputCapture.flushIntervalMs,
      },
      thinkingMode: config.ai.thinkingMode,
    },
    database: {
      urlConfigured: config.database.url.length > 0,
      ssl: config.database.ssl,
    },
    sessions: {
      ttlMinutes: config.sessions.ttlMinutes,
    },
  };
}
