import { DiscordAPIError, REST } from "@discordjs/rest";
import { Routes, type RESTPostAPIChatInputApplicationCommandsJSONBody } from "discord.js";

import type { RuntimeConfig } from "../../config/env";

export class DiscordCommandRegistrationError extends Error {
  public constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "DiscordCommandRegistrationError";
  }
}

export async function registerGuildCommands(
  config: RuntimeConfig["discord"],
  commands: readonly { toJSON(): RESTPostAPIChatInputApplicationCommandsJSONBody }[],
): Promise<void> {
  const rest = new REST({ version: "10" }).setToken(config.token);

  try {
    await rest.put(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
      {
        body: commands.map((command) => command.toJSON()),
      },
    );
  } catch (error) {
    throw mapCommandRegistrationError(error, config);
  }
}

function mapCommandRegistrationError(
  error: unknown,
  config: RuntimeConfig["discord"],
): Error {
  if (error instanceof DiscordAPIError && error.status === 401) {
    return new DiscordCommandRegistrationError(
      [
        "Discord rejected the bot token while registering slash commands.",
        "Check DISCORD_TOKEN is the Bot Token from Developer Portal > Bot for this exact application.",
        `Check DISCORD_CLIENT_ID matches that same application (${config.clientId}).`,
        "If you reset the token, update .env and restart Bun.",
      ].join(" "),
      { cause: error },
    );
  }

  if (error instanceof DiscordAPIError && error.status === 403) {
    return new DiscordCommandRegistrationError(
      [
        "Discord refused slash command registration for this guild.",
        `Check the bot was invited to guild ${config.guildId} with the applications.commands scope.`,
      ].join(" "),
      { cause: error },
    );
  }

  return error instanceof Error
    ? error
    : new DiscordCommandRegistrationError(String(error));
}
