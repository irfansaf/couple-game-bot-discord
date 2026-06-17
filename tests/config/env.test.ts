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
