---
name: backend
description: Build and review the CoupleGame backend with Bun, strict TypeScript, Domain Driven Design, clean architecture, runtime validation, Discord adapters, AI provider adapters, storage ports, repositories, use cases, and tests. Use for any backend implementation, refactor, code review, architecture decision, API/provider integration, persistence, performance, or maintainability work in this Discord bot project.
---

# Backend

## Overview

Use this skill for CoupleGame backend work. Build with Bun, strict TypeScript, Domain Driven Design, clean architecture, runtime validation, and framework-specific code kept at the edges.

## Architecture Rules

Use this dependency direction:

- `src/domain/` contains entities, value objects, domain services, domain errors, and pure business rules.
- `src/application/` contains use cases, DTOs, ports, orchestration, and transaction boundaries.
- `src/infrastructure/` implements ports for Discord, AI providers, storage, logging, and external services.
- `src/presentation/` maps Discord commands, buttons, modals, and embeds to application use cases.
- `src/config/` validates environment and runtime configuration.
- `src/content/` holds static question packs, safety rules, and AI prompt templates.
- `src/shared/` is only for generic, dependency-light utilities.

Never import inward layers from outward layers:

- `domain` imports no app, infrastructure, or presentation code.
- `application` may import `domain`, but not Discord SDKs, databases, or AI SDKs.
- `infrastructure` implements application ports.
- `presentation` depends on application use cases and Discord SDK types.

## TypeScript Standards

- Enable strict compiler settings.
- Avoid `any`. Accept external data as `unknown`, validate it, then narrow it.
- Use `zod` for env vars, AI responses, storage reads, and external payloads.
- Prefer branded/value-object identifiers for session IDs, guild IDs, user IDs, prompt IDs, and intensity levels.
- Model game concepts explicitly: `GameSession`, `GameMode`, `Prompt`, `Mood`, `Intensity`, `Player`, `Turn`.
- Use discriminated unions for command results and domain/application errors.
- Keep use cases deterministic where possible.
- Inject dependencies through constructors or factories.
- Avoid global mutable state except for intentional process-level singletons created at composition root.

## Bun Defaults

- Use Bun as runtime, package manager, and script runner.
- Prefer Bun-native APIs when they keep code simple, but avoid locking core domain/application logic to Bun APIs.
- Use `bun test` unless the project intentionally adopts Vitest.
- Keep `package.json` scripts short and predictable: `dev`, `start`, `test`, `typecheck`, `lint` when available.

## Implementation Workflow

For backend changes:

1. Read `AGENTS.md` and existing source structure.
2. Place business behavior in `domain` or `application` before adding adapters.
3. Define or update ports before writing infrastructure integrations.
4. Validate all boundary data.
5. Add focused tests for domain rules, use cases, AI parsing, safety filters, and storage behavior.
6. Run typecheck and tests when available.

## AI Provider Pattern

Keep AI behind an application port, for example:

```ts
export interface QuestionGenerator {
  generate(input: GenerateQuestionInput): Promise<GeneratedQuestion>;
}
```

Infrastructure adapters may call DeepSeek, OpenAI, Claude-compatible gateways, or other OpenAI-compatible APIs. Application code should not know provider-specific request fields beyond the port contract.

Require structured JSON from AI and validate it before display. If validation fails, return a safe fallback prompt or a typed recoverable error.

## Discord Boundary Pattern

Discord-specific code belongs in `presentation` and `infrastructure`.

- `presentation` parses slash commands/buttons and formats replies.
- `application` receives clean DTOs and returns clean results.
- `domain` never imports `discord.js`.
- Use ephemeral replies for settings, private answers, and errors when appropriate.

## Safety And Privacy Requirements

- Never log Discord tokens, AI keys, private answers, or intimate user content.
- Do not persist private answers unless a feature explicitly requires it and the user accepts that behavior.
- Treat AI-generated prompts as untrusted.
- Filter or reject unsafe dares before rendering.
- Always support skip, soften, and end-session paths in game use cases.

## Review Checklist

Before finishing backend work, verify:

- Layer dependencies point inward only.
- Domain logic is testable without Discord, database, or AI clients.
- External data is validated at boundaries.
- Errors are typed and recoverable where possible.
- Secrets are read from env, never hardcoded.
- The implementation is small enough for the current MVP.
