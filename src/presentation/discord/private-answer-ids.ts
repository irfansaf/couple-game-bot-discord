import { z } from "zod";

const privateAnswerModalSchema = z.object({
  namespace: z.literal("private_answer"),
  sessionId: z.string().min(1),
  promptId: z.string().min(1),
});

export interface ParsedPrivateAnswerModalId {
  readonly sessionId: string;
  readonly promptId: string;
}

export const privateAnswerInputId = "answer";

export function createPrivateAnswerModalId(
  sessionId: string,
  promptId: string,
): string {
  return `private_answer:${sessionId}:${promptId}`;
}

export function parsePrivateAnswerModalId(
  customId: string,
): ParsedPrivateAnswerModalId | null {
  const [namespace, sessionId, promptId, ...rest] = customId.split(":");

  if (rest.length > 0) {
    return null;
  }

  const parsed = privateAnswerModalSchema.safeParse({
    namespace,
    sessionId,
    promptId,
  });

  if (!parsed.success) {
    return null;
  }

  return {
    sessionId: parsed.data.sessionId,
    promptId: parsed.data.promptId,
  };
}
