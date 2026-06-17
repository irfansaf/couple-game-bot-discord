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
import type { GameMode, Mood, Prompt, PromptType } from "./prompt";

export type GameSessionStatus = "active" | "ended";
export type GameSessionPhase =
  | "lobby"
  | "turn_choice"
  | "prompt_revealed"
  | "voting"
  | "revealed";
export type TruthOrDareChoice = "truth" | "dare";
export type ThisOrThatChoice = "left" | "right";
export const playContexts = ["meet", "e_meet"] as const;
export type PlayContext = (typeof playContexts)[number];

export const truthOrDareMode = "truth_or_dare" satisfies GameMode;
export const truthOrDareMinPlayers = 2;
export const truthOrDareMaxPlayers = 8;
export const coupleQuestionMode = "couple_question" satisfies GameMode;
export const coupleQuestionMinPlayers = 1;
export const coupleQuestionMaxPlayers = 8;
export const thisOrThatMode = "this_or_that" satisfies GameMode;
export const thisOrThatMinPlayers = 2;
export const thisOrThatMaxPlayers = 8;
export const defaultPlayContext = "e_meet" satisfies PlayContext;

export interface ThisOrThatVote {
  readonly userId: UserId;
  readonly choice: ThisOrThatChoice;
}

export interface GameSession {
  readonly id: SessionId;
  readonly guildId: GuildId;
  readonly channelId: ChannelId;
  readonly hostUserId: UserId;
  readonly players: readonly UserId[];
  readonly mode: GameMode;
  readonly mood: Mood;
  readonly intensity: Intensity;
  readonly recentPromptIds: readonly PromptId[];
  readonly recentPromptTexts: readonly string[];
  readonly promptQueue: readonly Prompt[];
  readonly promptQueueType?: PromptType | undefined;
  readonly currentPrompt?: Prompt | undefined;
  readonly playContext: PlayContext;
  readonly choiceVotes: readonly ThisOrThatVote[];
  readonly currentTurnIndex: number;
  readonly phase: GameSessionPhase;
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
  const phase = isLobbyMode(input.mode)
    ? "lobby"
    : "prompt_revealed";

  return {
    id: input.id,
    guildId: input.guildId,
    channelId: input.channelId,
    hostUserId: input.startedByUserId,
    players: [input.startedByUserId],
    mode: input.mode,
    mood: input.mood,
    intensity: input.intensity,
    recentPromptIds: [],
    recentPromptTexts: [],
    promptQueue: [],
    playContext: defaultPlayContext,
    choiceVotes: [],
    currentTurnIndex: 0,
    phase,
    status: "active",
    createdAt: input.now ?? new Date(),
  };
}

export function recordPrompt(
  session: GameSession,
  prompt: Prompt,
  maxRecentPrompts = 20,
): GameSession {
  if (session.status !== "active") {
    throw new DomainValidationError("Cannot record a prompt for an ended session.");
  }

  const recentPromptIds = [prompt.id, ...session.recentPromptIds].slice(
    0,
    maxRecentPrompts,
  );
  const recentPromptTexts = [prompt.text, ...session.recentPromptTexts].slice(
    0,
    maxRecentPrompts,
  );

  return {
    ...session,
    recentPromptIds,
    recentPromptTexts,
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
    ...(prompts[0] === undefined ? {} : { promptQueueType: prompts[0].type }),
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
        currentPrompt: prompt,
        promptQueueType: prompt.type,
        choiceVotes: [],
        phase: session.mode === thisOrThatMode ? "voting" : "prompt_revealed",
      },
      prompt,
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
    promptQueueType: undefined,
    currentPrompt: undefined,
    phase: isLobbyMode(mode)
      ? "lobby"
      : "prompt_revealed",
    choiceVotes: [],
    currentTurnIndex: 0,
    playContext: defaultPlayContext,
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
    promptQueueType: undefined,
    currentPrompt: undefined,
    choiceVotes: [],
  };
}

export function joinCoupleQuestionSession(
  session: GameSession,
  userId: UserId,
  maxPlayers = coupleQuestionMaxPlayers,
): GameSession {
  assertActive(session, "Cannot join an ended session.");
  assertCoupleQuestion(session, "Cannot join a non Couple Questions session.");

  if (session.phase !== "lobby") {
    throw new DomainValidationError("Cannot join after Couple Questions has started.");
  }

  if (session.players.includes(userId)) {
    return session;
  }

  if (session.players.length >= maxPlayers) {
    throw new DomainValidationError("Couple Questions lobby is full.");
  }

  return {
    ...session,
    players: [...session.players, userId],
  };
}

export function leaveCoupleQuestionSession(
  session: GameSession,
  userId: UserId,
  now = new Date(),
): GameSession {
  assertActive(session, "Cannot leave an ended session.");
  assertCoupleQuestion(session, "Cannot leave a non Couple Questions session.");

  if (session.phase !== "lobby") {
    throw new DomainValidationError("Cannot leave after Couple Questions has started.");
  }

  const players = session.players.filter((playerId) => playerId !== userId);

  if (players.length === session.players.length) {
    return session;
  }

  if (players.length === 0) {
    return endGameSession(session, now);
  }

  const firstPlayer = players[0];

  if (firstPlayer === undefined) {
    return endGameSession(session, now);
  }

  return {
    ...session,
    hostUserId: players.includes(session.hostUserId) ? session.hostUserId : firstPlayer,
    players,
  };
}

export function startCoupleQuestionSession(session: GameSession): GameSession {
  assertActive(session, "Cannot start an ended session.");
  assertCoupleQuestion(session, "Cannot start a non Couple Questions session.");

  if (session.phase !== "lobby") {
    return session;
  }

  if (session.players.length < coupleQuestionMinPlayers) {
    throw new DomainValidationError("Couple Questions needs at least 1 player.");
  }

  return {
    ...session,
    phase: "prompt_revealed",
    currentPrompt: undefined,
    promptQueue: [],
    promptQueueType: coupleQuestionMode,
    choiceVotes: [],
  };
}

export function joinThisOrThatSession(
  session: GameSession,
  userId: UserId,
  maxPlayers = thisOrThatMaxPlayers,
): GameSession {
  assertActive(session, "Cannot join an ended session.");
  assertThisOrThat(session, "Cannot join a non This or That session.");

  if (session.phase !== "lobby") {
    throw new DomainValidationError("Cannot join after This or That has started.");
  }

  if (session.players.includes(userId)) {
    return session;
  }

  if (session.players.length >= maxPlayers) {
    throw new DomainValidationError("This or That lobby is full.");
  }

  return {
    ...session,
    players: [...session.players, userId],
  };
}

export function leaveThisOrThatSession(
  session: GameSession,
  userId: UserId,
  now = new Date(),
): GameSession {
  assertActive(session, "Cannot leave an ended session.");
  assertThisOrThat(session, "Cannot leave a non This or That session.");

  if (session.phase !== "lobby") {
    throw new DomainValidationError("Cannot leave after This or That has started.");
  }

  const players = session.players.filter((playerId) => playerId !== userId);

  if (players.length === session.players.length) {
    return session;
  }

  if (players.length === 0) {
    return endGameSession(session, now);
  }

  const firstPlayer = players[0];

  if (firstPlayer === undefined) {
    return endGameSession(session, now);
  }

  return {
    ...session,
    hostUserId: players.includes(session.hostUserId) ? session.hostUserId : firstPlayer,
    players,
  };
}

export function startThisOrThatSession(session: GameSession): GameSession {
  assertActive(session, "Cannot start an ended session.");
  assertThisOrThat(session, "Cannot start a non This or That session.");

  if (session.phase !== "lobby") {
    return session;
  }

  if (session.players.length < thisOrThatMinPlayers) {
    throw new DomainValidationError("This or That needs at least 2 players.");
  }

  return {
    ...session,
    phase: "voting",
    currentPrompt: undefined,
    promptQueue: [],
    promptQueueType: "this_or_that",
    choiceVotes: [],
  };
}

export function recordThisOrThatVote(
  session: GameSession,
  userId: UserId,
  choice: ThisOrThatChoice,
): GameSession {
  assertActive(session, "Cannot vote in an ended session.");
  assertThisOrThat(session, "Cannot vote in a non This or That session.");

  if (session.phase !== "voting") {
    throw new DomainValidationError("This or That is not accepting votes right now.");
  }

  if (session.currentPrompt === undefined) {
    throw new DomainValidationError("This or That has no active choice prompt.");
  }

  if (!session.players.includes(userId)) {
    throw new DomainValidationError("Only joined players can vote.");
  }

  const nextVotes = [
    ...session.choiceVotes.filter((vote) => vote.userId !== userId),
    { userId, choice },
  ];
  const hasAllVotes = session.players.every((playerId) =>
    nextVotes.some((vote) => vote.userId === playerId),
  );

  return {
    ...session,
    choiceVotes: nextVotes,
    phase: hasAllVotes ? "revealed" : "voting",
  };
}

export function joinTruthOrDareSession(
  session: GameSession,
  userId: UserId,
  maxPlayers = truthOrDareMaxPlayers,
): GameSession {
  assertActive(session, "Cannot join an ended session.");
  assertTruthOrDare(session, "Cannot join a non Truth or Dare session.");

  if (session.phase !== "lobby") {
    throw new DomainValidationError("Cannot join after Truth or Dare has started.");
  }

  if (session.players.includes(userId)) {
    return session;
  }

  if (session.players.length >= maxPlayers) {
    throw new DomainValidationError("Truth or Dare lobby is full.");
  }

  return {
    ...session,
    players: [...session.players, userId],
  };
}

export function leaveTruthOrDareSession(
  session: GameSession,
  userId: UserId,
  now = new Date(),
): GameSession {
  assertActive(session, "Cannot leave an ended session.");
  assertTruthOrDare(session, "Cannot leave a non Truth or Dare session.");

  const players = session.players.filter((playerId) => playerId !== userId);

  if (players.length === session.players.length) {
    return session;
  }

  if (players.length === 0) {
    return endGameSession(session, now);
  }

  const firstPlayer = players[0];

  if (firstPlayer === undefined) {
    return endGameSession(session, now);
  }

  const hostUserId = players.includes(session.hostUserId)
    ? session.hostUserId
    : firstPlayer;
  const currentTurnIndex = Math.min(session.currentTurnIndex, players.length - 1);

  return {
    ...session,
    hostUserId,
    players,
    currentTurnIndex,
  };
}

export function startTruthOrDareSession(session: GameSession): GameSession {
  assertActive(session, "Cannot start an ended session.");
  assertTruthOrDare(session, "Cannot start a non Truth or Dare session.");

  if (session.phase !== "lobby") {
    return session;
  }

  if (session.players.length < truthOrDareMinPlayers) {
    throw new DomainValidationError("Truth or Dare needs at least 2 players.");
  }

  return {
    ...session,
    phase: "turn_choice",
    currentTurnIndex: 0,
    currentPrompt: undefined,
    promptQueue: [],
    promptQueueType: undefined,
    choiceVotes: [],
  };
}

export function setTruthOrDarePlayContext(
  session: GameSession,
  playContext: PlayContext,
): GameSession {
  assertActive(session, "Cannot change play context for an ended session.");
  assertTruthOrDare(session, "Cannot change play context for a non Truth or Dare session.");

  if (session.phase !== "lobby") {
    throw new DomainValidationError("Cannot change play context after Truth or Dare starts.");
  }

  if (session.playContext === playContext) {
    return session;
  }

  return {
    ...session,
    playContext,
    promptQueue: [],
    promptQueueType: undefined,
    currentPrompt: undefined,
    choiceVotes: [],
  };
}

export function chooseTruthOrDarePromptType(
  session: GameSession,
  promptType: TruthOrDareChoice,
): GameSession {
  assertActive(session, "Cannot choose a prompt for an ended session.");
  assertTruthOrDare(session, "Cannot choose a prompt for a non Truth or Dare session.");

  if (session.phase !== "turn_choice" && session.phase !== "prompt_revealed") {
    throw new DomainValidationError("Truth or Dare is not ready for a prompt choice.");
  }

  const keepQueue = session.promptQueueType === promptType;

  return {
    ...session,
    promptQueue: keepQueue ? session.promptQueue : [],
    promptQueueType: promptType,
    currentPrompt: undefined,
    choiceVotes: [],
  };
}

export function advanceTruthOrDareTurn(session: GameSession): GameSession {
  assertActive(session, "Cannot advance an ended session.");
  assertTruthOrDare(session, "Cannot advance a non Truth or Dare session.");

  if (session.players.length === 0) {
    throw new DomainValidationError("Cannot advance a session with no players.");
  }

  return {
    ...session,
    currentTurnIndex: (session.currentTurnIndex + 1) % session.players.length,
    phase: "turn_choice",
    currentPrompt: undefined,
    promptQueue: [],
    promptQueueType: undefined,
    choiceVotes: [],
  };
}

export function currentTruthOrDarePlayer(session: GameSession): UserId | null {
  if (session.mode !== truthOrDareMode || session.players.length === 0) {
    return null;
  }

  return session.players[session.currentTurnIndex] ?? session.players[0] ?? null;
}

export function promptTypeForQueue(session: GameSession): PromptType | null {
  if (session.mode === truthOrDareMode) {
    return session.promptQueueType ?? session.currentPrompt?.type ?? null;
  }

  return session.mode;
}

export function endGameSession(session: GameSession, now = new Date()): GameSession {
  if (session.status === "ended") {
    return session;
  }

  return {
    ...session,
    status: "ended",
    currentPrompt: undefined,
    promptQueue: [],
    promptQueueType: undefined,
    choiceVotes: [],
    endedAt: now,
  };
}

function assertActive(session: GameSession, message: string): void {
  if (session.status !== "active") {
    throw new DomainValidationError(message);
  }
}

function assertTruthOrDare(session: GameSession, message: string): void {
  if (session.mode !== truthOrDareMode) {
    throw new DomainValidationError(message);
  }
}

function assertCoupleQuestion(session: GameSession, message: string): void {
  if (session.mode !== coupleQuestionMode) {
    throw new DomainValidationError(message);
  }
}

function assertThisOrThat(session: GameSession, message: string): void {
  if (session.mode !== thisOrThatMode) {
    throw new DomainValidationError(message);
  }
}

function isLobbyMode(mode: GameMode): boolean {
  return (
    mode === truthOrDareMode ||
    mode === coupleQuestionMode ||
    mode === thisOrThatMode
  );
}
