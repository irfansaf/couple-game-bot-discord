const disallowedFragments = [
  "coerce",
  "blackmail",
  "humiliate",
  "threaten",
  "password",
  "secretly record",
  "without consent",
  "illegal",
] as const;

export class PromptSafetyPolicy {
  public isAllowed(promptText: string): boolean {
    const normalized = promptText.toLowerCase();

    return !disallowedFragments.some((fragment) =>
      normalized.includes(fragment),
    );
  }
}
