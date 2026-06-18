import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
} from "discord.js";

import {
  afterDarkMaxPlayers,
  afterDarkMode,
  coupleQuestionMaxPlayers,
  coupleQuestionMode,
  currentTruthOrDarePlayer,
  dateNightMaxPlayers,
  dateNightMode,
  dateNightStepForSession,
  dateNightSteps,
  type PlayContext,
  thisOrThatMaxPlayers,
  thisOrThatMode,
  truthOrDareMaxPlayers,
  truthOrDareMode,
  type GameSession,
} from "../../domain/entities/game-session";
import type { Mood, Prompt, PromptType } from "../../domain/entities/prompt";
import { intensityValue } from "../../domain/value-objects/intensity";
import { createGameButtonId } from "./button-ids";
import type { PrivateAnswerSubmission } from "../../application/services/private-answer-coordinator";
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

  if (session.mode === coupleQuestionMode) {
    return buildCoupleQuestionPromptCard(session, prompt);
  }

  if (session.mode === afterDarkMode) {
    return buildAfterDarkPromptCard(session, prompt);
  }

  if (session.mode === dateNightMode) {
    return buildDateNightPromptCard(session, prompt);
  }

  if (session.mode === thisOrThatMode) {
    return buildThisOrThatPromptCard(session, prompt);
  }

  const embed = new EmbedBuilder()
    .setTitle(`${formatPromptType(prompt.type)} - ${formatMood(prompt.mood)}`)
    .setDescription(prompt.text)
    .setColor(0xf4a7bb)
    .setFooter({
      text: `Round ${session.recentPromptIds.length} - Intensity ${intensityValue(
        session.intensity,
      )} - ${formatPromptSource(prompt.source)}`,
    });

  if (prompt.followUp !== undefined) {
    embed.addFields({
      name: "Follow-up",
      value: prompt.followUp,
    });
  }

  return {
    embeds: [embed],
    components: buildQuickPromptButtons(session.id, false),
  };
}

export function buildPrivateAnswerWaitingCard(
  session: GameSession,
  prompt: Prompt,
  submittedCount: number,
  targetCount: number,
): GameCard {
  const embed = buildPrivateAnswerEmbed(session, prompt).addFields({
    name: "Private answers",
    value: `${submittedCount}/${targetCount} submitted.`,
  });

  return {
    embeds: [embed],
    components: privateAnswerButtonsForSession(session, false),
  };
}

export function buildPrivateAnswerRevealCard(
  session: GameSession,
  prompt: Prompt,
  answers: readonly PrivateAnswerSubmission[],
): GameCard {
  const embed = buildPrivateAnswerEmbed(session, prompt);

  for (const answer of answers) {
    embed.addFields({
      name: `${mention(answer.userId)} answered`,
      value: answer.answer,
    });
  }

  return {
    embeds: [embed],
    components: privateAnswerRevealButtonsForSession(session, false),
  };
}

function buildPrivateAnswerEmbed(
  session: GameSession,
  prompt: Prompt,
): EmbedBuilder {
  if (session.mode === afterDarkMode) {
    return buildAfterDarkEmbed(session, prompt);
  }

  if (session.mode === dateNightMode) {
    return buildDateNightEmbed(session, prompt);
  }

  return buildCoupleQuestionEmbed(session, prompt);
}

function buildCoupleQuestionPromptCard(
  session: GameSession,
  prompt: Prompt,
): GameCard {
  return {
    embeds: [buildCoupleQuestionEmbed(session, prompt)],
    components: buildCoupleQuestionButtons(session.id, false),
  };
}

function buildCoupleQuestionEmbed(
  session: GameSession,
  prompt: Prompt,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`${formatPromptType(prompt.type)} - ${formatMood(prompt.mood)}`)
    .setDescription(prompt.text)
    .setColor(0xf4a7bb)
    .setFooter({
      text: `Round ${session.recentPromptIds.length} - Intensity ${intensityValue(
        session.intensity,
      )} - ${formatPromptSource(prompt.source)}`,
    });

  if (prompt.followUp !== undefined) {
    embed.addFields({
      name: "Follow-up",
      value: prompt.followUp,
    });
  }

  return embed;
}

function buildAfterDarkPromptCard(
  session: GameSession,
  prompt: Prompt,
): GameCard {
  return {
    embeds: [buildAfterDarkEmbed(session, prompt)],
    components: buildAfterDarkButtons(session.id, false),
  };
}

function buildAfterDarkEmbed(
  session: GameSession,
  prompt: Prompt,
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`After Dark - ${formatMood(prompt.mood)}`)
    .setDescription(prompt.text)
    .setColor(0xc77dff)
    .setFooter({
      text: `Round ${session.recentPromptIds.length} - Intensity ${intensityValue(
        session.intensity,
      )} - ${formatPromptSource(prompt.source)}`,
    });

  if (prompt.followUp !== undefined) {
    embed.addFields({
      name: "Follow-up",
      value: prompt.followUp,
    });
  }

  return embed;
}

function buildDateNightPromptCard(
  session: GameSession,
  prompt: Prompt,
): GameCard {
  return {
    embeds: [buildDateNightEmbed(session, prompt)],
    components: buildDateNightButtons(session.id, false),
  };
}

function buildDateNightEmbed(
  session: GameSession,
  prompt: Prompt,
): EmbedBuilder {
  const step = dateNightStepForSession(session) ?? "warm_up";
  const embed = new EmbedBuilder()
    .setTitle(
      `Date Night - Step ${session.currentTurnIndex + 1} of ${
        dateNightSteps.length
      }: ${formatDateNightStep(step)}`,
    )
    .setDescription(prompt.text)
    .setColor(0xf0b85a)
    .setFooter({
      text: `Intensity ${intensityValue(session.intensity)} - ${formatMood(
        prompt.mood,
      )} - ${formatPromptSource(prompt.source)}`,
    });

  if (prompt.followUp !== undefined) {
    embed.addFields({
      name: "Follow-up",
      value: prompt.followUp,
    });
  }

  return embed;
}

function buildThisOrThatPromptCard(
  session: GameSession,
  prompt: Prompt,
): GameCard {
  const embed = new EmbedBuilder()
    .setTitle(`${formatPromptType(prompt.type)} - ${formatMood(prompt.mood)}`)
    .setDescription(prompt.text)
    .setColor(0x86c5da)
    .setFooter({
      text: `Round ${session.recentPromptIds.length} - Votes ${
        session.choiceVotes.length
      }/${session.players.length} - Intensity ${intensityValue(
        session.intensity,
      )} - ${formatPromptSource(prompt.source)}`,
    });

  if (session.phase === "revealed") {
    const leftPlayers = choicePlayers(session, "left");
    const rightPlayers = choicePlayers(session, "right");
    const allMatched = leftPlayers.length === session.players.length ||
      rightPlayers.length === session.players.length;

    embed.addFields(
      {
        name: "Left",
        value: formatPlayers(leftPlayers),
        inline: true,
      },
      {
        name: "Right",
        value: formatPlayers(rightPlayers),
        inline: true,
      },
      {
        name: "Result",
        value: allMatched ? "Perfect match." : "Split tastes. Cute problem.",
      },
    );
  } else {
    embed.addFields({
      name: "Waiting",
      value: `${session.choiceVotes.length}/${session.players.length} locked in.`,
    });
  }

  return {
    embeds: [embed],
    components: session.phase === "revealed"
      ? buildThisOrThatRevealButtons(session.id, false)
      : buildThisOrThatVotingButtons(session.id, false),
  };
}

function buildThisOrThatStateCard(
  session: GameSession,
  options: SessionCardOptions,
): GameCard {
  const embed = new EmbedBuilder().setColor(0x86c5da).setFooter({
    text: `Players ${session.players.length}/${thisOrThatMaxPlayers} - Intensity ${intensityValue(
      session.intensity,
    )}`,
  });

  if (session.phase === "lobby") {
    embed
      .setTitle("This or That lobby")
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
            "Join the lobby, then the host starts when at least 2 players are in. Everyone secretly picks Left or Right each round.",
        },
        {
          name: "Reveal",
          value:
            "Choices reveal only after every joined player has voted.",
        },
      );
    }

    return {
      embeds: [embed],
      components: buildThisOrThatLobbyButtons(session.id, false),
    };
  }

  if (session.currentPrompt !== undefined) {
    return buildThisOrThatPromptCard(session, session.currentPrompt);
  }

  embed
    .setTitle("This or That")
    .setDescription("Getting the next choice ready.");

  return {
    embeds: [embed],
    components: buildThisOrThatRevealButtons(session.id, false),
  };
}

function buildCoupleQuestionStateCard(
  session: GameSession,
  options: SessionCardOptions,
): GameCard {
  const embed = new EmbedBuilder().setColor(0xf4a7bb).setFooter({
    text: `Players ${session.players.length}/${coupleQuestionMaxPlayers} - Intensity ${intensityValue(
      session.intensity,
    )}`,
  });

  if (session.phase === "lobby") {
    embed
      .setTitle("Couple Questions lobby")
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
            "Join the lobby, then the host can start with 1 or more players. Anyone who joined can steer the deck.",
        },
        {
          name: "Private answers",
          value:
            "Answer opens a private modal. The reveal waits for every joined player in this session.",
        },
      );
    }

    return {
      embeds: [embed],
      components: buildCoupleQuestionLobbyButtons(session.id, false),
    };
  }

  if (session.currentPrompt !== undefined) {
    return buildCoupleQuestionPromptCard(session, session.currentPrompt);
  }

  embed
    .setTitle("Couple Questions")
    .setDescription("Getting the first question ready.");

  return {
    embeds: [embed],
    components: buildCoupleQuestionButtons(session.id, false),
  };
}

function buildAfterDarkStateCard(
  session: GameSession,
  options: SessionCardOptions,
): GameCard {
  const embed = new EmbedBuilder().setColor(0xc77dff).setFooter({
    text: `Players ${session.players.length}/${afterDarkMaxPlayers} - Intensity ${intensityValue(
      session.intensity,
    )}`,
  });

  if (session.phase === "lobby") {
    embed
      .setTitle("After Dark lobby")
      .setDescription(
        [
          `Host: ${mention(session.hostUserId)}`,
          `Players: ${formatPlayers(session.players)}`,
        ].join("\n"),
      );

    if (options.view === "rules") {
      embed.addFields(
        {
          name: "Consent",
          value:
            "This mode is warmer and more intimate, but still pressure-free. Start only when every joined player is comfortable.",
        },
        {
          name: "Boundaries",
          value:
            "Prompts stay non-explicit, skip is always okay, and private answers reveal only after every joined player submits.",
        },
      );
    }

    return {
      embeds: [embed],
      components: buildAfterDarkLobbyButtons(session.id, false),
    };
  }

  if (session.currentPrompt !== undefined) {
    return buildAfterDarkPromptCard(session, session.currentPrompt);
  }

  embed
    .setTitle("After Dark")
    .setDescription("Getting the first intimate prompt ready.");

  return {
    embeds: [embed],
    components: buildAfterDarkButtons(session.id, false),
  };
}

function buildDateNightStateCard(
  session: GameSession,
  options: SessionCardOptions,
): GameCard {
  const embed = new EmbedBuilder().setColor(0xf0b85a).setFooter({
    text: `Players ${session.players.length}/${dateNightMaxPlayers} - Intensity ${intensityValue(
      session.intensity,
    )}`,
  });

  if (session.phase === "lobby") {
    embed
      .setTitle("Date Night lobby")
      .setDescription(
        [
          `Host: ${mention(session.hostUserId)}`,
          `Players: ${formatPlayers(session.players)}`,
        ].join("\n"),
      )
      .addFields({
        name: "Tonight's arc",
        value: dateNightSteps
          .map((step, index) => `${index + 1}. ${formatDateNightStep(step)}`)
          .join("\n"),
      });

    if (options.view === "rules") {
      embed.addFields(
        {
          name: "Rules",
          value:
            "Join the lobby, then the host starts when everyone is ready. Date Night moves through five guided steps.",
        },
        {
          name: "Comfort",
          value:
            "Answer privately if you want, Continue when ready, or use Skip, Softer, and End anytime.",
        },
      );
    }

    return {
      embeds: [embed],
      components: buildDateNightLobbyButtons(session.id, false),
    };
  }

  if (session.phase === "completed") {
    embed
      .setTitle("Date Night complete")
      .setDescription(
        "That was the full arc. Take one soft thing from this with you.",
      )
      .setFooter({
        text: `Steps completed ${dateNightSteps.length}/${dateNightSteps.length}`,
      });

    return {
      embeds: [embed],
      components: buildDateNightCompletedButtons(session.id, false),
    };
  }

  if (session.currentPrompt !== undefined) {
    return buildDateNightPromptCard(session, session.currentPrompt);
  }

  embed
    .setTitle("Date Night")
    .setDescription("Getting the first Date Night prompt ready.");

  return {
    embeds: [embed],
    components: buildDateNightButtons(session.id, false),
  };
}

export function buildSessionStateCard(
  session: GameSession,
  options: SessionCardOptions = {},
): GameCard {
  if (session.mode === truthOrDareMode) {
    return buildTruthOrDareStateCard(session, options);
  }

  if (session.mode === coupleQuestionMode) {
    return buildCoupleQuestionStateCard(session, options);
  }

  if (session.mode === afterDarkMode) {
    return buildAfterDarkStateCard(session, options);
  }

  if (session.mode === dateNightMode) {
    return buildDateNightStateCard(session, options);
  }

  if (session.mode === thisOrThatMode) {
    return buildThisOrThatStateCard(session, options);
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
    components: buildQuickPromptButtons(session.id, false),
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
    )} - ${formatPlayContext(session.playContext)}`,
  });

  if (session.phase === "lobby") {
    embed
      .setTitle("Truth or Dare lobby")
      .setDescription(
        [
          `Host: ${mention(session.hostUserId)}`,
          `Play context: ${formatPlayContext(session.playContext)}`,
          `Players: ${formatPlayers(session.players)}`,
        ].join("\n"),
      );

    if (options.view === "rules") {
      embed.addFields(
        {
          name: "Rules",
          value:
            "Join the lobby, choose Meet or E-Meet, then the host starts when at least 2 players are in. Turns follow join order.",
        },
        {
          name: "Comfort",
          value:
            "Skip, Softer, and End are always available. Dares should stay safe, legal, and only involve players who joined.",
        },
        {
          name: "Play context",
          value:
            "E-Meet keeps dares remote-safe for Discord or video calls. Meet allows safe in-person dares.",
        },
      );
    }

    return {
      embeds: [embed],
      components: buildTruthOrDareLobbyButtons(session, session.id, false),
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
      } - ${formatPlayContext(session.playContext)} - Intensity ${intensityValue(
        session.intensity,
      )} - ${formatPromptSource(
        prompt.source,
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
    components: prompt.type === "dare"
      ? buildDarePromptButtons(session.id, false)
      : buildTruthPromptButtons(session.id, false),
  };
}

function buildQuickPromptButtons(
  sessionId: string,
  disabled: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("next", sessionId, "Next", ButtonStyle.Primary, disabled),
      gameButton("skip", sessionId, "Skip", ButtonStyle.Secondary, disabled),
      gameButton("softer", sessionId, "Softer", ButtonStyle.Secondary, disabled),
      gameButton("spicier", sessionId, "Spicier", ButtonStyle.Secondary, disabled),
      gameButton("end", sessionId, "End", ButtonStyle.Danger, disabled),
    ),
  ];
}

function buildCoupleQuestionButtons(
  sessionId: string,
  disabled: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("answer_private", sessionId, "Answer", ButtonStyle.Success, disabled),
      gameButton("next", sessionId, "Next", ButtonStyle.Primary, disabled),
      gameButton("skip", sessionId, "Skip", ButtonStyle.Secondary, disabled),
      gameButton("softer", sessionId, "Softer", ButtonStyle.Secondary, disabled),
      gameButton("deeper", sessionId, "Deeper", ButtonStyle.Secondary, disabled),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("end", sessionId, "End", ButtonStyle.Danger, disabled),
    ),
  ];
}

function buildCoupleQuestionLobbyButtons(
  sessionId: string,
  disabled: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("join", sessionId, "Join", ButtonStyle.Success, disabled),
      gameButton("leave", sessionId, "Leave", ButtonStyle.Secondary, disabled),
      gameButton(
        "start_couple_question",
        sessionId,
        "Start",
        ButtonStyle.Primary,
        disabled,
      ),
      gameButton("rules", sessionId, "Rules", ButtonStyle.Secondary, disabled),
      gameButton("end", sessionId, "End", ButtonStyle.Danger, disabled),
    ),
  ];
}

function buildCoupleQuestionRevealButtons(
  sessionId: string,
  disabled: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("next", sessionId, "Next", ButtonStyle.Primary, disabled),
      gameButton("skip", sessionId, "Skip", ButtonStyle.Secondary, disabled),
      gameButton("softer", sessionId, "Softer", ButtonStyle.Secondary, disabled),
      gameButton("deeper", sessionId, "Deeper", ButtonStyle.Secondary, disabled),
      gameButton("end", sessionId, "End", ButtonStyle.Danger, disabled),
    ),
  ];
}

function buildAfterDarkButtons(
  sessionId: string,
  disabled: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("answer_private", sessionId, "Answer", ButtonStyle.Success, disabled),
      gameButton("next", sessionId, "Next", ButtonStyle.Primary, disabled),
      gameButton("skip", sessionId, "Skip", ButtonStyle.Secondary, disabled),
      gameButton("softer", sessionId, "Softer", ButtonStyle.Secondary, disabled),
      gameButton("spicier", sessionId, "Warmer", ButtonStyle.Secondary, disabled),
    ),
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("end", sessionId, "End", ButtonStyle.Danger, disabled),
    ),
  ];
}

function buildAfterDarkRevealButtons(
  sessionId: string,
  disabled: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("next", sessionId, "Next", ButtonStyle.Primary, disabled),
      gameButton("skip", sessionId, "Skip", ButtonStyle.Secondary, disabled),
      gameButton("softer", sessionId, "Softer", ButtonStyle.Secondary, disabled),
      gameButton("spicier", sessionId, "Warmer", ButtonStyle.Secondary, disabled),
      gameButton("end", sessionId, "End", ButtonStyle.Danger, disabled),
    ),
  ];
}

function buildAfterDarkLobbyButtons(
  sessionId: string,
  disabled: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("join", sessionId, "Join", ButtonStyle.Success, disabled),
      gameButton("leave", sessionId, "Leave", ButtonStyle.Secondary, disabled),
      gameButton("start_after_dark", sessionId, "Start", ButtonStyle.Primary, disabled),
      gameButton("rules", sessionId, "Rules", ButtonStyle.Secondary, disabled),
      gameButton("end", sessionId, "End", ButtonStyle.Danger, disabled),
    ),
  ];
}

function buildDateNightButtons(
  sessionId: string,
  disabled: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("answer_private", sessionId, "Answer", ButtonStyle.Success, disabled),
      gameButton(
        "continue_date_night",
        sessionId,
        "Continue",
        ButtonStyle.Primary,
        disabled,
      ),
      gameButton("skip", sessionId, "Skip", ButtonStyle.Secondary, disabled),
      gameButton("softer", sessionId, "Softer", ButtonStyle.Secondary, disabled),
      gameButton("end", sessionId, "End", ButtonStyle.Danger, disabled),
    ),
  ];
}

function buildDateNightLobbyButtons(
  sessionId: string,
  disabled: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("join", sessionId, "Join", ButtonStyle.Success, disabled),
      gameButton("leave", sessionId, "Leave", ButtonStyle.Secondary, disabled),
      gameButton("start_date_night", sessionId, "Start", ButtonStyle.Primary, disabled),
      gameButton("rules", sessionId, "Rules", ButtonStyle.Secondary, disabled),
      gameButton("end", sessionId, "End", ButtonStyle.Danger, disabled),
    ),
  ];
}

function buildDateNightCompletedButtons(
  sessionId: string,
  disabled: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("end", sessionId, "End", ButtonStyle.Danger, disabled),
    ),
  ];
}

function privateAnswerButtonsForSession(
  session: GameSession,
  disabled: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
  if (session.mode === afterDarkMode) {
    return buildAfterDarkButtons(session.id, disabled);
  }

  if (session.mode === dateNightMode) {
    return buildDateNightButtons(session.id, disabled);
  }

  return buildCoupleQuestionButtons(session.id, disabled);
}

function privateAnswerRevealButtonsForSession(
  session: GameSession,
  disabled: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
  if (session.mode === afterDarkMode) {
    return buildAfterDarkRevealButtons(session.id, disabled);
  }

  if (session.mode === dateNightMode) {
    return buildDateNightButtons(session.id, disabled);
  }

  return buildCoupleQuestionRevealButtons(session.id, disabled);
}

function buildThisOrThatLobbyButtons(
  sessionId: string,
  disabled: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("join", sessionId, "Join", ButtonStyle.Success, disabled),
      gameButton("leave", sessionId, "Leave", ButtonStyle.Secondary, disabled),
      gameButton(
        "start_this_or_that",
        sessionId,
        "Start",
        ButtonStyle.Primary,
        disabled,
      ),
      gameButton("rules", sessionId, "Rules", ButtonStyle.Secondary, disabled),
      gameButton("end", sessionId, "End", ButtonStyle.Danger, disabled),
    ),
  ];
}

function buildThisOrThatVotingButtons(
  sessionId: string,
  disabled: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("pick_left", sessionId, "Left", ButtonStyle.Primary, disabled),
      gameButton("pick_right", sessionId, "Right", ButtonStyle.Primary, disabled),
      gameButton("skip", sessionId, "Skip", ButtonStyle.Secondary, disabled),
      gameButton("softer", sessionId, "Softer", ButtonStyle.Secondary, disabled),
      gameButton("end", sessionId, "End", ButtonStyle.Danger, disabled),
    ),
  ];
}

function buildThisOrThatRevealButtons(
  sessionId: string,
  disabled: boolean,
): ActionRowBuilder<ButtonBuilder>[] {
  return [
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton("next", sessionId, "Next", ButtonStyle.Primary, disabled),
      gameButton("skip", sessionId, "Skip", ButtonStyle.Secondary, disabled),
      gameButton("softer", sessionId, "Softer", ButtonStyle.Secondary, disabled),
      gameButton("end", sessionId, "End", ButtonStyle.Danger, disabled),
    ),
  ];
}

function buildTruthOrDareLobbyButtons(
  session: GameSession,
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
    new ActionRowBuilder<ButtonBuilder>().addComponents(
      gameButton(
        "set_context_e_meet",
        sessionId,
        "E-Meet",
        session.playContext === "e_meet" ? ButtonStyle.Primary : ButtonStyle.Secondary,
        disabled,
      ),
      gameButton(
        "set_context_meet",
        sessionId,
        "Meet",
        session.playContext === "meet" ? ButtonStyle.Primary : ButtonStyle.Secondary,
        disabled,
      ),
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
      gameButton("next", sessionId, "Next", ButtonStyle.Primary, true),
      gameButton("skip", sessionId, "Skip", ButtonStyle.Secondary, true),
      gameButton("softer", sessionId, "Softer", ButtonStyle.Secondary, true),
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
    after_dark: "After Dark",
  } satisfies Record<PromptType, string>;

  return labels[type];
}

function formatSessionMode(mode: GameSession["mode"]): string {
  if (mode === truthOrDareMode) {
    return "Truth or Dare";
  }

  if (mode === dateNightMode) {
    return "Date Night";
  }

  return formatPromptType(mode);
}

function formatDateNightStep(step: (typeof dateNightSteps)[number]): string {
  const labels = {
    warm_up: "Warm-Up",
    play: "Play",
    closer: "Closer",
    appreciation: "Appreciation",
    closing: "Closing",
  } satisfies Record<(typeof dateNightSteps)[number], string>;

  return labels[step];
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

function formatPromptSource(source: Prompt["source"]): string {
  return source === "ai" ? "AI" : "Static fallback";
}

function formatPlayContext(playContext: PlayContext): string {
  return playContext === "meet" ? "Meet" : "E-Meet";
}

function formatPlayers(players: readonly string[]): string {
  return players.length === 0
    ? "No players yet"
    : players.map((playerId, index) => `${index + 1}. ${mention(playerId)}`).join("\n");
}

function choicePlayers(
  session: GameSession,
  choice: "left" | "right",
): readonly string[] {
  return session.choiceVotes
    .filter((vote) => vote.choice === choice)
    .map((vote) => vote.userId);
}

function mention(userId: string): string {
  return `<@${userId}>`;
}
