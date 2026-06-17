import type { PromptId, SessionId, UserId } from "../../domain/value-objects/ids";

export interface PrivateAnswerSubmission {
  readonly userId: UserId;
  readonly answer: string;
}

export type SubmitPrivateAnswerOutput =
  | {
      readonly status: "waiting";
      readonly submittedCount: number;
      readonly targetCount: number;
    }
  | {
      readonly status: "complete";
      readonly answers: readonly PrivateAnswerSubmission[];
    }
  | {
      readonly status: "already_revealed";
    };

interface PrivateAnswerRound {
  readonly targetCount: number;
  readonly answers: readonly PrivateAnswerSubmission[];
}

export class PrivateAnswerCoordinator {
  private readonly rounds = new Map<string, PrivateAnswerRound>();
  private readonly revealedRoundKeys = new Set<string>();

  public submit(input: {
    readonly sessionId: SessionId;
    readonly promptId: PromptId;
    readonly userId: UserId;
    readonly answer: string;
    readonly targetCount: number;
  }): SubmitPrivateAnswerOutput {
    const key = privateAnswerRoundKey(input.sessionId, input.promptId);

    if (this.revealedRoundKeys.has(key)) {
      return { status: "already_revealed" };
    }

    const existingRound = this.rounds.get(key) ?? {
      targetCount: input.targetCount,
      answers: [],
    };
    const nextAnswers = [
      ...existingRound.answers.filter((answer) => answer.userId !== input.userId),
      {
        userId: input.userId,
        answer: input.answer,
      },
    ].slice(0, input.targetCount);

    if (nextAnswers.length >= input.targetCount) {
      this.rounds.delete(key);
      this.revealedRoundKeys.add(key);

      return {
        status: "complete",
        answers: nextAnswers,
      };
    }

    this.rounds.set(key, {
      targetCount: input.targetCount,
      answers: nextAnswers,
    });

    return {
      status: "waiting",
      submittedCount: nextAnswers.length,
      targetCount: input.targetCount,
    };
  }

  public clearSession(sessionId: SessionId): void {
    const prefix = `${sessionId}:`;

    for (const key of this.rounds.keys()) {
      if (key.startsWith(prefix)) {
        this.rounds.delete(key);
      }
    }

    for (const key of this.revealedRoundKeys) {
      if (key.startsWith(prefix)) {
        this.revealedRoundKeys.delete(key);
      }
    }
  }
}

function privateAnswerRoundKey(sessionId: SessionId, promptId: PromptId): string {
  return `${sessionId}:${promptId}`;
}
