import { randomUUID } from "node:crypto";

import { DomainValidationError } from "../errors/domain-error";
import { brand, type Brand } from "../../shared/brand";

export type SessionId = Brand<string, "SessionId">;
export type GuildId = Brand<string, "GuildId">;
export type ChannelId = Brand<string, "ChannelId">;
export type UserId = Brand<string, "UserId">;
export type PromptId = Brand<string, "PromptId">;

function createNonEmptyId<TBrand extends string>(
  value: string,
  label: string,
): Brand<string, TBrand> {
  const trimmed = value.trim();

  if (trimmed.length === 0) {
    throw new DomainValidationError(`${label} must not be empty.`);
  }

  return brand<string, TBrand>(trimmed);
}

export function createSessionId(value: string): SessionId {
  return createNonEmptyId<"SessionId">(value, "Session id");
}

export function createGuildId(value: string): GuildId {
  return createNonEmptyId<"GuildId">(value, "Guild id");
}

export function createChannelId(value: string): ChannelId {
  return createNonEmptyId<"ChannelId">(value, "Channel id");
}

export function createUserId(value: string): UserId {
  return createNonEmptyId<"UserId">(value, "User id");
}

export function createPromptId(value: string = randomUUID()): PromptId {
  return createNonEmptyId<"PromptId">(value, "Prompt id");
}
