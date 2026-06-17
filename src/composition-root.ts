import type { RuntimeConfig } from "./config/env";
import { summarizeConfig } from "./config/env";
import { PromptQueueRefiller } from "./application/services/prompt-queue-refiller";
import { HandleGameActionUseCase } from "./application/use-cases/handle-game-action";
import { RefillPromptQueueUseCase } from "./application/use-cases/refill-prompt-queue";
import { StartGameSessionUseCase } from "./application/use-cases/start-game-session";
import { OpenAiCompatibleQuestionGenerator } from "./infrastructure/ai/openai-compatible-question-generator";
import { createDiscordClient } from "./infrastructure/discord/client";
import { registerGuildCommands } from "./infrastructure/discord/register-commands";
import { AiFirstPromptCatalog } from "./infrastructure/content/ai-first-prompt-catalog";
import { StaticPromptCatalog } from "./infrastructure/content/static-prompt-catalog";
import { ConsoleLogger } from "./infrastructure/logging/logger";
import { createPostgresConnection } from "./infrastructure/postgres/client";
import { PostgresSessionIdGenerator } from "./infrastructure/postgres/postgres-session-id-generator";
import { PostgresSessionRepository } from "./infrastructure/postgres/postgres-session-repository";
import { DiscordGameController } from "./presentation/discord/game-controller";
import { gameStartCommand } from "./presentation/discord/game-command";

export function createApp(config: RuntimeConfig) {
  const logger = new ConsoleLogger();
  const postgres = createPostgresConnection(config.database);
  const sessions = new PostgresSessionRepository(postgres);
  const sessionIds = new PostgresSessionIdGenerator(postgres);
  const staticPromptCatalog = new StaticPromptCatalog();
  const questionGenerator = config.ai.enabled
    ? new OpenAiCompatibleQuestionGenerator(config.ai)
    : null;
  const promptCatalog =
    questionGenerator === null
      ? staticPromptCatalog
      : new AiFirstPromptCatalog(questionGenerator, staticPromptCatalog, logger);
  const queueRefiller = new PromptQueueRefiller(promptCatalog);
  const discordClient = createDiscordClient();
  const startGameSession = new StartGameSessionUseCase(
    sessions,
    sessionIds,
    queueRefiller,
  );
  const handleGameAction = new HandleGameActionUseCase(sessions, queueRefiller);
  const refillPromptQueue = new RefillPromptQueueUseCase(sessions, queueRefiller);
  const gameController = new DiscordGameController(
    startGameSession,
    handleGameAction,
    refillPromptQueue,
    logger,
  );

  return {
    logger,
    configSummary: summarizeConfig(config),
    discordClient,
    questionGenerator,
    startGameSession,
    handleGameAction,
    refillPromptQueue,
    start: async () => {
      gameController.register(discordClient);
      await registerGuildCommands(config.discord, [gameStartCommand]);
      await discordClient.login(config.discord.token);
      logger.info("CoupleGame Discord bot started.", summarizeConfig(config));
    },
    close: async () => {
      discordClient.destroy();
      await postgres.close();
    },
  };
}
