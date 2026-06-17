# MVP Game Designs

This document defines the complete MVP game set for CoupleGame. Each mode should feel like its own Discord-native loop with contextual controls, even when the backend shares prompt generation, queueing, and session storage.

## Shared Game Principles

- Every mode must support `Skip`, `Softer`, and `End`.
- Controls should match the current game mode; avoid showing unrelated mode buttons inside a locked-in mode.
- AI should generate only the prompt type needed by the current mode.
- Static fallback must remain playable if AI fails.
- Do not store private answers in MVP.
- Prompt history should avoid repeating IDs and recent prompt text.
- The bot should sound like a warm game host, not a therapist or rules manual.

## MVP Modes

| Mode | Purpose | Primary Loop | MVP Status |
|------|---------|--------------|------------|
| Truth or Dare | Turn-based party/couple challenge game | Lobby -> turn choice -> prompt -> resolution -> next turn | Implemented, see `truth-or-dare-design.md` |
| Couple Questions | Cozy shared conversation prompts | Lobby -> prompt -> optional private answers -> reveal together -> next prompt | Lobby and private answers implemented |
| This or That | Secret-vote preference comparison | Lobby -> choice prompt -> all players vote -> reveal -> next prompt | Advanced MVP implemented |
| After Dark | Warmer adult-intimate couple prompts | Consent lobby -> prompt -> optional private answers -> reveal together -> next prompt | Implemented as non-explicit intimate mode |

## Couple Questions

### Mode Goal

Couple Questions should feel like a gentle conversation deck for two people. It is not competitive and does not need turn ownership. The value is in giving the couple a good prompt, a useful follow-up, and simple ways to steer the depth.

### Player Setup

- Starts with a lobby.
- Minimum players: 1.
- Maximum players: 8.
- The session starter is the first player and host.
- The host can start immediately for solo reflection, or wait for one or more partners/friends to join.
- No current-player restriction after start; any joined player can press conversation controls.

### State Machine

1. **Lobby**
   - Show host and joined players.
   - Host can start with 1 or more players.
   - Rules explain that private answer reveal waits for joined players.

2. **Prompt Revealed**
   - Show one couple question.
   - Optional follow-up appears as a field.
   - Footer shows mood, intensity, source, and round.

3. **Private Answer**
   - `Answer` opens a private Discord modal.
   - Bot waits for every joined player to answer.
   - Public card shows answer progress only, not answer text.
   - Once all answers are in, the bot reveals the answers together.

4. **Depth Adjustment**
   - Softer lowers intensity or asks for a gentler question.
   - Deeper raises intensity within safe limits.
   - Skip draws a new question without judgment.

5. **Ended**
   - Mark session ended.
   - Disable controls where practical.

### Buttons

- `Join`
- `Leave`
- `Start`
- `Rules`
- `Next`
- `Answer`
- `Skip`
- `Softer`
- `Deeper`
- `End`

Optional later:
- `Save`
- `Private Answer`
- `Both Answered`

### Prompt Rules

Good Couple Questions:
- Invite appreciation, memories, future plans, repair, tenderness, playful discovery, and shared preferences.
- Are answerable without exposing secrets.
- Avoid jealousy traps, accusations, tests of loyalty, or therapy-heavy wording.

Intensity:
- `1`: easy, cozy, low vulnerability.
- `2`: romantic, reflective, emotionally warm.
- `3`: deeper or flirty-safe, still non-explicit and pressure-free.

### AI Behavior

AI input should include:
- `type: couple_question`
- mood
- intensity
- recent question text

AI should return:
- one clear question
- optional follow-up
- empty `safetyNotes` unless there is a useful note

### Data Model Needs

Existing `GameSession` fields are enough for MVP:
- `players`
- `phase`
- `mode`
- `mood`
- `intensity`
- `recentPromptIds`
- `recentPromptTexts`
- `promptQueue`
- `currentPrompt`
- `status`

Future:
- saved favorite prompt IDs

### Acceptance Criteria

- `/game start mode:Couple Question` shows a lobby.
- Host can start with only themselves in the lobby.
- Additional Discord users can join before Start.
- Buttons are only Couple Questions controls, not Truth/Dare/This-or-That controls.
- Lobby buttons are `Join`, `Leave`, `Start`, `Rules`, and `End`.
- `Next` keeps the same mode.
- `Softer` cannot go below intensity 1.
- `Deeper` cannot exceed intensity 3.
- `Skip` draws another question without changing mood.
- `Answer` opens a modal only for joined players and keeps submitted answers private until all joined players answer.
- Private answer text is held only in process memory until reveal or round change.
- AI/static prompt queue uses `couple_question` only.

## This Or That

### Mode Goal

This or That should be quick, playful, and low-friction. It should help a couple compare preferences fast, then create a small reveal moment when everyone sees whether they matched or split.

### Player Setup

- Starts with a lobby.
- Minimum players: 2.
- Maximum players: 8.
- Works best for two players, but small groups are supported.
- Only joined players can vote.
- Votes are stored only as active round state; no answer history is kept.

### State Machine

1. **Lobby**
   - Show host and joined players.
   - Host starts once at least 2 players joined.

2. **Choice Revealed**
   - Show one `A or B` style prompt.
   - Embed title: `This or That`.
   - Main prompt should make both options obvious.

3. **Secret Vote**
   - Players choose `Left` or `Right`.
   - Bot acknowledges each vote ephemerally.
   - Public card shows vote progress like `1/2 locked in`.
   - Choices remain hidden until every joined player has voted.

4. **Reveal**
   - Bot shows Left and Right player lists.
   - If all players picked the same side, show a match result.
   - If players split, show a playful split result.

5. **Next Choice**
   - `Next` draws a new prompt.
   - `Skip` draws a new prompt without recording judgment.

6. **Ended**
   - Mark session ended.

### Buttons

- `Join`
- `Leave`
- `Start`
- `Rules`
- `Left`
- `Right`
- `Next`
- `Skip`
- `Softer`
- `End`

Optional later:
- `Why?`
- `Private Picks`

### Prompt Rules

Good This or That prompts:
- Compare two concrete options.
- Stay short enough to scan instantly.
- Avoid false dilemmas around sensitive relationship issues.
- Should not shame either choice.

Examples:
- `Movie night with snacks or a slow walk together?`
- `Voice note or handwritten message?`
- `Cook together or order comfort food?`

### AI Behavior

AI input should include:
- `type: this_or_that`
- mood
- intensity
- recent prompt text

AI should return a single sentence where the two choices are obvious. Avoid long explanations and avoid follow-ups by default.

### Data Model Needs

Implemented in `GameSession`:
- `players`
- `phase`
- `choiceVotes`
- `currentPrompt`
- `promptQueue`

Future:
- reveal mode: public, private, anonymous

### Acceptance Criteria

- `/game start mode:This or That` shows a lobby.
- Host cannot start until at least 2 players have joined.
- Buttons show lobby controls, voting controls, or reveal controls depending on state.
- `Left` and `Right` give short ephemeral acknowledgements.
- Results reveal only after every joined player has voted.
- `Next` draws another This or That prompt after reveal.
- AI/static queue uses `this_or_that` only.

## After Dark

### Mode Goal

After Dark should feel like the warmer private deck a couple chooses when they want flirtier, more intimate conversation. It is adult in vibe, but still non-explicit, consent-first, and easy to soften or leave.

### Player Setup

- Starts with a consent lobby.
- Minimum players: 1.
- Maximum players: 8.
- The session starter is host.
- Host starts only when joined players are comfortable.
- Only joined players can use active controls and private answers.

### State Machine

1. **Lobby**
   - Show host and players.
   - Rules explain consent, non-explicit boundary, skip, and private answer reveal.

2. **Prompt Revealed**
   - Show one After Dark prompt.
   - Optional follow-up appears as a field.
   - Footer shows mood, intensity, source, and round.

3. **Private Answer**
   - `Answer` opens a private modal.
   - Reveal waits for every joined player.
   - Private answers are not persisted.

4. **Warmth Adjustment**
   - Softer lowers intensity.
   - Warmer raises intensity within the safe non-explicit cap.
   - Skip draws another prompt without judgment.

5. **Ended**
   - Mark session ended.

### Buttons

- `Join`
- `Leave`
- `Start`
- `Rules`
- `Answer`
- `Next`
- `Skip`
- `Softer`
- `Warmer`
- `End`

### Prompt Rules

Good After Dark prompts:
- Invite desire, closeness, atmosphere, attention, affection, and boundaries.
- Avoid graphic sexual acts, explicit body details, coercion, pressure, humiliation, or shame.
- Keep skip and soften behavior emotionally neutral.

### Acceptance Criteria

- `/game start mode:After Dark` shows a lobby.
- Host can start with only themselves in the lobby.
- `Start` reveals only `after_dark` prompts.
- Active buttons do not show Truth/Dare/This-or-That controls.
- `Answer` opens a modal only for joined players.
- Private answer reveal waits for all joined players.
- AI/static queue uses `after_dark` only.

## Shared Implementation Order

1. Done: Keep Truth or Dare as the rich turn-based session.
2. Done: Add mode-specific card builders for Couple Questions and This or That.
   - Done: Couple Questions.
   - Done: This or That.
3. Done: Remove standalone Truth and standalone Dare from the MVP mode list; Truth and Dare live only inside Truth or Dare.
4. Done: Add button actions for `deeper`, `pick_left`, and `pick_right`.
5. Done: Add ephemeral acknowledgements and reveal flow for This or That picks.
6. Ensure each mode passes the correct prompt type to the AI/static queue.
7. Add tests for each mode's button layout and prompt type locking.
8. Expand static prompt packs for every mood/intensity pair.

## MVP Done Criteria

- Every MVP mode has contextual buttons.
- Every MVP mode has at least 5 reviewed static prompts before relying on AI.
- AI generation receives mode, mood, intensity, recent prompt text, and play context where relevant.
- Static fallback remains safe and mode-correct.
- Skip, Softer, and End always work.
- No mode leaks unrelated controls into the current game card.
