import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

import {
  currentTruthOrDarePlayer,
  truthOrDareMaxPlayers,
  truthOrDareMode,
  type GameSession,
} from "../../domain/entities/game-session";
import type { Mood, Prompt, PromptType } from "../../domain/entities/prompt";
import { intensityValue } from "../../domain/value-objects/intensity";
import { createGameButtonId } from "./button-ids";
import type { GameAction } from "../../application/use-cases/handle-game-action";

export interface GameCard {
  readonly embeds: readonly EmbedBuilder[];
  readonly components: readonly ActionRowBuilder<ButtonBuilder>[];
}

export interface SessionCardOptions {
  readonly view?: "rules";
}

export function buildPromptCard(session: GameSession, prompt: Prompt): GameCard {
  if (session.mode === truthOrDareMode) {
    return buildTruthOrDarePromptCard(session, prompt);
  }

  const embed = new EmbedBuilder()
    .setTitle(`${formatPromptType(prompt.type)} - ${formatMood(prompt.mood)}`)
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
    components: buildPromptGameButtons(session.id, false),
  };
}

export function buildSessionStateCard(
  session: GameSession,
  options: SessionCardOptions = {},
): GameCard {
  if (session.mode === truthOrDareMode) {
    return buildTruthOrDareStateCard(session, options);
  }

  const embed = new EmbedBuilder()
    .setTitle(`${formatSessionMode(session.mode)} session`)
    .setDescription("Getting the next round ready.")
    .setColor(0xf4a7bb)
    .setFooter({
      text: `Round ${session.recentPromptIds.length} - Intensity ${intensityValue(
        session.intensity,
      )}`,
    });

  return {
    embeds: [embed],
    components: buildPromptGameButtons(session.id, false),
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
    components: buildLoadingButtons(session.id),
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
    components: buildLoadingButtons(sessionId),
  };
}

function buildTruthOrDareStateCard(
  session: GameSession,
  options: SessionCardOptions,
): GameCard {
  const embed = new EmbedBuilder().setColor(0xf4a7bb).setFooter({
    text: `Players ${session.players.length}/${truthOrDareMaxPlayers} - Intensity ${intensityValue(
      session.intensity,
    )}`,
  });

  if (session.phase === "lobby") {
    embed
      .setTitle("Truth or Dare lobby")
      .setDescription(
        [
          `Host: ${mention(session.hostUserId)}`,
          `Players: ${formatPlayers(session.players)}`,
        ].join("\n"),
      );

    if (options.view === "rules") {
      embed.addFields(
        {
          name: "Rules",
          value:
            "Join the lobby, then the host starts when at least 2 players are in. Turns follow join order.",
        },
        {
          name: "Comfort",
          value:
            "Skip, Softer, and End are always available. Dares should stay safe, legal, and only involve players who joined.",
        },
      );
    }

    return {
      embeds: [embed],
      components: buildTruthOrDareLobbyButtons(session.id, false),
    };
  }

  const currentPlayer = currentTruthOrDarePlayer(session);

  embed
    .setTitle("Truth or Dare")
    .setDescription(
      currentPlayer === null
        ? "Waiting for the next player."
        : `${mention(currentPlayer)}, choose your path.`,
    );

  if (options.view === "rules") {
    embed.addFields({
      name: "Rules",
      value:
        "The current player chooses Truth, Dare, or Random. After answering or completing it, tap Next Turn.",
    });
  }

  return {
    embeds: [embed],
    components: buildTruthOrDareChoiceButtons(session.id, false),
  };
}

function buildTruthOrDarePromptCard(
  session: GameSession,
  prompt: Prompt,
): GameCard {
  const currentPlayer = currentTruthOrDarePlayer(session);
  const embed = new EmbedBuilder()
    .setTitle(
      `${formatPromptType(prompt.type)}${currentPlayer === null ? "" : ` for ${mention(currentPlayer)}`}`,
    )
    .setDescription(prompt.text)
    .setColor(prompt.type === "dare" ? 0xffb357 : 0xf4a7bb)
    .setFooter({
      text: `Turn ${session.currentTurnIndex + 1} - Round ${
        session.recentPromptIds.length
      } - Intensity ${intensityValue(session.intensity)}`,
    });

  if (prompt.followUp !== undefined) {
    embed.addFields({
      name: "Follow-up",
      value: prompt.followUp,
    });
  }

  return {
    embeds: [embed],
    components: prompt.type === "dare"
      ? buildDarePromptButtons(session.id, false)
      : buildTruthPromptButtons(session.id, false),
  };
}

function buildPromptGameButtons(
  sessionId: string,
  disabled: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("truth", sessionId, "Truth", ButtonStyle.Primary, disabled),
      gameButton("dare", sessionId, "Dare", ButtonStyle.Primary, disabled),
      gameButton(
        "couple_question",
        sessionId,
        "Couple Q",
        ButtonStyle.Primary,
        disabled,
      ),
      gameButton(
        "this_or_that",
        sessionId,
        "This/That",
        ButtonStyle.Primary,
        disabled,
      ),
      gameButton("next", sessionId, "Next", ButtonStyle.Secondary, disabled),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("skip", sessionId, "Skip", ButtonStyle.Secondary, disabled),
      gameButton("softer", sessionId, "Softer", ButtonStyle.Secondary, disabled),
      gameButton("spicier", sessionId, "Spicier", ButtonStyle.Secondary, disabled),
      gameButton("end", sessionId, "End Game", ButtonStyle.Danger, disabled),
    ),
  ];
}

function buildTruthOrDareLobbyButtons(
  sessionId: string,
  disabled: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("join", sessionId, "Join", ButtonStyle.Success, disabled),
      gameButton("leave", sessionId, "Leave", ButtonStyle.Secondary, disabled),
      gameButton("start_tod", sessionId, "Start", ButtonStyle.Primary, disabled),
      gameButton("rules", sessionId, "Rules", ButtonStyle.Secondary, disabled),
      gameButton("end", sessionId, "End", ButtonStyle.Danger, disabled),
    ),
  ];
}

function buildTruthOrDareChoiceButtons(
  sessionId: string,
  disabled: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("truth", sessionId, "Truth", ButtonStyle.Primary, disabled),
      gameButton("dare", sessionId, "Dare", ButtonStyle.Primary, disabled),
      gameButton("random", sessionId, "Random", ButtonStyle.Secondary, disabled),
      gameButton("skip", sessionId, "Skip Turn", ButtonStyle.Secondary, disabled),
      gameButton("softer", sessionId, "Softer", ButtonStyle.Secondary, disabled),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("end", sessionId, "End", ButtonStyle.Danger, disabled),
    ),
  ];
}

function buildTruthPromptButtons(
  sessionId: string,
  disabled: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("answered", sessionId, "Answered", ButtonStyle.Success, disabled),
      gameButton("softer", sessionId, "Softer", ButtonStyle.Secondary, disabled),
      gameButton("skip", sessionId, "Skip", ButtonStyle.Secondary, disabled),
      gameButton("next_turn", sessionId, "Next Turn", ButtonStyle.Primary, disabled),
      gameButton("end", sessionId, "End", ButtonStyle.Danger, disabled),
    ),
  ];
}

function buildDarePromptButtons(
  sessionId: string,
  disabled: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("done", sessionId, "Done", ButtonStyle.Success, disabled),
      gameButton("softer", sessionId, "Softer", ButtonStyle.Secondary, disabled),
      gameButton(
        "alternative_dare",
        sessionId,
        "Alt Dare",
        ButtonStyle.Secondary,
        disabled,
      ),
      gameButton("skip", sessionId, "Skip", ButtonStyle.Secondary, disabled),
      gameButton("next_turn", sessionId, "Next Turn", ButtonStyle.Primary, disabled),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("end", sessionId, "End", ButtonStyle.Danger, disabled),
    ),
  ];
}

function buildLoadingButtons(
  sessionId: string,
): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("truth", sessionId, "Truth", ButtonStyle.Primary, true),
      gameButton("dare", sessionId, "Dare", ButtonStyle.Primary, true),
      gameButton("next", sessionId, "Next", ButtonStyle.Secondary, true),
      gameButton("skip", sessionId, "Skip", ButtonStyle.Secondary, true),
      gameButton("end", sessionId, "End", ButtonStyle.Danger, true),
    ),
  ];
}

function gameButton(
  action: GameAction,
  sessionId: string,
  label: string,
  style: ButtonStyle,
  disabled: boolean,
): ButtonBuilder {
  return new ButtonBuilder()
    .setCustomId(createGameButtonId(action, sessionId))
    .setLabel(label)
    .setStyle(style)
    .setDisabled(disabled);
}

function formatPromptType(type: PromptType): string {
  const labels = {
    truth: "Truth",
    dare: "Dare",
    couple_question: "Couple Question",
    this_or_that: "This or That",
  } satisfies Record<PromptType, string>;

  return labels[type];
}

function formatSessionMode(mode: GameSession["mode"]): string {
  if (mode === truthOrDareMode) {
    return "Truth or Dare";
  }

  return formatPromptType(mode);
}

function formatMood(mood: Mood): string {
  const labels = {
    cozy: "Cozy",
    funny: "Funny",
    romantic: "Romantic",
    deep: "Deep",
    flirty_safe: "Flirty Safe",
  } satisfies Record<Mood, string>;

  return labels[mood];
}

function formatPlayers(players: readonly string[]): string {
  return players.length === 0
    ? "No players yet"
    : players.map((playerId, index) => `${index + 1}. ${mention(playerId)}`).join("\n");
}

function mention(userId: string): string {
  return `<@${userId}>`;
}
