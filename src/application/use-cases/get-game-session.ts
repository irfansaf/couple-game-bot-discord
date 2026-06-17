import type { GameSession } from "../../domain/entities/game-session";
import { createSessionId } from "../../domain/value-objects/ids";
import type { SessionRepository } from "../ports/session-repository";

export type GetGameSessionOutput =
  | {
      readonly status: "found";
      readonly session: GameSession;
    }
  | {
      readonly status: "missing_session";
    };

export class GetGameSessionUseCase {
  public constructor(private readonly sessions: SessionRepository) {}

  public async execute(input: {
    readonly sessionId: string;
  }): Promise<GetGameSessionOutput> {
    const session = await this.sessions.findById(createSessionId(input.sessionId));

    return session === null
      ? { status: "missing_session" }
      : { status: "found", session };
  }
}
