import type { SessionId } from "../../domain/value-objects/ids";

export interface SessionIdGenerator {
  next(): Promise<SessionId>;
}
