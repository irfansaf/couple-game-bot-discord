---
name: ai-engineer
description: Evaluate, validate, and improve CoupleGame AI prompt behavior, prompt catalogs, output schemas, safety filters, AI provider tuning, repeat avoidance, prompt tests, and prompt quality docs. Use when changing AI prompts, adding game modes that generate prompts, debugging invalid AI JSON, reducing repetitive questions, tuning DeepSeek/OpenAI-compatible settings, or reviewing generated question quality.
---

# AI Engineer

## Overview

Use this skill to treat prompt behavior as testable product code. Keep AI instructions centralized, structured, validated, safe, and easy for future agents to audit.

## Core Workflow

1. Read the relevant prompt source first:
   - `src/content/ai-prompt-catalog.ts` for system instructions, mode guidance, output contracts, and quality rules.
   - `src/content/ai-prompt-template.ts` for message assembly and context-budget trimming.
   - `src/content/safety-rules.ts` and `src/domain/services/prompt-safety-policy.ts` for safety boundaries.
   - `src/infrastructure/ai/openai-compatible-question-generator.ts` for provider request/response validation.
   - `src/infrastructure/ai/ai-output-capture.ts` and `src/infrastructure/postgres/postgres-ai-output-capture-repository.ts` for non-blocking research capture.
   - `src/content/question-packs.ts` for static fallback prompts.
   - `ai-workbench/` for exports, local generated output captures, sanitized samples, and validation reports.
2. Identify the exact failure mode: invalid JSON, unsafe wording, repetition, wrong mode, weak tone, latency, provider timeout, context bloat, or poor fallback.
3. Improve the smallest central artifact first. Prefer catalog or schema changes over scattered string edits.
4. Add or update tests for the behavior:
   - AI response parsing and retry behavior.
   - Prompt catalog/message construction.
   - Generated output validation and safety reports.
   - Static fallback safety and mode coverage.
   - Repeat avoidance/context trimming.
5. Use `bun run ai:validate` when generated output samples need evaluation.
6. Run `bun run typecheck` and `bun test`.

## Prompt Quality Standards

- Request structured JSON only; never rely on free-form parsing.
- Keep mode guidance explicit: Truth, Dare, Couple Questions, This or That, and After Dark should each have distinct instructions.
- Keep After Dark adult-intimate but non-explicit, consent-first, and pressure-free.
- Preserve skip, soften, and end-session assumptions in generated content.
- Avoid prompts that are coercive, humiliating, jealousy-based, privacy-invasive, explicit, illegal, dangerous, or involving non-players without consent.
- Keep prompts short enough for Discord embeds.
- Prefer variety through concept diversity, not just paraphrasing.

## Evaluation Checklist

Use this checklist when reviewing prompt changes:

- **Schema:** Can the response pass the Zod schema without repair?
- **Mode fit:** Does the prompt match the requested `type`, `mood`, `intensity`, and `playContext`?
- **Safety:** Would the prompt still be okay if screenshotted later?
- **Consent:** Can either player skip or soften without shame?
- **Novelty:** Is it meaningfully different from recent prompts?
- **Tone:** Does it sound warm, playful, and human instead of clinical or cringe?
- **Fallback:** Does static content remain safe and usable if AI fails?
- **Privacy:** Are private answers and sensitive raw content excluded from logs and persistence?

## AI Workbench

- Put local model output captures in `ai-workbench/generated/`.
- Use `AI_CAPTURE_OUTPUTS=true` to capture live generated output into Postgres for research analysis.
- Live capture is non-blocking and batched; tune with `AI_CAPTURE_BATCH_SIZE` and `AI_CAPTURE_FLUSH_INTERVAL_MS`.
- Keep committed sanitized examples in `ai-workbench/samples/`.
- Run `bun run ai:validate` to validate generated JSON shape and safety filters.
- Review `ai-workbench/reports/latest-validation.json` for per-file errors.
- Do not commit files from `generated/` or `reports/`; they are ignored by git except `.gitkeep`.

## References

Read `references/prompt-system-map.md` when the task needs a map of where prompt behavior lives or what to edit first.
