import { z } from "zod";

import { gameActions, type GameAction } from "../../application/use-cases/handle-game-action";

const buttonIdSchema = z.object({
  namespace: z.literal("game"),
  action: z.enum(gameActions),
  sessionId: z.string().min(1),
});

export interface ParsedGameButtonId {
  readonly action: GameAction;
  readonly sessionId: string;
}

export function createGameButtonId(
  action: GameAction,
  sessionId: string,
): string {
  return `game:${action}:${sessionId}`;
}

export function parseGameButtonId(customId: string): ParsedGameButtonId | null {
  const [namespace, action, sessionId] = customId.split(":");
  const parsed = buttonIdSchema.safeParse({ namespace, action, sessionId });

  if (!parsed.success) {
    return null;
  }

  return {
    action: parsed.data.action,
    sessionId: parsed.data.sessionId,
  };
}
