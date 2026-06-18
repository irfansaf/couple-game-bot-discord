import {
  expireGameSession,
  isGameSessionExpired,
  type GameSession,
} from "../../domain/entities/game-session";
import { createSessionId } from "../../domain/value-objects/ids";
import type { SessionRepository } from "../ports/session-repository";

export type GetGameSessionOutput =
  | {
      readonly status: "found";
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
      readonly status: "expired_session";
      readonly session: GameSession;
    };

export class GetGameSessionUseCase {
  public constructor(private readonly sessions: SessionRepository) {}

  public async execute(input: {
    readonly sessionId: string;
    readonly now?: Date;
  }): Promise<GetGameSessionOutput> {
    const session = await this.sessions.findById(createSessionId(input.sessionId));

    if (session === null) {
      return { status: "missing_session" };
    }

    if (session.status !== "active") {
      return { status: "inactive_session", session };
    }

    if (isGameSessionExpired(session, input.now)) {
      const expiredSession = expireGameSession(session, input.now);

      await this.sessions.save(expiredSession);

      return { status: "expired_session", session: expiredSession };
    }

    return { status: "found", session };
  }
}
