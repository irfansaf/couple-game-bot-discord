# CoupleGame MVP Plan

## Product Decision

Implement the playable Discord bot first: a private couple server game host that can start a session, present warm relationship prompts, and let either partner skip, soften, spice up, or end the game at any time.

AI generation should come after the static Discord loop works. The AI provider must stay behind an OpenAI-compatible adapter so prompt generation can change without rewriting game rules or Discord interactions.

Truth or Dare has its own turn-based design in `docs/truth-or-dare-design.md`. Treat it as a mode-specific game loop with lobby, joined players, current player, and contextual controls.

The complete MVP game-mode design lives in `docs/mvp-game-designs.md`. Use it as the source of truth for Truth or Dare, Couple Questions, This or That, and shared mode-specific control rules.

## MVP Goals

- Make `/game start` create a simple two-person date-night session in Discord.
- Support Truth or Dare, Couple Questions, and This or That using reviewed static question packs. Truth and Dare are prompt choices inside the full Truth or Dare session, not standalone game modes.
- Present each prompt in a Discord embed with short button controls.
- Keep controls mode-specific. For example, a Truth or Dare session should show Truth/Dare/turn controls, not every game mode button.
- Keep the tone cozy, playful, romantic, deep, funny, and flirty-safe.
- Include consent and comfort controls from the first playable build: Skip, Softer, Spicier, and End Game.
- Add AI-generated prompts only after static packs, session state, and safety filtering are in place.

## Non-Goals

- No web dashboard, landing page, admin portal, analytics suite, payments, public-server moderation, economy system, achievements, or multi-couple matchmaking.
- No long AI explanations in Discord.
- No storage of private answers or intimate content in the MVP.
- No explicit, coercive, cruel, dangerous, illegal, privacy-invasive, or shame-based prompts.
- No provider-specific AI logic inside game use cases.

## First Implementation Slice

Build a static-pack game loop before AI:

1. Validate environment config for Discord login and local guild command registration.
2. Start the bot and expose a basic health-ready path through logs or startup status.
3. Register `/game start` for the configured development guild.
4. Create a Postgres-backed session for the channel or initiating couple through an application repository port.
5. Send a game embed with prompt type, mood, intensity, prompt text, and optional follow-up.
6. Add contextual buttons for each mode: Truth or Dare turn controls, Couple Questions depth controls, and This or That pick controls.
7. Pull prompts from static question packs with basic repeat avoidance inside the session.
8. Keep settings minimal: mood defaults to cozy, intensity defaults to 1 or 2, language defaults to English.

This slice should prove the bot feels like a game host before adding AI.

## Prioritized Backlog

### P0 - Playable Discord Foundation

- Bun, strict TypeScript, `discord.js`, `zod`, and Vitest setup.
- Environment parsing for `DISCORD_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`, `DATABASE_URL`, and `POSTGRES_SSL`.
- PostgreSQL 18 session storage through a repository port, with Drizzle schema and migration tooling.
- Database-generated UUIDv7 session ids for insertion-friendly ordering.
- Bot login, command registration, and `/game start`.
- Domain session model with session id, guild id, channel id, players, mood, intensity, and recent prompt ids.
- Static prompt packs for Truth, Dare, Couple Questions, and This or That prompt types.
- Embed and button handlers for the core play loop.
- Safety controls: Skip, Softer, Spicier, End Game.
- Mode-specific button layouts so each game feels like its own loop.
- Truth or Dare, Couple Questions, and This or That controls should follow `docs/mvp-game-designs.md`.
- Advanced This or That uses a lobby plus hidden Left/Right votes, revealing choices only after all joined players vote.

### P1 - AI Prompt Generation

- OpenAI-compatible chat/completions adapter configured by `AI_BASE_URL`, `AI_API_KEY`, and `AI_MODEL`.
- Per-session prompt queue with batch fill, instant next-prompt pop, and background refill when the queue is low.
- Structured JSON prompt generation with runtime validation.
- Safety prompt template plus app-level filtering before display.
- Repeat avoidance using recent static and AI prompts.
- Fallback to static packs when AI fails, times out, or returns invalid content.
- In normal play, AI generation may be tried first when configured, but static packs remain the safety net so the session keeps moving.
- Prompt queues should target 5 prompts and refill after responses when the queue reaches 2 prompts.

### P2 - Session Settings And Private Answers

- Per-session language, mood, and intensity settings.
- Private answer mode where each partner answers ephemerally and the bot reveals both answers together.
- Clear timeout and cancel behavior for private answers.
- No answer history unless explicitly added later.

### P3 - Replayability

- Daily couple quest.
- More prompt packs and moods.
- Lightweight session recap that avoids storing sensitive answers.
- Optional persistence if local-only sessions become limiting.

## Key User Flows

### Start A Game

1. User runs `/game start`.
2. Bot creates a session with defaults or the selected mode, mood, and intensity options.
3. Bot posts a warm game embed with prompt controls.
4. Either partner uses the mode-specific controls for the chosen game: Truth or Dare lobby/turn controls, Couple Questions controls, or This or That pick controls.

### Choose Prompt Type

1. In Truth or Dare, the current player taps Truth, Dare, or Random during their turn.
2. In quick prompt modes, users tap Next, Skip, Softer, Deeper, or pick controls depending on the mode.
3. Bot selects a matching prompt from the static pack or AI queue, updates the embed, and records the prompt id as recently used.

### Adjust Comfort

1. User taps Softer.
2. Bot lowers intensity or chooses a gentler prompt.
3. User taps Spicier.
4. Bot raises intensity within flirty-safe limits.
5. User taps Skip at any time to move on without explanation.

### End Session

1. User taps End Game.
2. Bot disables session buttons or posts a short closing message.
3. Bot marks the Postgres-backed session as ended and stops accepting its buttons.

### Generate With AI

1. User requests a prompt after AI support exists.
2. Use case asks the AI prompt port for structured JSON.
3. Adapter calls the configured OpenAI-compatible endpoint.
4. App validates schema and safety rules.
5. Bot displays the prompt or falls back to static content.

## Data And Privacy Notes

- Store only gameplay metadata in Postgres: ids, settings, recent prompt ids, statuses, and timestamps.
- Do not store private answers in the MVP.
- Do not log Discord tokens, AI keys, private answers, AI raw completions that may include intimate content, or sensitive user text.
- Prefer ephemeral replies for settings, errors, and private answer collection.
- Treat AI output as untrusted until schema validation and safety checks pass.
- Keep `.env` and generated local data out of git. Provide `.env.example` once implementation introduces env parsing.

## First Backend Milestone Acceptance Criteria

- The bot starts with Bun and strict TypeScript without type errors.
- Missing or invalid Discord environment variables fail fast with clear validation errors.
- Slash commands can be registered to `DISCORD_GUILD_ID` for local development.
- `/game start` creates one active Postgres-backed session and posts a Discord embed.
- The embed includes a reviewed static prompt and only the controls that match the current game mode.
- Button interactions update the session deterministically and return helpful ephemeral errors for expired or missing sessions.
- Skip and End Game work from any prompt state.
- Softer never increases intensity, and Spicier never exceeds the configured safe maximum.
- Recently shown prompt ids are avoided within the same session when alternatives exist.
- Unit tests cover session creation, prompt selection, repeat avoidance, intensity changes, and session ending.
- No AI provider is required for this milestone, but the application layer has a port shape that can support AI generation later.
