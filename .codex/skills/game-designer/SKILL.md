---
name: game-designer
description: Design and review CoupleGame game modes, rules, turn flow, Discord-native interaction states, mode-specific buttons, consent controls, prompt pacing, player selection, and translations of traditional party games such as Truth or Dare into bot-led Discord chat experiences. Use when adding or changing game modes, deciding which controls appear in each mode, converting offline rules to Discord UX, balancing fun/safety, or reviewing whether a game loop feels coherent.
---

# Game Designer

## Overview

Use this skill to turn traditional couple/party games into clear Discord-native loops. Preserve what makes the original game fun, then adapt rules, turn-taking, safety, and controls to chat, embeds, buttons, modals, and ephemeral replies.

## Design Principles

- Design one coherent mode at a time. Do not show every game-mode button inside every mode.
- Keep controls contextual: show actions that make sense for the current game state.
- Preserve consent: Skip, Softer, End, and clear limits must exist in any intimate or dare-based game.
- Prefer quick turns, low explanation, and visible state over long instructions.
- Use AI to help the host, not to erase the game structure.
- Treat Discord as asynchronous and text-first: design for delayed replies, button clicks, stale interactions, and private/ephemeral answers.
- Avoid explicit, coercive, dangerous, illegal, humiliating, or privacy-invasive mechanics.

## Translation Workflow

When adapting a traditional game:

1. Extract the offline loop: setup, player selection, turn choice, challenge, response, resolution, next turn.
2. Define the Discord state machine: setup message, active turn card, answer/dare resolution, next-turn card, ended state.
3. Decide visible controls for each state. Hide unrelated mode switches unless the state is a lobby or mode-selection screen.
4. Define safety boundaries before content generation: off-limits topics, dare limits, skip rules, and fallback behavior.
5. Define data needed: players, current turn, prompt queue, recent prompts, chosen mode, rules, limits, timestamps.
6. Produce acceptance criteria that backend and Discord UX can implement.

## Mode-Specific Controls

Controls should match the current mode:

- **Truth or Dare setup/lobby**: Join, Leave, Start, Rules, End.
- **Truth or Dare active turn**: Truth, Dare, Random, Skip, Softer, End.
- **Truth prompt revealed**: Answered, Skip, Softer, Next Turn, End.
- **Dare prompt revealed**: Done, Skip, Softer, Alternative Dare, Next Turn, End.
- **Couple Questions**: Next, Deeper, Softer, Save Favorite, End.
- **This or That**: Pick Left, Pick Right, Both, Neither, Next, End.
- **Date Night**: Continue, Softer, Skip, End.

Avoid showing unrelated mode buttons such as `Truth`, `Dare`, `Couple Q`, and `This/That` all together during a locked-in Truth or Dare turn. Use a separate mode switch or new session command for changing games.

## Truth Or Dare Discord Loop

Use this baseline when implementing Truth or Dare:

1. **Setup**: explain limits briefly, show Join/Start/Rules. Require at least 2 players unless explicitly designing a couple-only two-player default.
2. **Rules**: define skip allowance, intensity, off-limits content, turn order/random choice, and whether dares can involve people outside the game.
3. **Turn selection**: choose current player by alternating, queue order, or random. Make the current player visible.
4. **Choice**: current player chooses Truth or Dare. Optionally enforce "not more than two of the same choice in a row."
5. **Prompt**: reveal one prompt with mode-specific controls.
6. **Resolution**: player marks Answered/Done, asks for Softer/Alternative, or Skips.
7. **Next turn**: advance to the next player and repeat.
8. **End**: close the session and disable stale controls.

For a private couple server, default to two players and alternating turns. Add random/spin behavior later if requested.

## Prompt Design

Truth prompts should invite disclosure without interrogation. Dare prompts should be playful, doable in Discord or real life, and safe to decline.

Use intensity like this:

- `1`: cozy, easy, low vulnerability.
- `2`: romantic, reflective, lightly flirty.
- `3`: deeper or flirty-safe, still non-explicit and pressure-free.

For every generated prompt, ask:

- Can someone skip this without shame?
- Is this doable in the current Discord context?
- Does this fit the current mode?
- Would this still be okay if screenshotted later?
- Does this avoid involving non-players without consent?

## Output Format

When designing a game mode, provide:

- Mode goal.
- Player setup.
- State machine.
- Button/control map per state.
- Prompt rules.
- Safety rules.
- Data model changes.
- Acceptance criteria.

Keep recommendations implementable inside the existing DDD backend and Discord presentation layers.

## Review Checklist

Before approving a game-flow change, verify:

- The current mode has contextual controls only.
- The user can understand the next action from the embed/buttons.
- Turns and ownership are clear.
- Safety controls are always reachable.
- AI prompt generation follows the rules of the selected mode.
- Stale buttons and ended sessions have graceful behavior.
- The flow would still be fun with static prompts only.
