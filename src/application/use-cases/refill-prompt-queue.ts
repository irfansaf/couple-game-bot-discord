import { createSessionId } from "../../domain/value-objects/ids";
import {
  expireGameSession,
  isGameSessionExpired,
} from "../../domain/entities/game-session";
import {
  PromptQueueRefiller,
  promptQueueRefillThreshold,
} from "../services/prompt-queue-refiller";
import type { SessionRepository } from "../ports/session-repository";

export interface RefillPromptQueueInput {
  readonly sessionId: string;
  readonly now?: Date;
}

export type RefillPromptQueueOutput =
  | {
      readonly status: "refilled";
      readonly queueSize: number;
    }
  | {
      readonly status: "skipped";
      readonly reason:
        | "missing_session"
        | "inactive_session"
        | "expired_session"
        | "queue_above_threshold";
    };

export class RefillPromptQueueUseCase {
  public constructor(
    private readonly sessions: SessionRepository,
    private readonly queueRefiller: PromptQueueRefiller,
  ) {}

  public async execute(
    input: RefillPromptQueueInput,
  ): Promise<RefillPromptQueueOutput> {
    const session = await this.sessions.findById(createSessionId(input.sessionId));

    if (session === null) {
      return { status: "skipped", reason: "missing_session" };
    }

    if (session.status !== "active") {
      return { status: "skipped", reason: "inactive_session" };
    }

    if (isGameSessionExpired(session, input.now)) {
      await this.sessions.save(expireGameSession(session, input.now));

      return { status: "skipped", reason: "expired_session" };
    }

    if (session.promptQueue.length > promptQueueRefillThreshold) {
      return { status: "skipped", reason: "queue_above_threshold" };
    }

    const refilledSession = await this.queueRefiller.fillToTarget(session);

    await this.sessions.save(refilledSession);

    return {
      status: "refilled",
      queueSize: refilledSession.promptQueue.length,
    };
  }
}
