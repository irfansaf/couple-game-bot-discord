# Agents Instruction

## Project Direction

This project is a Discord bot for a private couple-focused server. The first product version should feel like a warm, playful game host for two people: Truth or Dare, couple questions, private answers, AI-generated prompts, and lightweight date-night style sessions.

The project may use an OpenAI-compatible API provider such as DeepSeek, OpenAI, Claude-compatible gateways, or another model endpoint. Keep the AI provider behind a small adapter so the app can switch providers without rewriting game logic.

## Product Principles

- Build the playable Discord experience first, not a marketing site or dashboard.
- Keep the MVP small: slash commands, game sessions, buttons, static question packs, then AI generation.
- The bot should support cozy, funny, romantic, deep, and flirty-safe modes.
- Consent and comfort matter. Always include skip/soften controls for questions and dares.
- Avoid manipulative, cruel, coercive, explicit, illegal, dangerous, or privacy-invasive prompts.
- Prefer relationship-positive prompts: reflection, appreciation, humor, memories, future plans, small challenges, and emotional closeness.
- Design for a private couple server first. Do not assume large public-server moderation needs unless the user asks for it.

## Suggested MVP Scope

Start with these features unless the user changes direction:

1. Discord bot login and health check.
2. Slash command such as `/game start`.
3. Static question packs for:
   - Truth
   - Dare
   - Couple Questions
   - This or That
4. Discord embeds with buttons:
   - Truth
   - Dare
   - Next
   - Skip
   - Softer
   - Spicier
   - End Game
5. AI question generation through an OpenAI-compatible chat/completions API.
6. Per-server or per-session settings:
   - language
   - mood
   - intensity
   - repeat avoidance
7. Optional private answer mode where both users answer privately and the bot reveals both answers together.

## Technical Defaults

Use these defaults when starting from scratch:

| Area | Default |
|------|---------|
| Runtime | Bun |
| Language | Strict TypeScript |
| Discord SDK | `discord.js` |
| Package manager | Bun |
| Validation | `zod` for environment variables, AI responses, and user inputs |
| Storage MVP | PostgreSQL 18 with Drizzle ORM |
| Storage Later | Supabase/Postgres managed hosting if persistence, auth, or dashboard features grow |
| Tests | Vitest |
| Formatting | Prettier plus ESLint if the project is TypeScript-based |

Backend code should follow Domain Driven Design and clean architecture principles. The goal is code that is clean, reusable, maintainable, high-performance, efficient, and easy to test.

Use PostgreSQL 18 for local and production database assumptions. Prefer database-generated UUIDv7 primary keys for persisted entities that need stable IDs and insertion-friendly ordering.

Preferred backend structure:

| Module | Responsibility |
|--------|----------------|
| `src/domain/` | Core business rules, entities, value objects, domain services, domain errors |
| `src/application/` | Use cases, ports/interfaces, DTOs, orchestration, transaction boundaries |
| `src/infrastructure/` | Discord SDK adapters, AI provider adapters, persistence, logging, external services |
| `src/presentation/` | Discord slash commands, button handlers, embeds, interaction routing |
| `src/config/` | Environment parsing and runtime configuration |
| `src/content/` | Static question packs, safety rules, prompt templates |
| `src/shared/` | Cross-cutting utilities that are truly generic and dependency-light |

Dependency direction:

- `domain` must not import from `application`, `infrastructure`, or `presentation`.
- `application` may import `domain` and define ports, but must not depend directly on Discord, databases, or AI SDKs.
- `infrastructure` implements application ports.
- `presentation` translates Discord interactions into application use case calls.
- Keep framework-specific code at the edges.

TypeScript standards:

- Enable strict compiler settings.
- Avoid `any`; use `unknown` plus validation when accepting external data.
- Validate all environment variables, Discord interaction payload assumptions, storage reads, and AI responses at runtime.
- Prefer explicit domain types and branded/value-object style types for important identifiers such as session IDs, guild IDs, user IDs, prompt IDs, and intensity levels.
- Keep use cases small and deterministic where possible.
- Use dependency injection through constructors or factories rather than global mutable state.

## AI Rules

When using AI for question generation:

- Request structured JSON, not free-form prose.
- Validate all AI output with a runtime schema before posting to Discord.
- Keep safety instructions close to the AI prompt and also enforce them in app code where possible.
- Track recent questions per session so AI output does not repeat.
- Keep model configuration in environment variables, never hardcoded.
- Do not log API keys, Discord bot tokens, private answers, or sensitive user content.

Recommended AI output shape:

```json
{
  "type": "truth",
  "mood": "romantic",
  "intensity": 2,
  "question": "What is one small thing I do that makes you feel loved?",
  "followUp": "When did you first notice it?",
  "safetyNotes": []
}
```

## Safety And Privacy

This project is intimate by design, so privacy is a product requirement:

- Store only what is needed for gameplay.
- Prefer ephemeral Discord replies for private answers and settings.
- Do not store private answers unless the user explicitly asks for history.
- Never commit `.env`, tokens, API keys, Discord application secrets, or generated database files containing private data.
- Add `.env.example` when environment variables are introduced.
- Treat AI-generated dares as untrusted content. Validate and filter before display.
- For spicy or flirty modes, keep prompts non-explicit and pressure-free.
- Always allow users to skip, end, or soften a prompt.

## Discord UX Rules

- Prefer slash commands and buttons over text-command parsing.
- Use Discord embeds for game cards.
- Keep button labels short and clear.
- Use ephemeral responses for settings, errors, and private answer collection.
- Make commands forgiving: helpful error messages, sensible defaults, and simple recovery.
- Avoid posting long AI explanations in the channel. The bot should feel like a game host, not a lecture.

## Environment Variables

Expected variables once implementation begins:

```env
DISCORD_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
AI_BASE_URL=
AI_API_KEY=
AI_MODEL=
DATABASE_URL=
POSTGRES_SSL=false
```

Use `DISCORD_GUILD_ID` for fast local slash-command registration during development. Later, support global command registration when the bot is stable.

## Project Skills

This project has five project-scoped Codex skills in `.\.codex\skills`. New sessions should use them whenever the task matches their scope. Read the relevant `SKILL.md` before doing substantial work.

| Skill | Path | Use When |
|------|------|----------|
| Product Owner | `.\.codex\skills\product-owner\SKILL.md` | Shaping MVP scope, game modes, feature backlog, release planning, or product sense review. |
| Game Designer | `.\.codex\skills\game-designer\SKILL.md` | Designing game rules, turn flow, mode-specific controls, prompt pacing, safety limits, or translating classic games like Truth or Dare into Discord-native flows. |
| AI Engineer | `.\.codex\skills\ai-engineer\SKILL.md` | Evaluating, validating, tuning, and improving AI prompt behavior, prompt catalogs, schemas, safety filters, provider settings, and repeat avoidance. |
| Backend | `.\.codex\skills\backend\SKILL.md` | Building Discord bot services, AI adapters, storage, validation, tests, and deployment. |
| Discord UX | `.\.codex\skills\discord-ux\SKILL.md` | Designing commands, embeds, buttons, interaction flows, and private answer experiences. |

### Skill Use Rules

- If project skills exist and match the task, read the relevant `SKILL.md` before substantial work.
- For product planning, start with Product Owner.
- For game rules, mode mechanics, or classic-game adaptation, use Game Designer before implementation.
- For AI prompts, provider tuning, schema validation, prompt quality, or repeat avoidance, use AI Engineer before implementation.
- For implementation, use Backend first.
- For Discord interaction design, use Discord UX when available.
- For full product work, use this order when relevant: Product Owner -> Game Designer -> AI Engineer -> Backend -> Discord UX.

## Knowledge Wiki

If a persistent knowledge wiki is added, use `./vaults` with this structure:

| What | Path |
|------|------|
| Wiki index | `.\vaults\wiki\index.md` |
| Wiki log | `.\vaults\wiki\log.md` |
| Wiki pages | `.\vaults\wiki\{entities,concepts,sources,synthesis}\` |
| Raw sources | `.\vaults\raw\` |
| Project docs | `.\docs\` |

### When To READ The Wiki

- Before starting work on a feature or service.
- When the user asks how something works.
- When you encounter an unfamiliar architecture decision, game flow, Discord pattern, or AI prompt pattern.

### When To WRITE To The Wiki

- After significant code changes.
- After adding or changing game modes, AI behavior, storage models, Discord commands, or deployment assumptions.
- When you discover an important design decision or gotcha.
- When the user asks you to ingest a source.

### When NOT To Write

- Do not update the wiki for typo fixes, minor formatting changes, or tiny refactors.
- Do not duplicate git history. The wiki is for synthesized knowledge and decisions.

### Write Rules

- Never modify files in `raw/`.
- `docs/` is writable project documentation.
- `wiki/` is writable synthesized project knowledge.
- Always update `wiki/index.md` after creating or significantly updating a page.
- Always append to `wiki/log.md` after ingest, synthesis creation, or lint.
- Use `[[wikilinks]]` for cross-references.
- Use `kebab-case.md` filenames.
- Update the `updated` field in frontmatter when modifying a page.

---

## Wiki Operations

### Ingest

When the user says "ingest this":

1. Read the source completely.
2. Discuss key takeaways with the user.
3. Create a source summary page in `wiki/sources/`.
4. Update or create entity/concept pages.
5. Update `wiki/index.md`.
6. Append to `wiki/log.md`.

### Query

When the user asks a question the wiki might answer:

1. Read `wiki/index.md` to find relevant pages.
2. Read those pages.
3. Synthesize an answer.
4. If substantial, offer to file it as a `wiki/synthesis/` page.

### Lint

When the user asks for a health check, or when it is clearly useful, check for contradictions, stale claims, orphan pages, missing pages for mentioned concepts, and missing cross-references. Fix what you can and flag the rest.

### Code Change To Wiki Update

After significant code work:

1. Skim `wiki/index.md` if it exists.
2. Read related pages.
3. Update affected feature, service, or concept pages.
4. Append a brief log entry: `## [YYYY-MM-DD] update | What changed`.

---

## Page Format

```markdown
---
title: Page Title
type: entity | concept | source | synthesis
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags: [relevant, tags]
sources: [source filenames this page draws from]
---

# Page Title

Content. Use [[wikilinks]] for cross-references.

## See Also

- [[Related Page]]
```

---

## Development Workflow

- Check existing files before adding new structure.
- Prefer small, focused commits when the user asks for git work.
- Use TypeScript strictness once a TypeScript project exists.
- Add tests for game flow, AI response parsing, safety filters, and storage behavior.
- Keep AI prompts and question packs easy to review.
- Do not introduce a web dashboard until the Discord bot MVP works.
- Do not add broad infrastructure unless the user asks for deployment.

## Definition Of Done

For implementation tasks, aim to finish with:

- Working Discord command or game behavior.
- Validated environment configuration.
- No committed secrets.
- Tests or a clear note explaining why tests were not run.
- Updated docs/wiki when the change is significant.
- A concise summary of what changed and how to try it.
