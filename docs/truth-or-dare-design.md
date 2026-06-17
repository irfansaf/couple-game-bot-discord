# Truth Or Dare Discord Design

## Mode Goal

Truth or Dare should feel like a real turn-based party game hosted inside Discord, not a generic prompt carousel. Players join a session, agree to limits, take turns choosing Truth or Dare, resolve the prompt, then pass the turn.

## Player Setup

- Minimum players: 2.
- Maximum players: 8.
- Default audience: private couple server, but the mode supports small friend groups.
- Join window: lobby stays open until the host presses Start.
- Turn order: join order for MVP.
- Current player: only the current player should choose Truth or Dare, mark Done/Answered, or Skip.
- Host: the session creator can Start, End, and optionally remove inactive players later.
- Play context: host chooses whether the session is `meet` or `e-meet` before Start.

Eight is the recommended max because Truth or Dare turns can become slow when each person waits too long. For bigger groups later, add a spectator mode instead of raising the active player cap.

## Play Context

Truth or Dare needs a session-level context because dares change a lot depending on whether players are physically together.

### Meet

Use when players are together in person.

Design intent:
- Dares may include safe, consensual, non-explicit physical-world actions.
- Dares can use shared space: sit nearby, make eye contact, swap seats, make a snack, write a note, choose a song, do a tiny performance.
- Dares should still avoid coercion, explicit intimacy, danger, embarrassment, or involving non-players.

Good dare shape:
- "Give your partner a sincere 10-second compliment while making eye contact."
- "Pick a song and do a tiny dramatic dance move together."
- "Write a quick note and hand it to your partner."

Avoid:
- Anything unsafe, sexual, humiliating, public-facing, or dependent on objects the players might not have.
- Anything that pressures touch without clear comfort.

### E-Meet

Use when players are remote or only together through Discord/video/voice.

Design intent:
- Dares should be doable through chat, voice, camera, reactions, images, music links, or small personal actions.
- Dares can ask for voice notes, messages, emojis, tiny performances, playlists, selfies only if clearly optional and safe, or show-and-tell objects nearby.
- Dares should not assume physical presence, shared space, or physical contact.

Good dare shape:
- "Send a two-line dramatic compliment in chat."
- "Use only emojis to describe your current mood, then explain one of them."
- "Pick a song that matches your partner and send the title."

Avoid:
- Physical-contact prompts.
- Anything requiring proof, screenshots, location, private photos, or public posting.
- Anything that cannot be done inside Discord or a normal remote call.

Recommended default:
- Default new sessions to `e-meet`, because Discord play should work even when people are apart.
- Let the host switch to `meet` in the lobby before Start.
- Show the context in the lobby and prompt footer so players understand why dares feel different.

## State Machine

### 1. Lobby

Purpose: gather players and set expectations.

Embed:
- Title: Truth or Dare Lobby
- Description: short rules and current player count.
- Fields: Players, Play Context, Intensity, Turn Order, Limits.

Buttons:
- Join
- Leave
- Meet / E-Meet toggle or segmented context control
- Start
- Rules
- End

Rules:
- Start is allowed only when at least 2 players joined.
- Join is blocked at 8 players.
- Play context can be changed only in the lobby.
- The bot should avoid intimate content involving non-players.

### 2. Turn Choice

Purpose: show whose turn it is and let that player choose.

Embed:
- Title: Truth or Dare
- Description: mention current player.
- Footer: round number and queue position.

Buttons:
- Truth
- Dare
- Random
- Skip Turn
- End

Rules:
- Only the current player can choose Truth/Dare/Random/Skip Turn.
- Other users get an ephemeral message: "It is not your turn yet."
- Optional later rule: no more than two Truths or two Dares in a row per player.

### 3. Prompt Revealed

Purpose: show the chosen truth or dare.

Truth buttons:
- Answered
- Softer
- Skip
- Next Turn
- End

Dare buttons:
- Done
- Softer
- Alternative Dare
- Skip
- Next Turn
- End

Rules:
- Only current player can mark Answered/Done/Skip/Alternative.
- Softer lowers intensity or asks for a gentler prompt.
- Alternative Dare keeps mode as Dare and draws another dare.
- Skip is allowed without shaming text.
- Next Turn advances to the next player.

### 4. Ended

Purpose: close the session cleanly.

Embed:
- Title: Truth or Dare Ended
- Description: short recap without private answers.
- Footer: rounds played.

Buttons:
- disabled controls only, or no controls.

## Prompt Rules

Truth prompts:
- Invite playful or reflective disclosure.
- Avoid interrogation, accusations, jealousy traps, and private secrets.
- Should be answerable in text or voice.

Dare prompts:
- Be doable in Discord or in a safe real-life context.
- Avoid dares involving non-players unless everyone consents.
- Avoid anything illegal, dangerous, humiliating, explicit, or coercive.
- Respect play context:
  - `meet`: may include safe in-person actions.
  - `e-meet`: must be doable remotely through Discord, voice, video, or small solo actions.

Intensity:
- 1: easy, cozy, silly.
- 2: romantic, reflective, lightly flirty.
- 3: bolder or deeper, still non-explicit and pressure-free.

## AI Behavior

AI should generate prompts for the current state only:

- If player chose Truth, generate Truth prompts only.
- If player chose Dare, generate Dare prompts only.
- Do not generate Couple Questions or This/That inside Truth or Dare.
- Include play context in AI generation so dares match `meet` or `e-meet`.
- Batch queue should be per selected prompt type and current settings.
- If the player changes from Truth to Dare or the lobby context changes, clear or ignore incompatible queued prompts.

## Data Model Needs

Add or derive:

- `mode`: `truth_or_dare` vs standalone prompt modes.
- `players`: ordered active player IDs.
- `hostUserId`.
- `currentTurnIndex`.
- `phase`: `lobby`, `turn_choice`, `prompt_revealed`.
- `currentPrompt`.
- `promptQueueType`: `truth` or `dare` while a selected prompt type is queued.
- `playContext`: `meet` or `e_meet`, default `e_meet`.
- `turnHistory`: recent choices per player for rule enforcement.
- `maxPlayers`: default 8.
- `rules`: skip policy, max same choice streak, dare involvement limits.

The MVP implementation now stores the core lobby, host, turn, phase, current prompt, prompt queue type, and play context fields. Turn history and custom rules are still future upgrades.

## Acceptance Criteria

- `/truth-or-dare create` or `/game start mode:Truth or Dare` creates a lobby, not an immediate prompt.
- Users can Join and Leave before Start.
- Host can choose `Meet` or `E-Meet` in the lobby.
- Play context defaults to `E-Meet`.
- Play context cannot be changed after Start for MVP.
- Start requires 2-8 players.
- Active play shows only Truth or Dare controls, not every game mode.
- Only the current player can choose or resolve their turn.
- Truth prompts show Answered/Softer/Skip/Next Turn/End controls.
- Dare prompts show Done/Softer/Alternative Dare/Skip/Next Turn/End controls.
- Next Turn advances by join order.
- End disables stale controls.
- AI/static prompt queues are scoped to Truth or Dare only.
- Dare prompts respect the selected play context.
- All denial/error messages are ephemeral.

## Recommended Implementation Order

1. Done: Add session phase, `hostUserId`, `currentTurnIndex`, `currentPrompt`, and `promptQueueType`.
2. Done: Add lobby actions: Join, Leave, Start, Rules, End.
3. Done: Add active turn actions: Truth, Dare, Random, Skip Turn.
4. Done: Add prompt resolution actions: Answered/Done, Softer, Alternative Dare, Skip, Next Turn.
5. Done: Update Discord card rendering to choose controls by phase.
6. Done: Scope AI/static prompt queue by current Truth/Dare choice.
7. Done: Add tests for lobby minimums, turn ownership, prompt reveal, and state transitions.
8. Done: Add `playContext` to session domain and storage.
9. Done: Add lobby controls for `Meet` and `E-Meet`.
10. Done: Add AI prompt context and static dare tags for remote-safe vs in-person-safe dares.
11. Done: Clear dare queue when play context changes.
12. Done: Add tests that `e-meet` never returns in-person-only dares and `meet` can return safe in-person dares.
