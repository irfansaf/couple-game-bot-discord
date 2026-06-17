import {
  changeGameSessionMode,
  dequeuePrompt,
  endGameSession,
  shiftGameSessionIntensity,
  type GameSession,
} from "../../domain/entities/game-session";
import type { GameMode, Prompt } from "../../domain/entities/prompt";
import { createSessionId } from "../../domain/value-objects/ids";
import type { SessionRepository } from "../ports/session-repository";
import { PromptQueueRefiller } from "../services/prompt-queue-refiller";

export const gameActions = [
  "truth",
  "dare",
  "couple_question",
  "this_or_that",
  "next",
  "skip",
  "softer",
  "spicier",
  "end",
] as const;

export type GameAction = (typeof gameActions)[number];

export interface HandleGameActionInput {
  readonly sessionId: string;
  readonly action: GameAction;
  readonly now?: Date;
}

export type HandleGameActionOutput =
  | {
      readonly status: "prompt";
      readonly session: GameSession;
      readonly prompt: Prompt;
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
    }
  | {
      readonly status: "missing_prompt";
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
      return { status: "inactive_session" };
    }

    if (input.action === "end") {
      const endedSession = endGameSession(session, input.now);

      await this.sessions.save(endedSession);

      return { status: "ended", session: endedSession };
    }

    const nextSession = applyAction(session, input.action);
    const queuedSession = nextSession.promptQueue.length === 0
      ? await this.queueRefiller.fillToTarget(nextSession)
      : nextSession;
    const dequeued = dequeuePrompt(queuedSession);

    if (dequeued === null) {
      return { status: "missing_prompt" };
    }

    await this.sessions.save(dequeued.session);

    return {
      status: "prompt",
      session: dequeued.session,
      prompt: dequeued.prompt,
    };
  }
}

function applyAction(session: GameSession, action: GameAction): GameSession {
  const mode = gameActionToMode(action);

  if (mode !== null) {
    return changeGameSessionMode(session, mode);
  }

  if (action === "softer" || action === "spicier") {
    return shiftGameSessionIntensity(session, action);
  }

  return session;
}

export function gameActionToMode(action: GameAction): GameMode | null {
  if (
    action === "truth" ||
    action === "dare" ||
    action === "couple_question" ||
    action === "this_or_that"
  ) {
    return action;
  }

  return null;
}
