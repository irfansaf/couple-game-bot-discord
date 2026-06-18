import { describe, expect, it } from "vitest";

import {
  aiPromptCatalog,
  buildAiSystemPrompt,
} from "../../src/content/ai-prompt-catalog";
import { promptTypes } from "../../src/domain/entities/prompt";

describe("aiPromptCatalog", () => {
  it("defines mode guidance for every prompt type", () => {
    expect(Object.keys(aiPromptCatalog.modeGuidance).sort()).toEqual(
      [...promptTypes].sort(),
    );
  });

  it("builds mode-specific batch system prompts", () => {
    const prompt = buildAiSystemPrompt({
      promptType: "after_dark",
      responseShape: "batch",
    });

    expect(prompt).toContain("questions array");
    expect(prompt).toContain("do not return a bare array");
    expect(prompt).toContain("after_dark");
    expect(prompt).toContain("non-explicit");
    expect(prompt).toContain("consent-first");
  });

  it("adds Date Night step guidance when provided", () => {
    const prompt = buildAiSystemPrompt({
      promptType: "couple_question",
      responseShape: "batch",
      dateNightStep: "appreciation",
    });

    expect(prompt).toContain("Date Night appreciation");
    expect(prompt).toContain("gratitude");
  });
});
