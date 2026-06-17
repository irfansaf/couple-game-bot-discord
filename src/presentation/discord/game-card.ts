import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

import type { GameSession } from "../../domain/entities/game-session";
import type { Prompt } from "../../domain/entities/prompt";
import { intensityValue } from "../../domain/value-objects/intensity";
import { createGameButtonId } from "./button-ids";

export interface GameCard {
  readonly embeds: readonly EmbedBuilder[];
  readonly components: readonly ActionRowBuilder<ButtonBuilder>[];
}

export function buildPromptCard(session: GameSession, prompt: Prompt): GameCard {
  const embed = new EmbedBuilder()
    .setTitle(`${formatMode(prompt.type)} - ${formatMood(prompt.mood)}`)
    .setDescription(prompt.text)
    .setColor(0xf4a7bb)
    .setFooter({
      text: `Round ${session.recentPromptIds.length} - Intensity ${intensityValue(
        session.intensity,
      )}`,
    });

  if (prompt.followUp !== undefined) {
    embed.addFields({
      name: "Follow-up",
      value: prompt.followUp,
    });
  }

  return {
    embeds: [embed],
    components: buildGameButtons(session.id, false),
  };
}

export function buildEndedCard(session: GameSession): GameCard {
  const embed = new EmbedBuilder()
    .setTitle("Game ended")
    .setDescription("Session wrapped. Come back when you both want another round.")
    .setColor(0x8a94a6)
    .setFooter({
      text: `Rounds played ${session.recentPromptIds.length}`,
    });

  return {
    embeds: [embed],
    components: buildGameButtons(session.id, true),
  };
}

export function buildLoadingCard(
  sessionId: string,
  actionLabel = "Getting the next prompt ready...",
): GameCard {
  const embed = new EmbedBuilder()
    .setTitle("One sec")
    .setDescription(actionLabel)
    .setColor(0xf4a7bb);

  return {
    embeds: [embed],
    components: buildGameButtons(sessionId, true),
  };
}

function buildGameButtons(
  sessionId: string,
  disabled: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(createGameButtonId("truth", sessionId))
        .setLabel("Truth")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(createGameButtonId("dare", sessionId))
        .setLabel("Dare")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(createGameButtonId("couple_question", sessionId))
        .setLabel("Couple Q")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(createGameButtonId("this_or_that", sessionId))
        .setLabel("This/That")
        .setStyle(ButtonStyle.Primary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(createGameButtonId("next", sessionId))
        .setLabel("Next")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      new ButtonBuilder()
        .setCustomId(createGameButtonId("skip", sessionId))
        .setLabel("Skip")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(createGameButtonId("softer", sessionId))
        .setLabel("Softer")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(createGameButtonId("spicier", sessionId))
        .setLabel("Spicier")
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(disabled),
      new ButtonBuilder()
        .setCustomId(createGameButtonId("end", sessionId))
        .setLabel("End Game")
        .setStyle(ButtonStyle.Danger)
        .setDisabled(disabled),
    ),
  ];
}

function formatMode(mode: Prompt["type"]): string {
  const labels = {
    truth: "Truth",
    dare: "Dare",
    couple_question: "Couple Question",
    this_or_that: "This or That",
  } satisfies Record<Prompt["type"], string>;

  return labels[mode];
}

function formatMood(mood: Prompt["mood"]): string {
  const labels = {
    cozy: "Cozy",
    funny: "Funny",
    romantic: "Romantic",
    deep: "Deep",
    flirty_safe: "Flirty Safe",
  } satisfies Record<Prompt["mood"], string>;

  return labels[mood];
}
