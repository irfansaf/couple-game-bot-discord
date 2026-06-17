import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

import { loadEnv } from "../../src/config/env";

const baseEnv = {
  NODE_ENV: "development",
  LOG_LEVEL: "info",
  DISCORD_TOKEN: "discord-token",
  DISCORD_CLIENT_ID: "client-id",
  DISCORD_GUILD_ID: "guild-id",
  DATABASE_URL: "postgres://postgres:postgres@localhost:5432/couplegame",
  POSTGRES_SSL: "false",
};

describe("loadEnv", () => {
  it("allows AI configuration to be disabled for the static MVP", () => {
    const config = loadEnv(baseEnv);

    expect(config.ai.enabled).toBe(false);
    expect(config.database.ssl).toBe(false);
  });

  it("enables AI only when key and model are configured together", () => {
    const config = loadEnv({
      ...baseEnv,
      AI_API_KEY: "ai-key",
      AI_MODEL: "deepseek-chat",
    });

    expect(config.ai).toMatchObject({
      enabled: true,
      apiKey: "ai-key",
      model: "deepseek-chat",
      timeoutMs: 30000,
      maxAttempts: 3,
      maxTokens: 1800,
      temperature: 1.15,
      maxContextTokens: 16000,
      thinkingMode: "auto",
    });
  });

  it("allows AI provider tuning for fast prompt generation", () => {
    const config = loadEnv({
      ...baseEnv,
      AI_API_KEY: "ai-key",
      AI_MODEL: "deepseek-v4-flash",
      AI_TIMEOUT_MS: "15000",
      AI_MAX_ATTEMPTS: "2",
      AI_MAX_TOKENS: "900",
      AI_TEMPERATURE: "1.3",
      AI_MAX_CONTEXT_TOKENS: "4096",
      AI_THINKING_MODE: "disabled",
    });

    expect(config.ai).toMatchObject({
      enabled: true,
      model: "deepseek-v4-flash",
      timeoutMs: 15000,
      maxAttempts: 2,
      maxTokens: 900,
      temperature: 1.3,
      maxContextTokens: 4096,
      thinkingMode: "disabled",
    });
  });

  it("rejects partial AI configuration", () => {
    expect(() =>
      loadEnv({
        ...baseEnv,
        AI_API_KEY: "ai-key",
      }),
    ).toThrow(ZodError);
  });
});
