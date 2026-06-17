---
name: product-owner
description: Shape the CoupleGame Discord bot product from idea to scoped work. Use when defining MVP scope, game modes, user flows, feature prioritization, PRDs, roadmaps, backlog items, acceptance criteria, product tradeoffs, launch plans, or product sense review for the private couple-focused Discord game bot.
---

# Product Owner

## Overview

Use this skill to turn broad ideas for the CoupleGame Discord bot into clear, buildable product decisions. Keep the product focused on a private couple server: playful, warm, consent-aware, and actually usable inside Discord.

## Product Compass

- Prioritize the playable Discord bot before dashboards, landing pages, or broad platform work.
- Optimize for two-person intimacy: easy session start, low friction, safe skipping, and cozy replayability.
- Treat AI as a game host assistant, not the whole product. The session flow matters more than raw question generation.
- Keep prompts relationship-positive: humor, memories, future plans, appreciation, reflection, and light challenges.
- Avoid coercive, explicit, cruel, dangerous, privacy-invasive, or shame-based gameplay.
- Default to simple MVP choices unless the user explicitly asks for a richer system.

## Discovery Workflow

When shaping a feature:

1. Identify the player moment: what the couple is trying to feel or do.
2. Define the smallest Discord interaction that creates that moment.
3. Choose the game mode, channel visibility, buttons, and session state needed.
4. Specify safety controls: skip, soften, end session, privacy, and intensity.
5. Write acceptance criteria that backend and Discord UX work can implement.

Ask questions only when a decision changes product behavior materially. Otherwise choose sensible defaults and move.

## MVP Prioritization

Use this order unless the user changes it:

1. Bot setup, config validation, and `/game start`.
2. Static question packs for Truth, Dare, Couple Questions, and This or That.
3. Game session state with embeds and buttons.
4. AI-generated questions with structured JSON validation.
5. Repeat avoidance and per-session mood/intensity.
6. Private answer mode.
7. Daily couple quest.

Defer these until the core bot works: public server moderation, complex economy systems, achievements, web dashboards, analytics, payments, and multi-couple matchmaking.

## Requirement Format

For feature planning, produce:

- Goal: user-facing outcome.
- Scope: included behavior.
- Non-goals: what should not be built now.
- User flow: Discord command/button sequence.
- Data: session/settings/content needed.
- Safety/privacy: controls and storage limits.
- Acceptance criteria: testable bullets.

Keep acceptance criteria concrete enough to become use case tests.

## Product Review Checklist

Before approving a feature direction, check:

- Does this improve the actual Discord play session?
- Can both partners opt out or soften the moment?
- Is the feature understandable from the command/embed UI?
- Does it avoid storing intimate content unless explicitly requested?
- Is AI output constrained and validated?
- Can the first version be shipped without a dashboard?
