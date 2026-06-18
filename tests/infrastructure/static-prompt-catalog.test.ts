import { describe, expect, it } from "vitest";

import { StaticPromptCatalog } from "../../src/infrastructure/content/static-prompt-catalog";
import type { StaticPromptTemplate } from "../../src/content/question-packs";
import { createIntensity } from "../../src/domain/value-objects/intensity";

const templates = [
  {
    id: "remote-dare",
    type: "dare",
    mood: "cozy",
    intensity: 1,
    text: "Send a two-line compliment in chat.",
    playContexts: ["e_meet"],
  },
  {
    id: "meet-dare",
    type: "dare",
    mood: "cozy",
    intensity: 1,
    text: "Give your partner a sincere compliment while making eye contact.",
    playContexts: ["meet"],
  },
] satisfies readonly StaticPromptTemplate[];

describe("StaticPromptCatalog", () => {
  it("keeps remote Truth or Dare dares compatible with e-meet play", async () => {
    const prompt = await new StaticPromptCatalog(templates).select({
      type: "dare",
      mood: "cozy",
      intensity: createIntensity(1),
      recentPromptIds: [],
      recentPromptTexts: [],
      playContext: "e_meet",
    });

    expect(prompt?.id).toBe("remote-dare");
  });

  it("allows in-person dares for meet play", async () => {
    const prompt = await new StaticPromptCatalog(templates).select({
      type: "dare",
      mood: "cozy",
      intensity: createIntensity(1),
      recentPromptIds: [],
      recentPromptTexts: [],
      playContext: "meet",
    });

    expect(prompt?.id).toBe("meet-dare");
  });

  it("serves non-explicit After Dark prompts", async () => {
    const prompt = await new StaticPromptCatalog().select({
      type: "after_dark",
      mood: "flirty_safe",
      intensity: createIntensity(2),
      recentPromptIds: [],
      recentPromptTexts: [],
    });

    expect(prompt?.type).toBe("after_dark");
    expect(prompt?.text.toLowerCase()).not.toContain("explicit");
  });

  it("serves step-specific Date Night prompts", async () => {
    const prompt = await new StaticPromptCatalog().select({
      type: "couple_question",
      mood: "romantic",
      intensity: createIntensity(2),
      recentPromptIds: [],
      recentPromptTexts: [],
      dateNightStep: "appreciation",
    });

    expect(prompt?.id).toContain("date-night-appreciation");
    expect(prompt?.type).toBe("couple_question");
  });
});
