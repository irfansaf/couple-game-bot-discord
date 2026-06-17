import {
  enqueuePrompts,
  promptTypeForQueue,
  type GameSession,
} from "../../domain/entities/game-session";
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
    const promptType = promptTypeForQueue(session);

    if (promptType === null) {
      return session;
    }

    const missingPromptCount = targetSize - session.promptQueue.length;

    if (missingPromptCount <= 0) {
      return session;
    }

    const prompts = await this.prompts.selectBatch(
      {
        type: promptType,
        mood: session.mood,
        intensity: session.intensity,
        recentPromptIds: [
          ...session.recentPromptIds,
          ...session.promptQueue.map((prompt) => prompt.id),
        ] satisfies readonly PromptId[],
        recentPromptTexts: [
          ...session.recentPromptTexts,
          ...session.promptQueue.map((prompt) => prompt.text),
        ],
        playContext: session.playContext,
      },
      missingPromptCount,
    );

    return enqueuePrompts(session, prompts, targetSize);
  }
}
