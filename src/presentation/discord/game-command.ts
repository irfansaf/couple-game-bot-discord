import { SlashCommandBuilder } from "discord.js";

export const gameModeChoices = [
  { name: "Truth or Dare", value: "truth_or_dare" },
  { name: "Couple Question", value: "couple_question" },
  { name: "This or That", value: "this_or_that" },
  { name: "After Dark", value: "after_dark" },
  { name: "Date Night", value: "date_night" },
] as const;

export const moodChoices = [
  { name: "Cozy", value: "cozy" },
  { name: "Funny", value: "funny" },
  { name: "Romantic", value: "romantic" },
  { name: "Deep", value: "deep" },
  { name: "Flirty Safe", value: "flirty_safe" },
] as const;

export const gameStartCommand = new SlashCommandBuilder()
  .setName("game")
  .setDescription("Start and manage a cozy CoupleGame session.")
  .addSubcommand((subcommand) =>
    subcommand
      .setName("start")
      .setDescription("Start a new game session.")
      .addStringOption((option) =>
        option
          .setName("mode")
          .setDescription("Choose the first game mode.")
          .addChoices(...gameModeChoices),
      )
      .addStringOption((option) =>
        option
          .setName("mood")
          .setDescription("Choose the session mood.")
          .addChoices(...moodChoices),
      )
      .addIntegerOption((option) =>
        option
          .setName("intensity")
          .setDescription("Choose comfort intensity.")
          .setMinValue(1)
          .setMaxValue(3),
      ),
  );
