import { DomainValidationError } from "../errors/domain-error";
import type {
  ChannelId,
  GuildId,
  PromptId,
  SessionId,
  UserId,
} from "../value-objects/ids";
import type { Intensity } from "../value-objects/intensity";
import { shiftIntensity, type IntensityDirection } from "../value-objects/intensity";
import type { GameMode, Mood, Prompt } from "./prompt";

export type GameSessionStatus = "active" | "ended";

export interface GameSession {
  readonly id: SessionId;
  readonly guildId: GuildId;
  readonly channelId: ChannelId;
  readonly players: readonly UserId[];
  readonly mode: GameMode;
  readonly mood: Mood;
  readonly intensity: Intensity;
  readonly recentPromptIds: readonly PromptId[];
  readonly promptQueue: readonly Prompt[];
  readonly status: GameSessionStatus;
  readonly createdAt: Date;
  readonly endedAt?: Date;
}

export interface CreateGameSessionInput {
  readonly id: SessionId;
  readonly guildId: GuildId;
  readonly channelId: ChannelId;
  readonly startedByUserId: UserId;
  readonly mode: GameMode;
  readonly mood: Mood;
  readonly intensity: Intensity;
  readonly now?: Date;
}

export function createGameSession(input: CreateGameSessionInput): GameSession {
  return {
    id: input.id,
    guildId: input.guildId,
    channelId: input.channelId,
    players: [input.startedByUserId],
    mode: input.mode,
    mood: input.mood,
    intensity: input.intensity,
    recentPromptIds: [],
    promptQueue: [],
    status: "active",
    createdAt: input.now ?? new Date(),
  };
}

export function recordPrompt(
  session: GameSession,
  promptId: PromptId,
  maxRecentPrompts = 20,
): GameSession {
  if (session.status !== "active") {
    throw new DomainValidationError("Cannot record a prompt for an ended session.");
  }

  const recentPromptIds = [promptId, ...session.recentPromptIds].slice(
    0,
    maxRecentPrompts,
  );

  return {
    ...session,
    recentPromptIds,
  };
}

export function enqueuePrompts(
  session: GameSession,
  prompts: readonly Prompt[],
  maxQueueSize = 10,
): GameSession {
  assertActive(session, "Cannot enqueue prompts for an ended session.");

  if (prompts.length === 0) {
    return session;
  }

  const queuedIds = new Set(session.promptQueue.map((prompt) => prompt.id));
  const recentIds = new Set(session.recentPromptIds);
  const freshPrompts = prompts.filter(
    (prompt) => !queuedIds.has(prompt.id) && !recentIds.has(prompt.id),
  );

  return {
    ...session,
    promptQueue: [...session.promptQueue, ...freshPrompts].slice(0, maxQueueSize),
  };
}

export interface DequeuedPrompt {
  readonly session: GameSession;
  readonly prompt: Prompt;
}

export function dequeuePrompt(session: GameSession): DequeuedPrompt | null {
  assertActive(session, "Cannot dequeue a prompt for an ended session.");

  const [prompt, ...remainingPrompts] = session.promptQueue;

  if (prompt === undefined) {
    return null;
  }

  return {
    prompt,
    session: recordPrompt(
      {
        ...session,
        promptQueue: remainingPrompts,
      },
      prompt.id,
    ),
  };
}

export function changeGameSessionMode(
  session: GameSession,
  mode: GameMode,
): GameSession {
  assertActive(session, "Cannot change mode for an ended session.");

  return {
    ...session,
    mode,
    promptQueue: [],
  };
}

export function shiftGameSessionIntensity(
  session: GameSession,
  direction: IntensityDirection,
): GameSession {
  assertActive(session, "Cannot change intensity for an ended session.");

  return {
    ...session,
    intensity: shiftIntensity(session.intensity, direction),
    promptQueue: [],
  };
}

export function endGameSession(session: GameSession, now = new Date()): GameSession {
  if (session.status === "ended") {
    return session;
  }

  return {
    ...session,
    status: "ended",
    endedAt: now,
  };
}

function assertActive(session: GameSession, message: string): void {
  if (session.status !== "active") {
    throw new DomainValidationError(message);
  }
}
