import { enqueuePrompts, type GameSession } from "../../domain/entities/game-session";
import type { PromptId } from "../../domain/value-objects/ids";
import type { PromptCatalog } from "../ports/prompt-catalog";

export const promptQueueTargetSize = 5;
export const promptQueueRefillThreshold = 2;

export class PromptQueueRefiller {
  public constructor(private readonly prompts: PromptCatalog) {}

  public async fillToTarget(
    session: GameSession,
    targetSize = promptQueueTargetSize,
  ): Promise<GameSession> {
    const missingPromptCount = targetSize - session.promptQueue.length;

    if (missingPromptCount <= 0) {
      return session;
    }

    const prompts = await this.prompts.selectBatch(
      {
        type: session.mode,
        mood: session.mood,
        intensity: session.intensity,
        recentPromptIds: [
          ...session.recentPromptIds,
          ...session.promptQueue.map((prompt) => prompt.id),
        ] satisfies readonly PromptId[],
      },
      missingPromptCount,
    );

    return enqueuePrompts(session, prompts, targetSize);
  }
}
