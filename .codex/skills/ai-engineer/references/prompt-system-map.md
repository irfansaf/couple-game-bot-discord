# CoupleGame Prompt System Map

## Source Files

- `src/content/ai-prompt-catalog.ts`: central AI prompt catalog. Owns host role, JSON output contracts, quality rules, mode-specific guidance, and shared safety instructions.
- `src/content/ai-prompt-template.ts`: builds chat messages from the catalog and trims old recent questions to fit `AI_MAX_CONTEXT_TOKENS`.
- `src/content/safety-rules.ts`: concise safety instructions sent to the AI provider.
- `src/domain/services/prompt-safety-policy.ts`: app-level deny-list filter after AI output validation.
- `src/infrastructure/ai/openai-compatible-question-generator.ts`: OpenAI-compatible adapter, JSON parsing, Zod validation, retries, timeout handling, DeepSeek thinking mode, and provider logging.
- `src/content/question-packs.ts`: reviewed static fallback prompts.
- `src/content/ai-generated-output.ts`: shared generated-output schemas, normalization, and validation for runtime and offline evaluation.
- `ai-workbench/`: generated output captures, sanitized samples, and local validation reports.

## Prompt Change Order

1. Update `ai-prompt-catalog.ts` for system behavior, mode guidance, tone, or output contract wording.
2. Update `safety-rules.ts` or `PromptSafetyPolicy` for cross-mode safety boundaries.
3. Update `question-packs.ts` for reviewed static examples and fallback coverage.
4. Update `openai-compatible-question-generator.ts` only when request/response mechanics change.
5. Drop sanitized or local generated examples into `ai-workbench/` when evaluating real provider behavior.
6. Run `bun run ai:validate` to produce a report.
7. Add tests near the behavior changed.

## Common Test Targets

- `tests/infrastructure/openai-compatible-question-generator.test.ts`
- `tests/content/ai-generated-output.test.ts`
- `tests/infrastructure/static-prompt-catalog.test.ts`
- `tests/infrastructure/ai-first-prompt-catalog.test.ts`
- `tests/config/env.test.ts`

## Evaluation Notes

- Treat AI output as untrusted even when it comes from a good provider.
- Prefer rejecting unsafe output and falling back to static prompts over posting borderline content.
- Keep raw AI completions and private answers out of logs.
- Keep raw local generated output in `ai-workbench/generated/`; it is gitignored.
- For repeated prompts, preserve newest recent prompt text first and trim oldest context first.
