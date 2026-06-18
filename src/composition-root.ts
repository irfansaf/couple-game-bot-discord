import type { RuntimeConfig } from "./config/env";
import { summarizeConfig } from "./config/env";
import { PrivateAnswerCoordinator } from "./application/services/private-answer-coordinator";
import { PromptQueueRefiller } from "./application/services/prompt-queue-refiller";
import { GetGameSessionUseCase } from "./application/use-cases/get-game-session";
import { HandleGameActionUseCase } from "./application/use-cases/handle-game-action";
import { RefillPromptQueueUseCase } from "./application/use-cases/refill-prompt-queue";
import { StartGameSessionUseCase } from "./application/use-cases/start-game-session";
import { OpenAiCompatibleQuestionGenerator } from "./infrastructure/ai/openai-compatible-question-generator";
import { BufferedAiOutputCapture } from "./infrastructure/ai/ai-output-capture";
import { createDiscordClient } from "./infrastructure/discord/client";
import { registerGuildCommands } from "./infrastructure/discord/register-commands";
import { AiFirstPromptCatalog } from "./infrastructure/content/ai-first-prompt-catalog";
import { StaticPromptCatalog } from "./infrastructure/content/static-prompt-catalog";
import { PinoLogger } from "./infrastructure/logging/logger";
import { createPostgresConnection } from "./infrastructure/postgres/client";
import { PostgresAiOutputCaptureRepository } from "./infrastructure/postgres/postgres-ai-output-capture-repository";
import { PostgresSessionIdGenerator } from "./infrastructure/postgres/postgres-session-id-generator";
import { PostgresSessionRepository } from "./infrastructure/postgres/postgres-session-repository";
import { DiscordGameController } from "./presentation/discord/game-controller";
import { gameStartCommand } from "./presentation/discord/game-command";

export function createApp(config: RuntimeConfig) {
  const logger = new PinoLogger(config.logLevel);
  const postgres = createPostgresConnection(config.database);
  const sessions = new PostgresSessionRepository(postgres);
  const sessionIds = new PostgresSessionIdGenerator(postgres);
  const staticPromptCatalog = new StaticPromptCatalog();
  const aiOutputCapture = config.ai.enabled && config.ai.outputCapture.enabled
    ? new BufferedAiOutputCapture(
        new PostgresAiOutputCaptureRepository(postgres),
        {
          batchSize: config.ai.outputCapture.batchSize,
          flushIntervalMs: config.ai.outputCapture.flushIntervalMs,
        },
        logger,
      )
    : null;
  const questionGenerator = config.ai.enabled
    ? new OpenAiCompatibleQuestionGenerator(
        config.ai,
        undefined,
        logger,
        aiOutputCapture ?? undefined,
      )
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
    config.sessions.ttlMs,
  );
  const handleGameAction = new HandleGameActionUseCase(sessions, queueRefiller);
  const getGameSession = new GetGameSessionUseCase(sessions);
  const refillPromptQueue = new RefillPromptQueueUseCase(sessions, queueRefiller);
  const privateAnswers = new PrivateAnswerCoordinator();
  const gameController = new DiscordGameController(
    startGameSession,
    getGameSession,
    handleGameAction,
    refillPromptQueue,
    privateAnswers,
    logger,
  );

  return {
    logger,
    configSummary: summarizeConfig(config),
    discordClient,
    questionGenerator,
    startGameSession,
    getGameSession,
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
      await aiOutputCapture?.close();
      await postgres.close();
    },
  };
}
