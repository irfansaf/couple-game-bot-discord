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

Eight is the recommended max because Truth or Dare turns can become slow when each person waits too long. For bigger groups later, add a spectator mode instead of raising the active player cap.

## State Machine

### 1. Lobby

Purpose: gather players and set expectations.

Embed:
- Title: Truth or Dare Lobby
- Description: short rules and current player count.
- Fields: Players, Intensity, Turn Order, Limits.

Buttons:
- Join
- Leave
- Start
- Rules
- End

Rules:
- Start is allowed only when at least 2 players joined.
- Join is blocked at 8 players.
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

Intensity:
- 1: easy, cozy, silly.
- 2: romantic, reflective, lightly flirty.
- 3: bolder or deeper, still non-explicit and pressure-free.

## AI Behavior

AI should generate prompts for the current state only:

- If player chose Truth, generate Truth prompts only.
- If player chose Dare, generate Dare prompts only.
- Do not generate Couple Questions or This/That inside Truth or Dare.
- Batch queue should be per selected prompt type and current settings.
- If the player changes from Truth to Dare, clear or ignore incompatible queued prompts.

## Data Model Needs

Add or derive:

- `gameKind`: `truth_or_dare` vs other future game types.
- `players`: ordered active player IDs.
- `hostUserId`.
- `currentPlayerIndex`.
- `roundNumber`.
- `state`: `lobby`, `choosing`, `prompt_revealed`, `ended`.
- `currentPrompt`.
- `currentChoice`: `truth` or `dare`.
- `turnHistory`: recent choices per player for rule enforcement.
- `maxPlayers`: default 8.
- `rules`: skip policy, max same choice streak, dare involvement limits.

The current `GameSession` model already has some compatible fields, but it needs state and turn ownership before this mode can feel correct.

## Acceptance Criteria

- `/truth-or-dare create` or `/game start mode:Truth or Dare` creates a lobby, not an immediate prompt.
- Users can Join and Leave before Start.
- Start requires 2-8 players.
- Active play shows only Truth or Dare controls, not every game mode.
- Only the current player can choose or resolve their turn.
- Truth prompts show Answered/Softer/Skip/Next Turn/End controls.
- Dare prompts show Done/Softer/Alternative Dare/Skip/Next Turn/End controls.
- Next Turn advances by join order.
- End disables stale controls.
- AI/static prompt queues are scoped to Truth or Dare only.
- All denial/error messages are ephemeral.

## Recommended Implementation Order

1. Add `gameKind`, session `state`, `hostUserId`, `currentPlayerIndex`, `roundNumber`, and `currentPrompt`.
2. Add lobby actions: Join, Leave, Start, Rules, End.
3. Add active turn actions: Truth, Dare, Random, Skip Turn.
4. Add prompt resolution actions: Answered/Done, Softer, Alternative Dare, Skip, Next Turn.
5. Update Discord card rendering to choose controls by state.
6. Update AI/static prompt queue to be scoped by current Truth/Dare choice.
7. Add tests for lobby limits, turn ownership, mode-specific controls, and state transitions.
