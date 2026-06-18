# Date Night Mode Design

Date Night is a guided sequence mode for couples who want the bot to host a short, intentional moment rather than draw random prompts forever. It should feel like a tiny private date plan inside Discord: warm opening, playful connection, deeper reflection, appreciation, and a soft close.

## Mode Goal

Create a low-friction guided session that helps partners move through a satisfying emotional arc in 10-15 minutes. Unlike Couple Questions, Date Night has a fixed pacing structure. Unlike Truth or Dare, it is cooperative and host-led, not turn-based.

## Product Scope

Included in v1:

- A lobby with `Join`, `Leave`, `Start`, `Rules`, and `End`.
- Minimum 1 player, maximum 8 players.
- A five-step guided sequence.
- One prompt shown per step.
- Contextual controls: `Continue`, `Answer`, `Skip`, `Softer`, and `End`.
- Optional private answers using the existing in-memory private answer flow.
- AI/static prompt generation scoped to the current date-night step.
- No answer history persistence.

Non-goals for v1:

- Calendar scheduling.
- Long date plans or external activity planning.
- Scoring, achievements, streaks, or economy.
- Storing private answers or session recaps.
- A dashboard.

## Player Setup

- The session starter becomes host.
- Host can start with only themselves for solo reflection or testing.
- Joined players can answer, continue, soften, skip, or end once active.
- For a private couple server, the happy path is 2 players.
- No current-player ownership; Date Night is shared.

## Date Night Arc

The v1 sequence has five steps:

| Step | Name | Prompt Type | Purpose |
|------|------|-------------|---------|
| 1 | Warm-Up | `couple_question` | Easy opening, cozy presence, low vulnerability |
| 2 | Play | `this_or_that` or playful `couple_question` | Light choice, smile, small preference reveal |
| 3 | Closer | `couple_question` | Meaningful reflection or affectionate curiosity |
| 4 | Appreciation | `couple_question` | Name something loved, noticed, or valued |
| 5 | Closing | `couple_question` | Soft ending, future plan, or tiny promise |

The mode should not randomly switch to Truth or Dare in v1. Dares can be considered later as an optional "date-night challenge" step, but only after the base sequence feels good.

## State Machine

1. **Lobby**
   - Show host, joined players, mood, intensity, and the five-step arc.
   - Rules explain that prompts are guided, skippable, and pressure-free.
   - Host can start with 1 or more players.

2. **Step Prompt Revealed**
   - Show current step label, such as `Step 2 of 5 - Play`.
   - Show one prompt.
   - Optional follow-up appears as a field.
   - Footer shows mood, intensity, source, and step progress.

3. **Private Answer**
   - `Answer` opens the existing private modal.
   - Public card shows answer progress only.
   - Reveal happens when every joined player answers.
   - Answers are cleared on reveal, skip, continue, or end.

4. **Continue**
   - `Continue` advances to the next Date Night step.
   - On the final step, `Continue` goes to the wrap-up state.

5. **Wrap-Up**
   - Show a short closing card.
   - Offer `Restart`, `New Game`, or just `End` later; v1 can keep only `End`.
   - Do not store recap text.

6. **Ended**
   - Mark the session ended.
   - Stale buttons should reply with a short expired-session message.

## Button Map

### Lobby

- `Join`
- `Leave`
- `Start`
- `Rules`
- `End`

### Active Step

- `Answer`
- `Continue`
- `Skip`
- `Softer`
- `End`

Optional later:

- `Warmer`
- `Save Favorite`
- `Restart`

## Prompt Rules

Date Night prompts should:

- Feel connected to the step purpose.
- Be short enough to scan in a Discord embed.
- Avoid therapy-heavy wording.
- Avoid pressure, tests, accusations, jealousy traps, public embarrassment, coercion, or involving non-players.
- Preserve the idea that skipping is normal.
- Keep warmer prompts non-explicit unless the product intentionally adds a separate adult-only Date Night variant later.

Step-specific guidance:

- **Warm-Up:** easy, cozy, present-tense, answerable in one sentence.
- **Play:** light, funny, preference-based, no heavy vulnerability.
- **Closer:** reflective but not interrogating.
- **Appreciation:** direct affection, gratitude, noticed effort, favorite memory.
- **Closing:** future plan, small promise, one thing to carry into tomorrow.

## AI Behavior

AI input should include:

- `mode: date_night`
- `step: warm_up | play | closer | appreciation | closing`
- prompt type to generate
- mood
- intensity
- recent prompt text
- player count

AI output can reuse the existing generated prompt schema in v1:

```json
{
  "questions": [
    {
      "type": "couple_question",
      "mood": "romantic",
      "intensity": 2,
      "question": "What is one tiny moment from us lately that you want to remember?",
      "followUp": "What made it feel special?",
      "safetyNotes": []
    }
  ]
}
```

Implementation note: if adding `date_night` as a new prompt type creates too much schema churn, v1 can keep prompt types as `couple_question` or `this_or_that` and store `dateNightStep` on the session. The game mode controls the arc; the prompt type controls content generation.

## Static Prompt Pack Needs

Before relying on AI, add at least 3-5 reviewed prompts per step:

- `date_night.warm_up`
- `date_night.play`
- `date_night.closer`
- `date_night.appreciation`
- `date_night.closing`

Fallback must be fully playable if AI is disabled.

## Data Model

Required v1 data:

- `mode = date_night`
- joined players
- host user id
- mood
- intensity
- current prompt
- prompt queue
- recent prompt ids/text
- status
- phase
- current step index

Potential implementation options:

- Reuse `currentTurnIndex` as the Date Night step index.
- Add a more explicit `dateNightStepIndex` later if reuse becomes confusing.
- Keep private answers in the existing in-memory coordinator only.

## Safety And Privacy

- Always show `Skip`, `Softer`, and `End`.
- Do not persist private answer text.
- Do not log raw private answers.
- Store only gameplay state and generated prompt research captures if `AI_CAPTURE_OUTPUTS=true`.
- If a generated prompt fails validation, fall back to static content for the same step.

## Acceptance Criteria

- `/game start mode:Date Night` opens a Date Night lobby.
- Lobby shows the five-step arc.
- Host can start with 1 or more players.
- Active card shows `Step X of 5` and the step name.
- Active controls are Date Night controls only.
- `Continue` advances to the next step.
- `Skip` replaces the current step prompt without advancing the step.
- `Softer` lowers intensity or redraws a gentler prompt without going below 1.
- `Answer` opens a private modal for joined players only.
- Private answers reveal only after all joined players submit.
- Private answer text is cleared on reveal, skip, continue, or end.
- The final `Continue` shows a closing card or ends gracefully.
- AI/static prompt generation is scoped to the current Date Night step.
- Static fallback works when AI is disabled or invalid.

## Implementation Slices

1. Add Date Night design constants and static prompt packs.
2. Add `date_night` game mode and command option.
3. Reuse lobby/private answer patterns from Couple Questions.
4. Add step-aware prompt selection and queue refilling.
5. Add Discord card rendering for lobby, active step, and closing.
6. Add use-case tests for step progression, skip, softer, and final close.
7. Add button-id and card-layout tests for contextual controls.

