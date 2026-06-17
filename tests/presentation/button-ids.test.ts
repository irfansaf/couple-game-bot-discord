import { describe, expect, it } from "vitest";

import {
  createGameButtonId,
  parseGameButtonId,
} from "../../src/presentation/discord/button-ids";

describe("game button ids", () => {
  it("round-trips mode buttons with the session id", () => {
    const buttonId = createGameButtonId(
      "couple_question",
      "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    );

    expect(parseGameButtonId(buttonId)).toEqual({
      action: "couple_question",
      sessionId: "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    });
  });

  it("round-trips Truth or Dare session buttons", () => {
    const buttonId = createGameButtonId(
      "start_tod",
      "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    );

    expect(parseGameButtonId(buttonId)).toEqual({
      action: "start_tod",
      sessionId: "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    });
  });

  it("rejects unknown button ids", () => {
    expect(parseGameButtonId("game:unknown:session")).toBeNull();
    expect(parseGameButtonId("other:truth:session")).toBeNull();
  });
});
