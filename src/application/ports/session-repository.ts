import type { GameSession } from "../../domain/entities/game-session";
import type { SessionId } from "../../domain/value-objects/ids";

export interface SessionRepository {
  save(session: GameSession): Promise<void>;
  findById(id: SessionId): Promise<GameSession | null>;
}
