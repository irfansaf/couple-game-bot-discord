import {
  MessageFlags,
  type ButtonInteraction,
  type ChatInputCommandInteraction,
  type Client,
  type Interaction,
} from "discord.js";
import { z } from "zod";

import type {
  GameAction,
  GameActionBlockedReason,
  HandleGameActionUseCase,
} from "../../application/use-cases/handle-game-action";
import type {
  StartGameSessionInput,
  StartGameSessionUseCase,
} from "../../application/use-cases/start-game-session";
import type { RefillPromptQueueUseCase } from "../../application/use-cases/refill-prompt-queue";
import { gameModes, moods } from "../../domain/entities/prompt";
import type { GameSession } from "../../domain/entities/game-session";
import type { Logger } from "../../infrastructure/logging/logger";
import { parseGameButtonId } from "./button-ids";
import {
  buildEndedCard,
  buildLoadingCard,
  buildPromptCard,
  buildSessionStateCard,
} from "./game-card";

const startOptionsSchema = z.object({
  mode: z.enum(gameModes).optional(),
  mood: z.enum(moods).optional(),
  intensity: z.number().int().min(1).max(3).optional(),
});

export class DiscordGameController {
  public constructor(
    private readonly startGameSession: StartGameSessionUseCase,
    private readonly handleGameAction: HandleGameActionUseCase,
    private readonly refillPromptQueue: RefillPromptQueueUseCase,
    private readonly logger: Logger,
  ) {}

  public register(client: Client): void {
    client.on("interactionCreate", (interaction) => {
      void this.handleInteraction(interaction);
    });
  }

  private async handleInteraction(interaction: Interaction): Promise<void> {
    try {
      if (interaction.isChatInputCommand()) {
        await this.handleChatInputCommand(interaction);
        return;
      }

      if (interaction.isButton()) {
        await this.handleButton(interaction);
      }
    } catch (error) {
      this.logger.error("Discord interaction failed.", {
        error: error instanceof Error ? error.message : String(error),
      });

      if (interaction.isRepliable() && !interaction.replied && !interaction.deferred) {
        await interaction.reply({
          content: "Something went sideways. Try another round in a moment.",
          flags: MessageFlags.Ephemeral,
        });
      }
    }
  }

  private async handleChatInputCommand(
    interaction: ChatInputCommandInteraction,
  ): Promise<void> {
    if (interaction.commandName !== "game") {
      return;
    }

    const subcommand = interaction.options.getSubcommand();

    if (subcommand !== "start") {
      await interaction.reply({
        content: "That game command is not ready yet.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const context = getGuildChannelContext(interaction);

    if (context === null) {
      await interaction.reply({
        content: "Start CoupleGame inside a server text channel.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    await interaction.deferReply();

    const options = parseStartOptions(interaction);
    const input: StartGameSessionInput = {
      guildId: context.guildId,
      channelId: context.channelId,
      startedByUserId: interaction.user.id,
      ...(options.mode === undefined ? {} : { mode: options.mode }),
      ...(options.mood === undefined ? {} : { mood: options.mood }),
      ...(options.intensity === undefined
        ? {}
        : { intensity: options.intensity }),
    };
    const output = await this.startGameSession.execute(input);
    const card = output.status === "prompt"
      ? buildPromptCard(output.session, output.prompt)
      : buildSessionStateCard(output.session);

    await interaction.editReply({
      embeds: card.embeds,
      components: card.components,
    });

    if (output.status === "prompt") {
      this.refillQueueInBackground(output.session.id);
    }
  }

  private async handleButton(interaction: ButtonInteraction): Promise<void> {
    const parsed = parseGameButtonId(interaction.customId);

    if (parsed === null) {
      return;
    }

    const loadingCard = buildLoadingCard(
      parsed.sessionId,
      loadingLabelForAction(parsed.action),
    );

    await interaction.update({
      embeds: loadingCard.embeds,
      components: loadingCard.components,
    });

    const output = await this.handleGameAction.execute({
      ...parsed,
      userId: interaction.user.id,
    });

    if (output.status === "missing_session") {
      await interaction.followUp({
        content: "I cannot find that game anymore. Start a fresh one with `/game start`.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (output.status === "inactive_session") {
      const card = buildCurrentSessionCard(output.session);

      await interaction.editReply({
        embeds: card.embeds,
        components: card.components,
      });
      await interaction.followUp({
        content: "That session already ended. Start a fresh one with `/game start`.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (output.status === "missing_prompt") {
      const card = buildCurrentSessionCard(output.session);

      await interaction.editReply({
        embeds: card.embeds,
        components: card.components,
      });
      await interaction.followUp({
        content: "No matching prompt is available yet. Try another button.",
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (output.status === "blocked") {
      const card = buildCurrentSessionCard(output.session);

      await interaction.editReply({
        embeds: card.embeds,
        components: card.components,
      });
      await interaction.followUp({
        content: blockedMessage(output.reason, output.session),
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    if (output.status === "ended") {
      const card = buildEndedCard(output.session);

      await interaction.editReply({
        embeds: card.embeds,
        components: card.components,
      });
      return;
    }

    if (output.status === "state") {
      const card = buildSessionStateCard(
        output.session,
        output.view === undefined ? {} : { view: output.view },
      );

      await interaction.editReply({
        embeds: card.embeds,
        components: card.components,
      });
      return;
    }

    if (output.status === "acknowledged") {
      const card = buildCurrentSessionCard(output.session);

      await interaction.editReply({
        embeds: card.embeds,
        components: card.components,
      });
      await interaction.followUp({
        content: output.message,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const card = buildPromptCard(output.session, output.prompt);

    await interaction.editReply({
      embeds: card.embeds,
      components: card.components,
    });

    this.refillQueueInBackground(output.session.id);
  }

  private refillQueueInBackground(sessionId: string): void {
    void this.refillPromptQueue.execute({ sessionId }).catch((error: unknown) => {
      this.logger.warn("Prompt queue background refill failed.", {
        error: error instanceof Error ? error.message : String(error),
      });
    });
  }
}

function loadingLabelForAction(action: GameAction): string {
  const labels = {
    join: "Joining the lobby...",
    leave: "Leaving the lobby...",
    start_tod: "Starting Truth or Dare...",
    start_this_or_that: "Starting This or That...",
    rules: "Opening the rules...",
    set_context_meet: "Setting dares for in-person play...",
    set_context_e_meet: "Setting dares for remote play...",
    truth: "Finding a good truth...",
    dare: "Finding a playful dare...",
    random: "Flipping between truth and dare...",
    couple_question: "Finding a couple question...",
    this_or_that: "Finding a this-or-that...",
    next: "Getting the next prompt ready...",
    skip: "Skipping to another prompt...",
    softer: "Making it softer...",
    spicier: "Turning it up gently...",
    deeper: "Finding a deeper question...",
    pick_left: "Noting your pick...",
    pick_right: "Noting your pick...",
    answered: "Marking that truth answered...",
    done: "Marking that dare done...",
    alternative_dare: "Finding an alternate dare...",
    next_turn: "Moving to the next turn...",
    end: "Wrapping up the session...",
  } satisfies Record<string, string>;

  return labels[action] ?? "Getting the next prompt ready...";
}

function buildCurrentSessionCard(session: GameSession) {
  if (
    session.currentPrompt !== undefined &&
    (session.phase === "prompt_revealed" ||
      session.phase === "voting" ||
      session.phase === "revealed")
  ) {
    return buildPromptCard(session, session.currentPrompt);
  }

  return buildSessionStateCard(session);
}

function blockedMessage(
  reason: GameActionBlockedReason,
  session: GameSession,
): string {
  const currentPlayer = session.players[session.currentTurnIndex];
  const currentPlayerText = currentPlayer === undefined
    ? "the current player"
    : `<@${currentPlayer}>`;

  const messages = {
    already_joined: "You are already in this lobby.",
    session_full: "This lobby is full. Max 8 players for now.",
    not_in_lobby: "That action only works while the lobby is still open.",
    not_enough_players: `${formatModeName(session)} needs at least 2 players before starting.`,
    not_host: "Only the host can start this lobby.",
    not_a_player: "Join the game before using that button.",
    not_current_player: `It is ${currentPlayerText}'s turn right now.`,
    wrong_phase: "That button does not match the current game step anymore.",
  } satisfies Record<GameActionBlockedReason, string>;

  return messages[reason];
}

function formatModeName(session: GameSession): string {
  if (session.mode === "this_or_that") {
    return "This or That";
  }

  if (session.mode === "truth_or_dare") {
    return "Truth or Dare";
  }

  return "This game";
}

function parseStartOptions(interaction: ChatInputCommandInteraction) {
  const mode = interaction.options.getString("mode") ?? undefined;
  const mood = interaction.options.getString("mood") ?? undefined;
  const intensity = interaction.options.getInteger("intensity") ?? undefined;

  return startOptionsSchema.parse({
    ...(mode === undefined ? {} : { mode }),
    ...(mood === undefined ? {} : { mood }),
    ...(intensity === undefined ? {} : { intensity }),
  });
}

function getGuildChannelContext(
  interaction: ChatInputCommandInteraction,
): { readonly guildId: string; readonly channelId: string } | null {
  if (interaction.guildId === null || interaction.channelId === null) {
    return null;
  }

  return {
    guildId: interaction.guildId,
    channelId: interaction.channelId,
  };
}
