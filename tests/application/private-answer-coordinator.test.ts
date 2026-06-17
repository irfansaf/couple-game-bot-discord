import { describe, expect, it } from "vitest";

import { PrivateAnswerCoordinator } from "../../src/application/services/private-answer-coordinator";
import {
  createPromptId,
  createSessionId,
  createUserId,
} from "../../src/domain/value-objects/ids";

describe("PrivateAnswerCoordinator", () => {
  it("waits for two distinct answers before revealing and then clears text", () => {
    const coordinator = new PrivateAnswerCoordinator();
    const sessionId = createSessionId("019ed5c9-03f7-7dc7-8660-f41abdeca21d");
    const promptId = createPromptId("couple-question-cozy-1-tiny-kindness");

    const first = coordinator.submit({
      sessionId,
      promptId,
      userId: createUserId("user-1"),
      answer: "Coffee before a long day.",
      targetCount: 2,
    });
    const updatedFirst = coordinator.submit({
      sessionId,
      promptId,
      userId: createUserId("user-1"),
      answer: "A quiet coffee before a long day.",
      targetCount: 2,
    });
    const second = coordinator.submit({
      sessionId,
      promptId,
      userId: createUserId("user-2"),
      answer: "When you send me tiny updates.",
      targetCount: 2,
    });
    const afterReveal = coordinator.submit({
      sessionId,
      promptId,
      userId: createUserId("user-2"),
      answer: "Trying again.",
      targetCount: 2,
    });

    expect(first).toEqual({
      status: "waiting",
      submittedCount: 1,
      targetCount: 2,
    });
    expect(updatedFirst).toEqual({
      status: "waiting",
      submittedCount: 1,
      targetCount: 2,
    });
    expect(second).toEqual({
      status: "complete",
      answers: [
        {
          userId: "user-1",
          answer: "A quiet coffee before a long day.",
        },
        {
          userId: "user-2",
          answer: "When you send me tiny updates.",
        },
      ],
    });
    expect(afterReveal).toEqual({ status: "already_revealed" });
  });

  it("clears a session so the next prompt can collect answers again", () => {
    const coordinator = new PrivateAnswerCoordinator();
    const sessionId = createSessionId("019ed5c9-03f7-7dc7-8660-f41abdeca21d");
    const promptId = createPromptId("couple-question-cozy-1-tiny-kindness");

    coordinator.submit({
      sessionId,
      promptId,
      userId: createUserId("user-1"),
      answer: "First answer.",
      targetCount: 2,
    });
    coordinator.clearSession(sessionId);

    expect(
      coordinator.submit({
        sessionId,
        promptId,
        userId: createUserId("user-2"),
        answer: "Fresh answer.",
        targetCount: 2,
      }),
    ).toEqual({
      status: "waiting",
      submittedCount: 1,
      targetCount: 2,
    });
  });

  it("reveals immediately when the session has one answering player", () => {
    const coordinator = new PrivateAnswerCoordinator();
    const sessionId = createSessionId("019ed5c9-03f7-7dc7-8660-f41abdeca21d");
    const promptId = createPromptId("couple-question-cozy-1-tiny-kindness");

    expect(
      coordinator.submit({
        sessionId,
        promptId,
        userId: createUserId("user-1"),
        answer: "I liked hearing that story again.",
        targetCount: 1,
      }),
    ).toEqual({
      status: "complete",
      answers: [
        {
          userId: "user-1",
          answer: "I liked hearing that story again.",
        },
      ],
    });
  });
});
