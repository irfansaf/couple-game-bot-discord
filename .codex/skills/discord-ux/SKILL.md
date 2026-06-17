---
name: discord-ux
description: Design, implement, or review Discord interaction flows for the CoupleGame bot. Use when working on slash commands, buttons, embeds, modals, ephemeral replies, private answer mode, game session UX, error states, command naming, prompt cards, or Discord-specific user experience for the private couple game server.
---

# Discord UX

## Overview

Use this skill to make the CoupleGame bot feel like a smooth Discord game host. Favor fast, low-friction interactions with clear controls, cozy tone, and strong privacy defaults.

## UX Principles

- Prefer slash commands, buttons, select menus, and modals over text-command parsing.
- Keep the first screen playable. Do not explain too much before the couple can start.
- Use embeds for game cards and session state.
- Use ephemeral replies for settings, private answers, validation errors, and confirmations.
- Keep public channel messages short and game-like.
- Always provide escape hatches: Skip, Softer, End Game.
- Avoid long AI explanations unless the user asks for why a prompt was generated.

## Core Commands

Start with these commands unless the product direction changes:

- `/game start` starts an interactive session.
- `/truth` generates or draws a truth prompt.
- `/dare` generates or draws a dare prompt.
- `/couple-question` draws a relationship prompt.
- `/date-night` starts a guided multi-round session.
- `/settings` edits language, mood, intensity, and AI usage.

Keep command names obvious. Avoid clever labels that make the command list harder to scan.

## Game Card Pattern

A good game embed should include:

- Title: mode and mood, for example `Truth - Romantic`.
- Main prompt: one clear question or dare.
- Optional follow-up: one short line.
- Footer: session status, such as `Round 3`.
- Buttons: `Truth`, `Dare`, `Next`, `Skip`, `Softer`, `End`.

Do not overload the embed with instructions. Put rare settings in `/settings`.

## Button Behavior

- `Truth` switches the next prompt type to truth.
- `Dare` switches the next prompt type to dare.
- `Next` continues with current mode/mood/intensity.
- `Skip` records no judgment and immediately draws another prompt.
- `Softer` lowers intensity or asks AI for a gentler replacement.
- `Spicier` may raise intensity only within non-explicit, pressure-free project limits.
- `End` closes the session cleanly and disables stale controls where practical.

When an interaction is stale or invalid, reply ephemerally with a short recovery path.

## Private Answer Mode

For private answer flows:

1. Public embed announces the prompt and that answers are private.
2. Each partner gets an ephemeral/modal answer path.
3. The bot waits until both answers are submitted or the session times out.
4. The bot reveals both answers together only if that is the chosen mode.
5. Do not persist private answers unless explicitly required.

Make timeout and cancellation states gentle and non-judgmental.

## Tone Guidelines

The bot should sound warm, playful, and calm. Avoid corporate wording, therapy-speak overload, cringe pressure, or explicit sexual language. Short copy usually wins.

Good labels:

- `Pick one`
- `Make it softer`
- `Another one`
- `End session`
- `Waiting for both answers`

Avoid labels that imply judgment or pressure:

- `Chicken out`
- `You must answer`
- `Prove it`
- `No skipping`

## Review Checklist

Before finishing Discord UX work, verify:

- The user can start playing within one command.
- Every public state has a clear next action.
- Sensitive settings and answers use ephemeral UI.
- Buttons fit Discord label limits and are easy to scan.
- Error states explain how to recover.
- The flow supports skip, soften, and end.
- AI-generated content is presented as a prompt, not as a wall of text.
