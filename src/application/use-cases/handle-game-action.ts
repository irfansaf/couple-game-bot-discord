import {
  advanceDateNightStep,
  advanceTruthOrDareTurn,
  afterDarkMaxPlayers,
  afterDarkMinPlayers,
  afterDarkMode,
  changeGameSessionMode,
  chooseTruthOrDarePromptType,
  coupleQuestionMaxPlayers,
  coupleQuestionMinPlayers,
  coupleQuestionMode,
  currentTruthOrDarePlayer,
  dateNightMaxPlayers,
  dateNightMinPlayers,
  dateNightMode,
  dequeuePrompt,
  endGameSession,
  joinAfterDarkSession,
  joinCoupleQuestionSession,
  joinDateNightSession,
  joinThisOrThatSession,
  joinTruthOrDareSession,
  leaveAfterDarkSession,
  leaveCoupleQuestionSession,
  leaveDateNightSession,
  leaveThisOrThatSession,
  leaveTruthOrDareSession,
  recordThisOrThatVote,
  setTruthOrDarePlayContext,
  shiftGameSessionIntensity,
  startAfterDarkSession,
  startCoupleQuestionSession,
  startDateNightSession,
  startThisOrThatSession,
  startTruthOrDareSession,
  thisOrThatMaxPlayers,
  thisOrThatMinPlayers,
  thisOrThatMode,
  truthOrDareMaxPlayers,
  truthOrDareMinPlayers,
  truthOrDareMode,
  type GameSession,
  type ThisOrThatChoice,
  type TruthOrDareChoice,
} from "../../domain/entities/game-session";
import type { GameMode, Prompt } from "../../domain/entities/prompt";
import { createSessionId, createUserId } from "../../domain/value-objects/ids";
import type { SessionRepository } from "../ports/session-repository";
import { PromptQueueRefiller } from "../services/prompt-queue-refiller";

export const gameActions = [
  "join",
  "leave",
  "start_tod",
  "start_couple_question",
  "start_after_dark",
  "start_this_or_that",
  "start_date_night",
  "rules",
  "set_context_meet",
  "set_context_e_meet",
  "truth",
  "dare",
  "random",
  "couple_question",
  "this_or_that",
  "after_dark",
  "date_night",
  "continue_date_night",
  "next",
  "skip",
  "softer",
  "spicier",
  "deeper",
  "answer_private",
  "pick_left",
  "pick_right",
  "answered",
  "done",
  "alternative_dare",
  "next_turn",
  "end",
] as const;

export type GameAction = (typeof gameActions)[number];

export interface HandleGameActionInput {
  readonly sessionId: string;
  readonly action: GameAction;
  readonly userId: string;
  readonly now?: Date;
}

export type GameActionBlockedReason =
  | "already_joined"
  | "session_full"
  | "not_in_lobby"
  | "not_enough_players"
  | "not_host"
  | "not_a_player"
  | "not_current_player"
  | "wrong_phase";

export type HandleGameActionOutput =
  | {
      readonly status: "prompt";
      readonly session: GameSession;
      readonly prompt: Prompt;
    }
  | {
      readonly status: "state";
      readonly session: GameSession;
      readonly view?: "rules";
    }
  | {
      readonly status: "acknowledged";
      readonly session: GameSession;
      readonly message: string;
    }
  | {
      readonly status: "blocked";
      readonly reason: GameActionBlockedReason;
      readonly session: GameSession;
    }
  | {
      readonly status: "ended";
      readonly session: GameSession;
    }
  | {
      readonly status: "missing_session";
    }
  | {
      readonly status: "inactive_session";
      readonly session: GameSession;
    }
  | {
      readonly status: "missing_prompt";
      readonly session: GameSession;
    };

export class HandleGameActionUseCase {
  public constructor(
    private readonly sessions: SessionRepository,
    private readonly queueRefiller: PromptQueueRefiller,
  ) {}

  public async execute(
    input: HandleGameActionInput,
  ): Promise<HandleGameActionOutput> {
    const session = await this.sessions.findById(createSessionId(input.sessionId));

    if (session === null) {
      return { status: "missing_session" };
    }

    if (session.status !== "active") {
      return { status: "inactive_session", session };
    }

    if (input.action === "end") {
      const endedSession = endGameSession(session, input.now);

      await this.sessions.save(endedSession);

      return { status: "ended", session: endedSession };
    }

    if (session.mode === truthOrDareMode) {
      return this.handleTruthOrDareAction(session, input);
    }

    if (session.mode === coupleQuestionMode) {
      return this.handleCoupleQuestionAction(session, input);
    }

    if (session.mode === afterDarkMode) {
      return this.handleAfterDarkAction(session, input);
    }

    if (session.mode === dateNightMode) {
      return this.handleDateNightAction(session, input);
    }

    if (session.mode === thisOrThatMode) {
      return this.handleThisOrThatAction(session, input);
    }

    if (isTruthOrDareOnlyAction(input.action)) {
      return { status: "blocked", reason: "wrong_phase", session };
    }

    const selectedMode = gameActionToMode(input.action);

    if (selectedMode !== null) {
      const nextSession = changeGameSessionMode(session, selectedMode);

      await this.sessions.save(nextSession);

      return { status: "state", session: nextSession };
    }

    const nextSession = applyPromptGameAction(session, input.action);
    const queuedSession = nextSession.promptQueue.length === 0
      ? await this.queueRefiller.fillToTarget(nextSession)
      : nextSession;
    const dequeued = dequeuePrompt(queuedSession);

    if (dequeued === null) {
      return { status: "missing_prompt", session: queuedSession };
    }

    await this.sessions.save(dequeued.session);

    return {
      status: "prompt",
      session: dequeued.session,
      prompt: dequeued.prompt,
    };
  }

  private async handleTruthOrDareAction(
    session: GameSession,
    input: HandleGameActionInput,
  ): Promise<HandleGameActionOutput> {
    const actorUserId = createUserId(input.userId);

    if (input.action === "rules") {
      return { status: "state", session, view: "rules" };
    }

    if (
      input.action === "set_context_meet" ||
      input.action === "set_context_e_meet"
    ) {
      if (session.hostUserId !== actorUserId) {
        return { status: "blocked", reason: "not_host", session };
      }

      if (session.phase !== "lobby") {
        return { status: "blocked", reason: "not_in_lobby", session };
      }

      const playContext = input.action === "set_context_meet" ? "meet" : "e_meet";
      const updatedSession = setTruthOrDarePlayContext(session, playContext);

      await this.sessions.save(updatedSession);

      return { status: "state", session: updatedSession };
    }

    if (input.action === "join") {
      if (session.phase !== "lobby") {
        return { status: "blocked", reason: "not_in_lobby", session };
      }

      if (session.players.includes(actorUserId)) {
        return { status: "blocked", reason: "already_joined", session };
      }

      if (session.players.length >= truthOrDareMaxPlayers) {
        return { status: "blocked", reason: "session_full", session };
      }

      const joinedSession = joinTruthOrDareSession(session, actorUserId);

      await this.sessions.save(joinedSession);

      return { status: "state", session: joinedSession };
    }

    if (input.action === "leave") {
      if (!session.players.includes(actorUserId)) {
        return { status: "blocked", reason: "not_a_player", session };
      }

      const leftSession = leaveTruthOrDareSession(session, actorUserId, input.now);

      await this.sessions.save(leftSession);

      return leftSession.status === "ended"
        ? { status: "ended", session: leftSession }
        : { status: "state", session: leftSession };
    }

    if (input.action === "start_tod") {
      if (session.hostUserId !== actorUserId) {
        return { status: "blocked", reason: "not_host", session };
      }

      if (session.phase !== "lobby") {
        return { status: "blocked", reason: "not_in_lobby", session };
      }

      if (session.players.length < truthOrDareMinPlayers) {
        return { status: "blocked", reason: "not_enough_players", session };
      }

      const startedSession = startTruthOrDareSession(session);

      await this.sessions.save(startedSession);

      return { status: "state", session: startedSession };
    }

    if (!session.players.includes(actorUserId)) {
      return { status: "blocked", reason: "not_a_player", session };
    }

    if (
      input.action === "truth" ||
      input.action === "dare" ||
      input.action === "random"
    ) {
      if (session.phase !== "turn_choice") {
        return { status: "blocked", reason: "wrong_phase", session };
      }

      if (!isCurrentTurnActor(session, actorUserId)) {
        return { status: "blocked", reason: "not_current_player", session };
      }

      const promptType = input.action === "random"
        ? randomTruthOrDareChoice()
        : input.action;

      return this.revealTruthOrDarePrompt(session, promptType);
    }

    if (input.action === "softer") {
      const softerSession = shiftGameSessionIntensity(session, "softer");
      const promptType = session.currentPrompt?.type;

      if (promptType === "truth" || promptType === "dare") {
        return this.revealTruthOrDarePrompt(softerSession, promptType);
      }

      await this.sessions.save(softerSession);

      return { status: "state", session: softerSession };
    }

    if (input.action === "alternative_dare") {
      if (session.currentPrompt?.type !== "dare") {
        return { status: "blocked", reason: "wrong_phase", session };
      }

      if (!isCurrentTurnActor(session, actorUserId)) {
        return { status: "blocked", reason: "not_current_player", session };
      }

      return this.revealTruthOrDarePrompt(session, "dare");
    }

    if (
      input.action === "answered" ||
      input.action === "done" ||
      input.action === "next_turn" ||
      input.action === "skip"
    ) {
      if (
        input.action === "skip" &&
        session.phase !== "turn_choice" &&
        session.phase !== "prompt_revealed"
      ) {
        return { status: "blocked", reason: "wrong_phase", session };
      }

      if (session.phase !== "prompt_revealed" && input.action !== "skip") {
        return { status: "blocked", reason: "wrong_phase", session };
      }

      if (!isCurrentTurnActor(session, actorUserId)) {
        return { status: "blocked", reason: "not_current_player", session };
      }

      const nextTurnSession = advanceTruthOrDareTurn(session);

      await this.sessions.save(nextTurnSession);

      return { status: "state", session: nextTurnSession };
    }

    return { status: "blocked", reason: "wrong_phase", session };
  }

  private async handleCoupleQuestionAction(
    session: GameSession,
    input: HandleGameActionInput,
  ): Promise<HandleGameActionOutput> {
    const actorUserId = createUserId(input.userId);

    if (input.action === "rules") {
      return { status: "state", session, view: "rules" };
    }

    if (input.action === "join") {
      if (session.phase !== "lobby") {
        return { status: "blocked", reason: "not_in_lobby", session };
      }

      if (session.players.includes(actorUserId)) {
        return { status: "blocked", reason: "already_joined", session };
      }

      if (session.players.length >= coupleQuestionMaxPlayers) {
        return { status: "blocked", reason: "session_full", session };
      }

      const joinedSession = joinCoupleQuestionSession(session, actorUserId);

      await this.sessions.save(joinedSession);

      return { status: "state", session: joinedSession };
    }

    if (input.action === "leave") {
      if (!session.players.includes(actorUserId)) {
        return { status: "blocked", reason: "not_a_player", session };
      }

      if (session.phase !== "lobby") {
        return { status: "blocked", reason: "not_in_lobby", session };
      }

      const leftSession = leaveCoupleQuestionSession(session, actorUserId, input.now);

      await this.sessions.save(leftSession);

      return leftSession.status === "ended"
        ? { status: "ended", session: leftSession }
        : { status: "state", session: leftSession };
    }

    if (input.action === "start_couple_question") {
      if (session.hostUserId !== actorUserId) {
        return { status: "blocked", reason: "not_host", session };
      }

      if (session.phase !== "lobby") {
        return { status: "blocked", reason: "not_in_lobby", session };
      }

      if (session.players.length < coupleQuestionMinPlayers) {
        return { status: "blocked", reason: "not_enough_players", session };
      }

      return this.revealCoupleQuestionPrompt(startCoupleQuestionSession(session));
    }

    if (
      input.action === "next" ||
      input.action === "skip" ||
      input.action === "softer" ||
      input.action === "spicier" ||
      input.action === "deeper"
    ) {
      if (!session.players.includes(actorUserId)) {
        return { status: "blocked", reason: "not_a_player", session };
      }

      if (session.phase !== "prompt_revealed") {
        return { status: "blocked", reason: "wrong_phase", session };
      }

      const selectedSession =
        input.action === "softer" ||
        input.action === "spicier" ||
        input.action === "deeper"
          ? shiftGameSessionIntensity(
              session,
              input.action === "softer" ? "softer" : "spicier",
            )
          : session;

      return this.revealCoupleQuestionPrompt(selectedSession);
    }

    return { status: "blocked", reason: "wrong_phase", session };
  }

  private async handleThisOrThatAction(
    session: GameSession,
    input: HandleGameActionInput,
  ): Promise<HandleGameActionOutput> {
    const actorUserId = createUserId(input.userId);

    if (input.action === "rules") {
      return { status: "state", session, view: "rules" };
    }

    if (input.action === "join") {
      if (session.phase !== "lobby") {
        return { status: "blocked", reason: "not_in_lobby", session };
      }

      if (session.players.includes(actorUserId)) {
        return { status: "blocked", reason: "already_joined", session };
      }

      if (session.players.length >= thisOrThatMaxPlayers) {
        return { status: "blocked", reason: "session_full", session };
      }

      const joinedSession = joinThisOrThatSession(session, actorUserId);

      await this.sessions.save(joinedSession);

      return { status: "state", session: joinedSession };
    }

    if (input.action === "leave") {
      if (!session.players.includes(actorUserId)) {
        return { status: "blocked", reason: "not_a_player", session };
      }

      if (session.phase !== "lobby") {
        return { status: "blocked", reason: "not_in_lobby", session };
      }

      const leftSession = leaveThisOrThatSession(session, actorUserId, input.now);

      await this.sessions.save(leftSession);

      return leftSession.status === "ended"
        ? { status: "ended", session: leftSession }
        : { status: "state", session: leftSession };
    }

    if (input.action === "start_this_or_that") {
      if (session.hostUserId !== actorUserId) {
        return { status: "blocked", reason: "not_host", session };
      }

      if (session.phase !== "lobby") {
        return { status: "blocked", reason: "not_in_lobby", session };
      }

      if (session.players.length < thisOrThatMinPlayers) {
        return { status: "blocked", reason: "not_enough_players", session };
      }

      return this.revealThisOrThatPrompt(startThisOrThatSession(session));
    }

    if (input.action === "next") {
      if (session.phase !== "revealed") {
        return { status: "blocked", reason: "wrong_phase", session };
      }

      return this.revealThisOrThatPrompt(session);
    }

    if (input.action === "skip") {
      if (session.phase !== "voting" && session.phase !== "revealed") {
        return { status: "blocked", reason: "wrong_phase", session };
      }

      return this.revealThisOrThatPrompt(session);
    }

    if (input.action === "softer" || input.action === "spicier") {
      if (session.phase !== "voting" && session.phase !== "revealed") {
        return { status: "blocked", reason: "wrong_phase", session };
      }

      return this.revealThisOrThatPrompt(
        shiftGameSessionIntensity(session, input.action),
      );
    }

    if (input.action === "pick_left" || input.action === "pick_right") {
      if (!session.players.includes(actorUserId)) {
        return { status: "blocked", reason: "not_a_player", session };
      }

      if (session.phase !== "voting") {
        return { status: "blocked", reason: "wrong_phase", session };
      }

      const choice = thisOrThatChoiceFromAction(input.action);
      const votedSession = recordThisOrThatVote(session, actorUserId, choice);

      await this.sessions.save(votedSession);

      return {
        status: "acknowledged",
        session: votedSession,
        message: thisOrThatPickMessage(choice, votedSession),
      };
    }

    return { status: "blocked", reason: "wrong_phase", session };
  }

  private async handleAfterDarkAction(
    session: GameSession,
    input: HandleGameActionInput,
  ): Promise<HandleGameActionOutput> {
    const actorUserId = createUserId(input.userId);

    if (input.action === "rules") {
      return { status: "state", session, view: "rules" };
    }

    if (input.action === "join") {
      if (session.phase !== "lobby") {
        return { status: "blocked", reason: "not_in_lobby", session };
      }

      if (session.players.includes(actorUserId)) {
        return { status: "blocked", reason: "already_joined", session };
      }

      if (session.players.length >= afterDarkMaxPlayers) {
        return { status: "blocked", reason: "session_full", session };
      }

      const joinedSession = joinAfterDarkSession(session, actorUserId);

      await this.sessions.save(joinedSession);

      return { status: "state", session: joinedSession };
    }

    if (input.action === "leave") {
      if (!session.players.includes(actorUserId)) {
        return { status: "blocked", reason: "not_a_player", session };
      }

      if (session.phase !== "lobby") {
        return { status: "blocked", reason: "not_in_lobby", session };
      }

      const leftSession = leaveAfterDarkSession(session, actorUserId, input.now);

      await this.sessions.save(leftSession);

      return leftSession.status === "ended"
        ? { status: "ended", session: leftSession }
        : { status: "state", session: leftSession };
    }

    if (input.action === "start_after_dark") {
      if (session.hostUserId !== actorUserId) {
        return { status: "blocked", reason: "not_host", session };
      }

      if (session.phase !== "lobby") {
        return { status: "blocked", reason: "not_in_lobby", session };
      }

      if (session.players.length < afterDarkMinPlayers) {
        return { status: "blocked", reason: "not_enough_players", session };
      }

      return this.revealAfterDarkPrompt(startAfterDarkSession(session));
    }

    if (
      input.action === "next" ||
      input.action === "skip" ||
      input.action === "softer" ||
      input.action === "spicier" ||
      input.action === "deeper"
    ) {
      if (!session.players.includes(actorUserId)) {
        return { status: "blocked", reason: "not_a_player", session };
      }

      if (session.phase !== "prompt_revealed") {
        return { status: "blocked", reason: "wrong_phase", session };
      }

      const selectedSession =
        input.action === "softer" ||
        input.action === "spicier" ||
        input.action === "deeper"
          ? shiftGameSessionIntensity(
              session,
              input.action === "softer" ? "softer" : "spicier",
            )
          : session;

      return this.revealAfterDarkPrompt(selectedSession);
    }

    return { status: "blocked", reason: "wrong_phase", session };
  }

  private async handleDateNightAction(
    session: GameSession,
    input: HandleGameActionInput,
  ): Promise<HandleGameActionOutput> {
    const actorUserId = createUserId(input.userId);

    if (input.action === "rules") {
      return { status: "state", session, view: "rules" };
    }

    if (input.action === "join") {
      if (session.phase !== "lobby") {
        return { status: "blocked", reason: "not_in_lobby", session };
      }

      if (session.players.includes(actorUserId)) {
        return { status: "blocked", reason: "already_joined", session };
      }

      if (session.players.length >= dateNightMaxPlayers) {
        return { status: "blocked", reason: "session_full", session };
      }

      const joinedSession = joinDateNightSession(session, actorUserId);

      await this.sessions.save(joinedSession);

      return { status: "state", session: joinedSession };
    }

    if (input.action === "leave") {
      if (!session.players.includes(actorUserId)) {
        return { status: "blocked", reason: "not_a_player", session };
      }

      if (session.phase !== "lobby") {
        return { status: "blocked", reason: "not_in_lobby", session };
      }

      const leftSession = leaveDateNightSession(session, actorUserId, input.now);

      await this.sessions.save(leftSession);

      return leftSession.status === "ended"
        ? { status: "ended", session: leftSession }
        : { status: "state", session: leftSession };
    }

    if (input.action === "start_date_night") {
      if (session.hostUserId !== actorUserId) {
        return { status: "blocked", reason: "not_host", session };
      }

      if (session.phase !== "lobby") {
        return { status: "blocked", reason: "not_in_lobby", session };
      }

      if (session.players.length < dateNightMinPlayers) {
        return { status: "blocked", reason: "not_enough_players", session };
      }

      return this.revealDateNightPrompt(startDateNightSession(session));
    }

    if (!session.players.includes(actorUserId)) {
      return { status: "blocked", reason: "not_a_player", session };
    }

    if (input.action === "continue_date_night") {
      if (session.phase !== "prompt_revealed") {
        return { status: "blocked", reason: "wrong_phase", session };
      }

      const advancedSession = advanceDateNightStep(session);

      if (advancedSession.phase === "completed") {
        await this.sessions.save(advancedSession);

        return { status: "state", session: advancedSession };
      }

      return this.revealDateNightPrompt(advancedSession);
    }

    if (input.action === "skip" || input.action === "softer") {
      if (session.phase !== "prompt_revealed") {
        return { status: "blocked", reason: "wrong_phase", session };
      }

      const selectedSession = input.action === "softer"
        ? shiftGameSessionIntensity(session, "softer")
        : {
            ...session,
            promptQueue: [],
            currentPrompt: undefined,
            choiceVotes: [],
          };

      return this.revealDateNightPrompt(selectedSession);
    }

    return { status: "blocked", reason: "wrong_phase", session };
  }

  private async revealTruthOrDarePrompt(
    session: GameSession,
    promptType: TruthOrDareChoice,
  ): Promise<HandleGameActionOutput> {
    const selectedSession = chooseTruthOrDarePromptType(session, promptType);
    const queuedSession = selectedSession.promptQueue.length === 0
      ? await this.queueRefiller.fillToTarget(selectedSession)
      : selectedSession;
    const dequeued = dequeuePrompt(queuedSession);

    if (dequeued === null) {
      return { status: "missing_prompt", session: queuedSession };
    }

    await this.sessions.save(dequeued.session);

    return {
      status: "prompt",
      session: dequeued.session,
      prompt: dequeued.prompt,
    };
  }

  private async revealThisOrThatPrompt(
    session: GameSession,
  ): Promise<HandleGameActionOutput> {
    const queuedSession = session.promptQueue.length === 0
      ? await this.queueRefiller.fillToTarget(session)
      : session;
    const dequeued = dequeuePrompt(queuedSession);

    if (dequeued === null) {
      return { status: "missing_prompt", session: queuedSession };
    }

    await this.sessions.save(dequeued.session);

    return {
      status: "prompt",
      session: dequeued.session,
      prompt: dequeued.prompt,
    };
  }

  private async revealCoupleQuestionPrompt(
    session: GameSession,
  ): Promise<HandleGameActionOutput> {
    const queuedSession = session.promptQueue.length === 0
      ? await this.queueRefiller.fillToTarget(session)
      : session;
    const dequeued = dequeuePrompt(queuedSession);

    if (dequeued === null) {
      return { status: "missing_prompt", session: queuedSession };
    }

    await this.sessions.save(dequeued.session);

    return {
      status: "prompt",
      session: dequeued.session,
      prompt: dequeued.prompt,
    };
  }

  private async revealAfterDarkPrompt(
    session: GameSession,
  ): Promise<HandleGameActionOutput> {
    const queuedSession = session.promptQueue.length === 0
      ? await this.queueRefiller.fillToTarget(session)
      : session;
    const dequeued = dequeuePrompt(queuedSession);

    if (dequeued === null) {
      return { status: "missing_prompt", session: queuedSession };
    }

    await this.sessions.save(dequeued.session);

    return {
      status: "prompt",
      session: dequeued.session,
      prompt: dequeued.prompt,
    };
  }

  private async revealDateNightPrompt(
    session: GameSession,
  ): Promise<HandleGameActionOutput> {
    const queuedSession = session.promptQueue.length === 0
      ? await this.queueRefiller.fillToTarget(session)
      : session;
    const dequeued = dequeuePrompt(queuedSession);

    if (dequeued === null) {
      return { status: "missing_prompt", session: queuedSession };
    }

    await this.sessions.save(dequeued.session);

    return {
      status: "prompt",
      session: dequeued.session,
      prompt: dequeued.prompt,
    };
  }
}

function applyPromptGameAction(session: GameSession, action: GameAction): GameSession {
  const mode = gameActionToMode(action);

  if (mode !== null) {
    return changeGameSessionMode(session, mode);
  }

  if (action === "softer" || action === "spicier" || action === "deeper") {
    return shiftGameSessionIntensity(
      session,
      action === "softer" ? "softer" : "spicier",
    );
  }

  return session;
}

export function gameActionToMode(action: GameAction): GameMode | null {
  if (
    action === "couple_question" ||
    action === "this_or_that" ||
    action === "after_dark" ||
    action === "date_night"
  ) {
    return action;
  }

  return null;
}

function isCurrentTurnActor(session: GameSession, userId: string): boolean {
  return currentTruthOrDarePlayer(session) === userId;
}

function randomTruthOrDareChoice(): TruthOrDareChoice {
  return Math.random() < 0.5 ? "truth" : "dare";
}

function isTruthOrDareOnlyAction(action: GameAction): boolean {
  return (
    action === "join" ||
    action === "leave" ||
    action === "start_tod" ||
    action === "start_couple_question" ||
    action === "start_after_dark" ||
    action === "start_this_or_that" ||
    action === "start_date_night" ||
    action === "rules" ||
    action === "set_context_meet" ||
    action === "set_context_e_meet" ||
    action === "truth" ||
    action === "dare" ||
    action === "random" ||
    action === "answered" ||
    action === "answer_private" ||
    action === "done" ||
    action === "alternative_dare" ||
    action === "next_turn" ||
    action === "continue_date_night"
  );
}

function thisOrThatChoiceFromAction(action: "pick_left" | "pick_right"): ThisOrThatChoice {
  return action === "pick_left" ? "left" : "right";
}

function thisOrThatPickMessage(
  choice: ThisOrThatChoice,
  session: GameSession,
): string {
  const picked = choice === "left" ? "Left" : "Right";

  if (session.phase === "revealed") {
    return `Locked in ${picked}. Everyone voted, reveal is up.`;
  }

  return `Locked in ${picked}. Waiting for ${
    session.players.length - session.choiceVotes.length
  } more.`;
}
