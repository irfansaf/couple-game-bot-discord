import {
  createGameSession,
  dequeuePrompt,
  type GameSession,
} from "../../domain/entities/game-session";
import type { GameMode, Mood, Prompt } from "../../domain/entities/prompt";
import {
  createChannelId,
  createGuildId,
  createUserId,
} from "../../domain/value-objects/ids";
import { createIntensity } from "../../domain/value-objects/intensity";
import type { SessionIdGenerator } from "../ports/session-id-generator";
import type { SessionRepository } from "../ports/session-repository";
import { PromptQueueRefiller } from "../services/prompt-queue-refiller";

export interface StartGameSessionInput {
  readonly guildId: string;
  readonly channelId: string;
  readonly startedByUserId: string;
  readonly mode?: GameMode;
  readonly mood?: Mood;
  readonly intensity?: number;
  readonly now?: Date;
}

export interface StartGameSessionOutput {
  readonly session: GameSession;
  readonly prompt: Prompt;
}

export class StartGameSessionUseCase {
  public constructor(
    private readonly sessions: SessionRepository,
    private readonly sessionIds: SessionIdGenerator,
    private readonly queueRefiller: PromptQueueRefiller,
  ) {}

  public async execute(
    input: StartGameSessionInput,
  ): Promise<StartGameSessionOutput> {
    const sessionInput = {
      id: await this.sessionIds.next(),
      guildId: createGuildId(input.guildId),
      channelId: createChannelId(input.channelId),
      startedByUserId: createUserId(input.startedByUserId),
      mode: input.mode ?? "couple_question",
      mood: input.mood ?? "cozy",
      intensity: createIntensity(input.intensity ?? 1),
      ...(input.now === undefined ? {} : { now: input.now }),
    };

    const session = createGameSession(sessionInput);
    const queuedSession = await this.queueRefiller.fillToTarget(session);
    const dequeued = dequeuePrompt(queuedSession);

    if (dequeued === null) {
      throw new Error("No static prompts are available for the game session.");
    }

    await this.sessions.save(dequeued.session);

    return { session: dequeued.session, prompt: dequeued.prompt };
  }
}
