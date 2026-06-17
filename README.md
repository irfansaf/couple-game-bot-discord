# CoupleGame Backend

Private Discord bot backend for a couple-focused game host. This scaffold uses Bun, strict TypeScript, clean architecture boundaries, runtime validation with Zod, Discord.js at the presentation edge, an OpenAI-compatible AI adapter, and Postgres via Drizzle ORM plus the `postgres` driver.

## Setup

```bash
bun install
cp .env.example .env
bun run db:up
bun run db:migrate
bun run typecheck
bun run test
```

Fill in Discord and Postgres environment variables before running the bot process. AI variables are optional for the static-pack MVP, but `AI_API_KEY` and `AI_MODEL` must be configured together once AI prompt generation is enabled.

For DeepSeek-compatible generation, set:

```env
AI_BASE_URL=https://api.deepseek.com
AI_API_KEY=your-key
AI_MODEL=deepseek-v4-flash
AI_TIMEOUT_MS=30000
AI_MAX_ATTEMPTS=3
AI_MAX_TOKENS=1800
AI_TEMPERATURE=1.15
AI_MAX_CONTEXT_TOKENS=16000
AI_CAPTURE_OUTPUTS=false
AI_CAPTURE_BATCH_SIZE=20
AI_CAPTURE_FLUSH_INTERVAL_MS=10000
AI_THINKING_MODE=auto
LOG_LEVEL=debug
```

When AI is configured, the game loop tries AI-generated prompts first and falls back to reviewed static prompts if the provider fails, times out, or returns invalid/unsafe content.

The bot keeps a small prompt queue per session. It fills the queue in batches, shows the first prompt, and refills in the background when the queue gets low so most button clicks feel instant.

Each session stores recent prompt IDs and recent prompt text. AI generation receives the recent text history so it can avoid repeating the same idea, while static fallback avoids recently used static IDs.

AI requests are logged through Pino. Use `LOG_LEVEL=debug` while testing providers to see request metadata, attempt number, timeout duration, HTTP status, validation failures, and fallback context. Logs redact credentials and avoid private answer content.

For DeepSeek, `AI_THINKING_MODE=auto` sends non-thinking requests by default because this bot needs fast JSON prompts more than long reasoning. Use `deepseek-v4-flash` for the quickest game UX; reserve Pro for later features that need heavier reasoning. `AI_MAX_CONTEXT_TOKENS` trims old recent prompt history before requests so the game keeps a predictable context budget.

AI prompt behavior is centralized in `src/content/ai-prompt-catalog.ts`. Use the project `ai-engineer` skill when evaluating prompt quality, changing mode guidance, tuning provider settings, or debugging repeated/invalid AI prompts.

AI research capture is opt-in. Set `AI_CAPTURE_OUTPUTS=true` to store generated AI output content and validation metadata in Postgres for later analysis. Writes are non-blocking: the bot queues capture records in memory and flushes them to Postgres in batches controlled by `AI_CAPTURE_BATCH_SIZE` and `AI_CAPTURE_FLUSH_INTERVAL_MS`.

Generated AI output evaluation also has a local workbench in `ai-workbench/`. Put manual captures in `ai-workbench/generated`, keep sanitized shareable examples in `ai-workbench/samples`, then run:

```bash
bun run ai:validate
```

Start a session in Discord with:

```text
/game start mode:Couple Question mood:Cozy intensity:1
```

All options are optional. `Truth or Dare` starts as a lobby with Join, Leave, Start, Rules, and End controls. The host can start once 2-8 players have joined. During the active turn, only the current player chooses Truth, Dare, or Random, and the AI/static batch queue is scoped to that chosen prompt type.

Truth or Dare also has a lobby play context:

- `E-Meet` is the default for remote Discord/video/voice play.
- `Meet` allows safe in-person dares when everyone is physically together.

Changing play context is host-only and only available before Start. The dare queue is scoped to the selected context.

Truth, Dare, Couple Questions, This or That, and After Dark now run as contextual game sessions. Truth and Dare are available only inside the full Truth or Dare session.

Couple Questions starts as a lobby with `Join`, `Leave`, `Start`, `Rules`, and `End`. The host can start with 1 or more players, so it works solo, as a couple, or as a tiny private group. Once active, it uses `Answer`, `Next`, `Skip`, `Softer`, `Deeper`, and `End`. `Answer` opens a private modal for joined players; once every joined player answers, the bot reveals the answers together. Private answers are kept only in bot memory until reveal or round change, not persisted as history.

After Dark is a consent-gated intimate mode for warmer adult couple prompts. It starts as a lobby, can start with 1 or more joined players, and keeps prompts sensual, non-explicit, pressure-free, and skippable. Its active controls are `Answer`, `Next`, `Skip`, `Softer`, `Warmer`, and `End`.

This or That starts as a lobby with `Join`, `Leave`, `Start`, `Rules`, and `End`. After Start, each joined player secretly picks `Left` or `Right`; the bot reveals the split only after everyone has voted, then unlocks `Next`, `Skip`, `Softer`, and `End`.

## Scripts

- `bun run dev` starts the backend with Bun watch mode.
- `bun run start` runs `src/main.ts`.
- `bun run db:up` starts the local Postgres container.
- `bun run db:down` stops the local Postgres container.
- `bun run db:generate` generates Drizzle migrations from the Postgres schema.
- `bun run db:migrate` applies Drizzle migrations to `DATABASE_URL`.
- `bun run ai:validate` validates AI output captures from `ai-workbench/generated`.
- `bun run typecheck` checks strict TypeScript.
- `bun run test` runs the test suite through Vitest.

## Local Postgres

The local database runs through Docker Compose:

```bash
bun run db:up
bun run db:migrate
```

It runs PostgreSQL 18 and exposes Postgres on `localhost:5433` with the same credentials already shown in `.env.example`. PostgreSQL 18 is used so database-generated session IDs can use native timestamp-ordered `uuidv7()`.

```env
DATABASE_URL=postgres://postgres:postgres@localhost:5433/couplegame
POSTGRES_SSL=false
```

## Discord Troubleshooting

If startup fails with `401: Unauthorized` while registering commands, check:

- `DISCORD_TOKEN` is the **Bot Token** from Developer Portal -> your app -> Bot.
- `DISCORD_CLIENT_ID` is the **Application ID** from the same app.
- The token was not copied from Client Secret, Public Key, or OAuth2 pages.
- If you reset the bot token, update `.env` and restart Bun.

If startup fails with `403`, reinvite the bot with both scopes: `bot` and `applications.commands`.

## Architecture

- `src/domain` contains game rules, value objects, entities, and domain errors.
- `src/application` contains use cases and ports.
- `src/infrastructure` implements adapters for Postgres, AI, Discord clients, and logging.
- `src/presentation` maps Discord commands, buttons, and embeds to application behavior.
- `src/config` validates runtime configuration.
- `src/content` keeps the central AI prompt catalog, static question packs, and prompt/safety templates reviewable.
- `src/shared` holds dependency-light utilities.
