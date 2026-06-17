import { describe, expect, it } from "vitest";

import {
  createPrivateAnswerModalId,
  parsePrivateAnswerModalId,
} from "../../src/presentation/discord/private-answer-ids";

describe("private answer modal ids", () => {
  it("round-trips session and prompt ids", () => {
    const customId = createPrivateAnswerModalId(
      "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
      "couple-question-cozy-1-tiny-kindness",
    );

    expect(parsePrivateAnswerModalId(customId)).toEqual({
      sessionId: "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
      promptId: "couple-question-cozy-1-tiny-kindness",
    });
  });

  it("rejects malformed ids", () => {
    expect(parsePrivateAnswerModalId("game:answer:session")).toBeNull();
    expect(parsePrivateAnswerModalId("private_answer:session")).toBeNull();
    expect(parsePrivateAnswerModalId("private_answer:a:b:c")).toBeNull();
  });
});
