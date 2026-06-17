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
| Couple Questions | Cozy shared conversation prompts | Prompt -> both respond in chat/voice -> next prompt | Needs mode-specific controls |
| This or That | Quick preference comparison | Choice prompt -> each player picks -> next prompt | Needs pick controls |
| Standalone Truth | Fast truth prompt without full TOD lobby | Prompt -> answered/skip/next | Current generic mode, needs tighter controls |
| Standalone Dare | Fast dare prompt without full TOD lobby | Prompt -> done/alternative/skip/next | Current generic mode, needs tighter controls |

## Couple Questions

### Mode Goal

Couple Questions should feel like a gentle conversation deck for two people. It is not competitive and does not need turn ownership. The value is in giving the couple a good prompt, a useful follow-up, and simple ways to steer the depth.

### Player Setup

- Default players: the session starter and whoever is present in the channel.
- No lobby required for MVP.
- Works for two people first, but does not break if more users are present.
- No current-player restriction; either partner can press controls.

### State Machine

1. **Prompt Revealed**
   - Show one couple question.
   - Optional follow-up appears as a field.
   - Footer shows mood, intensity, source, and round.

2. **Depth Adjustment**
   - Softer lowers intensity or asks for a gentler question.
   - Deeper raises intensity within safe limits.
   - Skip draws a new question without judgment.

3. **Ended**
   - Mark session ended.
   - Disable controls where practical.

### Buttons

- `Next`
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
- `mode`
- `mood`
- `intensity`
- `recentPromptIds`
- `recentPromptTexts`
- `promptQueue`
- `currentPrompt`
- `status`

Future:
- `privateAnswerMode`
- answer submission state
- saved favorite prompt IDs

### Acceptance Criteria

- `/game start mode:Couple Question` shows a couple question immediately.
- Buttons are only Couple Questions controls, not Truth/Dare/This-or-That controls.
- `Next` keeps the same mode.
- `Softer` cannot go below intensity 1.
- `Deeper` cannot exceed intensity 3.
- `Skip` draws another question without changing mood.
- AI/static prompt queue uses `couple_question` only.

## This Or That

### Mode Goal

This or That should be quick, playful, and low-friction. It should help a couple compare preferences fast without turning every prompt into a long conversation.

### Player Setup

- No lobby required for MVP.
- Works best for two players.
- Both people can press answer buttons.
- MVP can record only visible button interactions in the message state; no persistent answer history required.

### State Machine

1. **Choice Revealed**
   - Show one `A or B` style prompt.
   - Embed title: `This or That`.
   - Main prompt should make both options obvious.

2. **Pick / React**
   - Players choose `Left`, `Right`, `Both`, or `Neither`.
   - MVP may simply acknowledge with an ephemeral response.
   - Later, the message can show counts or who picked what.

3. **Next Choice**
   - `Next` draws a new prompt.
   - `Skip` draws a new prompt without recording judgment.

4. **Ended**
   - Mark session ended.

### Buttons

- `Left`
- `Right`
- `Both`
- `Neither`
- `Next`
- `End`

Optional later:
- `Why?`
- `Reveal Picks`
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

MVP can use existing prompt queue/session fields.

Future:
- `choiceVotes`
- per-user current choice
- reveal mode: public, private, anonymous

### Acceptance Criteria

- `/game start mode:This or That` shows a choice prompt immediately.
- Buttons show pick controls, not generic game mode switches.
- `Left`, `Right`, `Both`, and `Neither` give short ephemeral acknowledgements in MVP.
- `Next` draws another This or That prompt.
- AI/static queue uses `this_or_that` only.

## Standalone Truth

### Mode Goal

Standalone Truth is a fast prompt deck for honest but safe disclosure without the full Truth or Dare lobby/turn flow.

### Player Setup

- No lobby required.
- No turn ownership required in MVP.
- Either partner can draw the next truth.

### State Machine

1. **Truth Revealed**
   - Show one truth prompt.
   - Optional follow-up may appear.

2. **Resolution**
   - `Answered` can move to the next prompt or simply acknowledge later.
   - `Skip` draws another truth.
   - `Softer` lowers intensity.
   - `Deeper` raises intensity if safe.

3. **Ended**
   - Mark session ended.

### Buttons

- `Answered`
- `Next Truth`
- `Skip`
- `Softer`
- `Deeper`
- `End`

### Prompt Rules

Truth prompts should:
- Invite self-disclosure without interrogation.
- Avoid secrets, accusations, loyalty tests, and jealousy triggers.
- Be answerable in text or voice.
- Keep screenshots in mind.

### AI Behavior

AI/static queue uses `truth` only. Recent prompt text is required for uniqueness.

### Acceptance Criteria

- `/game start mode:Truth` shows a truth prompt immediately.
- Controls do not show Dare, Couple Q, or This/That buttons.
- `Next Truth` and `Skip` both draw truth prompts.
- `Softer` and `Deeper` stay within the 1-3 intensity range.

## Standalone Dare

### Mode Goal

Standalone Dare is a quick dare deck for playful actions without a full Truth or Dare session. It should be safe, skippable, and context-aware.

### Player Setup

- No lobby required.
- No turn ownership required in MVP.
- Uses `playContext` later if added to standalone prompt sessions; until then, default dares should be remote-safe.

### State Machine

1. **Dare Revealed**
   - Show one dare prompt.
   - Footer shows source and intensity.

2. **Resolution**
   - `Done` acknowledges completion.
   - `Alternative Dare` draws another dare at same intensity/context.
   - `Softer` lowers intensity.
   - `Skip` draws another dare without judgment.

3. **Ended**
   - Mark session ended.

### Buttons

- `Done`
- `Alternative Dare`
- `Skip`
- `Softer`
- `Spicier`
- `End`

### Prompt Rules

Dares should:
- Be playful and doable.
- Avoid explicit, dangerous, humiliating, illegal, coercive, or public-pressure prompts.
- Avoid involving non-players.
- Default to remote-safe unless a session explicitly chooses `meet`.

### AI Behavior

AI/static queue uses `dare` only. If standalone play context is not implemented yet, pass `e_meet` so AI avoids in-person-only dares.

### Acceptance Criteria

- `/game start mode:Dare` shows a dare prompt immediately.
- Controls do not show Truth, Couple Q, or This/That buttons.
- `Alternative Dare` draws another dare.
- `Softer` lowers intensity and clears incompatible queued prompts.
- Static fallback only uses safe remote-compatible dares by default.

## Shared Implementation Order

1. Keep Truth or Dare as the rich turn-based session.
2. Add mode-specific card builders for Couple Questions, This or That, standalone Truth, and standalone Dare.
3. Add new button actions for `deeper`, `left`, `right`, `both`, `neither`, `next_truth`, and `alternative_dare` reuse where possible.
4. Add ephemeral acknowledgements for This or That picks.
5. Ensure each mode passes the correct prompt type to the AI/static queue.
6. Add tests for each mode's button layout and prompt type locking.
7. Expand static prompt packs for every mood/intensity pair.

## MVP Done Criteria

- Every MVP mode has contextual buttons.
- Every MVP mode has at least 5 reviewed static prompts before relying on AI.
- AI generation receives mode, mood, intensity, recent prompt text, and play context where relevant.
- Static fallback remains safe and mode-correct.
- Skip, Softer, and End always work.
- No mode leaks unrelated controls into the current game card.
