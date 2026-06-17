import type {
  PromptCatalog,
  PromptSelectionInput,
} from "../../application/ports/prompt-catalog";
import {
  staticPromptTemplates,
  type StaticPromptTemplate,
} from "../../content/question-packs";
import type { Prompt } from "../../domain/entities/prompt";
import { createPromptId } from "../../domain/value-objects/ids";
import { createIntensity, intensityValue } from "../../domain/value-objects/intensity";

export class StaticPromptCatalog implements PromptCatalog {
  public constructor(
    private readonly templates: readonly StaticPromptTemplate[] = staticPromptTemplates,
  ) {}

  public async select(input: PromptSelectionInput): Promise<Prompt | null> {
    return this.selectOne(input, new Set(input.recentPromptIds));
  }

  public async selectBatch(
    input: PromptSelectionInput,
    count: number,
  ): Promise<readonly Prompt[]> {
    if (!Number.isInteger(count) || count <= 0) {
      return [];
    }

    const prompts: Prompt[] = [];
    const excludedIds = new Set(input.recentPromptIds);

    for (let index = 0; index < count; index += 1) {
      const prompt = this.selectOne(input, excludedIds);

      if (prompt === null) {
        break;
      }

      prompts.push(prompt);
      excludedIds.add(prompt.id);
    }

    return prompts;
  }

  private selectOne(
    input: PromptSelectionInput,
    excludedIds: ReadonlySet<string>,
  ): Prompt | null {
    const candidates = this.rankCandidates(input);
    const freshCandidate = candidates.find(
      (template) => !excludedIds.has(template.id),
    );
    const selected = freshCandidate ?? candidates[0];

    return selected === undefined ? null : toPrompt(selected);
  }

  private rankCandidates(
    input: PromptSelectionInput,
  ): readonly StaticPromptTemplate[] {
    const targetIntensity = intensityValue(input.intensity);
    const sameType = this.templates.filter(
      (template) =>
        template.type === input.type && matchesPlayContext(template, input),
    );

    return sameType
      .map((template) => ({
        template,
        score:
          (template.mood === input.mood ? 100 : 0) +
          (template.intensity === targetIntensity ? 50 : 0) -
          Math.abs(template.intensity - targetIntensity),
      }))
      .sort((left, right) => right.score - left.score)
      .map(({ template }) => template);
  }
}

function matchesPlayContext(
  template: StaticPromptTemplate,
  input: PromptSelectionInput,
): boolean {
  if (template.type !== "dare" || input.playContext === undefined) {
    return true;
  }

  return template.playContexts?.includes(input.playContext) ?? true;
}

function toPrompt(template: StaticPromptTemplate): Prompt {
  return {
    id: createPromptId(template.id),
    type: template.type,
    mood: template.mood,
    intensity: createIntensity(template.intensity),
    text: template.text,
    safetyNotes: [],
    source: "static",
    ...(template.followUp === undefined ? {} : { followUp: template.followUp }),
  };
}
