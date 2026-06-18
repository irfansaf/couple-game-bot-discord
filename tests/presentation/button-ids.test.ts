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

  it("round-trips Couple Questions depth buttons", () => {
    const buttonId = createGameButtonId(
      "deeper",
      "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    );

    expect(parseGameButtonId(buttonId)).toEqual({
      action: "deeper",
      sessionId: "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    });
  });

  it("round-trips Couple Questions private answer buttons", () => {
    const buttonId = createGameButtonId(
      "answer_private",
      "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    );

    expect(parseGameButtonId(buttonId)).toEqual({
      action: "answer_private",
      sessionId: "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    });
  });

  it("round-trips Couple Questions lobby buttons", () => {
    const buttonId = createGameButtonId(
      "start_couple_question",
      "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    );

    expect(parseGameButtonId(buttonId)).toEqual({
      action: "start_couple_question",
      sessionId: "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    });
  });

  it("round-trips After Dark session buttons", () => {
    const startButtonId = createGameButtonId(
      "start_after_dark",
      "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    );
    const modeButtonId = createGameButtonId(
      "after_dark",
      "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    );

    expect(parseGameButtonId(startButtonId)).toEqual({
      action: "start_after_dark",
      sessionId: "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    });
    expect(parseGameButtonId(modeButtonId)).toEqual({
      action: "after_dark",
      sessionId: "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    });
  });

  it("round-trips This or That pick buttons", () => {
    const buttonId = createGameButtonId(
      "pick_right",
      "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    );

    expect(parseGameButtonId(buttonId)).toEqual({
      action: "pick_right",
      sessionId: "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    });
  });

  it("round-trips This or That lobby buttons", () => {
    const buttonId = createGameButtonId(
      "start_this_or_that",
      "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    );

    expect(parseGameButtonId(buttonId)).toEqual({
      action: "start_this_or_that",
      sessionId: "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    });
  });

  it("round-trips Date Night session buttons", () => {
    const startButtonId = createGameButtonId(
      "start_date_night",
      "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    );
    const continueButtonId = createGameButtonId(
      "continue_date_night",
      "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    );

    expect(parseGameButtonId(startButtonId)).toEqual({
      action: "start_date_night",
      sessionId: "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    });
    expect(parseGameButtonId(continueButtonId)).toEqual({
      action: "continue_date_night",
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

  it("round-trips Truth or Dare play context buttons", () => {
    const buttonId = createGameButtonId(
      "set_context_e_meet",
      "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    );

    expect(parseGameButtonId(buttonId)).toEqual({
      action: "set_context_e_meet",
      sessionId: "019ed5c9-03f7-7dc7-8660-f41abdeca21d",
    });
  });

  it("rejects unknown button ids", () => {
    expect(parseGameButtonId("game:unknown:session")).toBeNull();
    expect(parseGameButtonId("other:truth:session")).toBeNull();
  });
});
