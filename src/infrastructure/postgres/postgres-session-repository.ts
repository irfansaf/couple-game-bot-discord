import { eq } from "drizzle-orm";
import { z } from "zod";

import type { SessionRepository } from "../../application/ports/session-repository";
import type { GameSession, GameSessionStatus } from "../../domain/entities/game-session";
import { gameModes, moods, type Prompt } from "../../domain/entities/prompt";
import {
  createChannelId,
  createGuildId,
  createPromptId,
  createSessionId,
  createUserId,
  type SessionId,
} from "../../domain/value-objects/ids";
import {
  createIntensity,
  intensityValue,
} from "../../domain/value-objects/intensity";
import type { PostgresConnection } from "./client";
import { gameSessions } from "./schema";

const sessionRowSchema = z.object({
  id: z.string().min(1),
  guildId: z.string().min(1),
  channelId: z.string().min(1),
  playerIds: z.array(z.string().min(1)).min(1),
  mode: z.enum(gameModes),
  mood: z.enum(moods),
  intensity: z.number().int().min(1).max(3),
  recentPromptIds: z.array(z.string().min(1)),
  promptQueue: z.array(
    z.object({
      id: z.string().min(1),
      type: z.enum(gameModes),
      mood: z.enum(moods),
      intensity: z.number().int().min(1).max(3),
      text: z.string().min(1),
      followUp: z.string().min(1).optional(),
      safetyNotes: z.array(z.string()),
      source: z.enum(["static", "ai"]),
    }),
  ),
  status: z.enum(["active", "ended"]),
  createdAt: z.date(),
  endedAt: z.date().nullable(),
});

type SessionRow = typeof gameSessions.$inferSelect;

export class PostgresSessionRepository implements SessionRepository {
  public constructor(private readonly connection: PostgresConnection) {}

  public async save(session: GameSession): Promise<void> {
    await this.connection.db
      .insert(gameSessions)
      .values({
        id: session.id,
        guildId: session.guildId,
        channelId: session.channelId,
        playerIds: [...session.players],
        mode: session.mode,
        mood: session.mood,
        intensity: intensityValue(session.intensity),
        recentPromptIds: [...session.recentPromptIds],
        promptQueue: session.promptQueue.map(toStoredPrompt),
        status: session.status,
        createdAt: session.createdAt,
        endedAt: session.endedAt ?? null,
      })
      .onConflictDoUpdate({
        target: gameSessions.id,
        set: {
          playerIds: [...session.players],
          mode: session.mode,
          mood: session.mood,
          intensity: intensityValue(session.intensity),
          recentPromptIds: [...session.recentPromptIds],
          promptQueue: session.promptQueue.map(toStoredPrompt),
          status: session.status,
          endedAt: session.endedAt ?? null,
        },
      });
  }

  public async findById(id: SessionId): Promise<GameSession | null> {
    const rows = await this.connection.db
      .select()
      .from(gameSessions)
      .where(eq(gameSessions.id, id))
      .limit(1);

    const row = rows[0];

    return row === undefined ? null : toDomain(row);
  }
}

function toDomain(row: SessionRow): GameSession {
  const parsed = sessionRowSchema.parse(row);
  const endedAt = parsed.endedAt ?? undefined;

  return {
    id: createSessionId(parsed.id),
    guildId: createGuildId(parsed.guildId),
    channelId: createChannelId(parsed.channelId),
    players: parsed.playerIds.map(createUserId),
    mode: parsed.mode,
    mood: parsed.mood,
    intensity: createIntensity(parsed.intensity),
    recentPromptIds: parsed.recentPromptIds.map(createPromptId),
    promptQueue: parsed.promptQueue.map(fromStoredPrompt),
    status: parsed.status as GameSessionStatus,
    createdAt: parsed.createdAt,
    ...(endedAt === undefined ? {} : { endedAt }),
  };
}

function toStoredPrompt(prompt: Prompt) {
  return {
    id: prompt.id,
    type: prompt.type,
    mood: prompt.mood,
    intensity: intensityValue(prompt.intensity),
    text: prompt.text,
    safetyNotes: [...prompt.safetyNotes],
    source: prompt.source,
    ...(prompt.followUp === undefined ? {} : { followUp: prompt.followUp }),
  };
}

function fromStoredPrompt(prompt: z.infer<typeof sessionRowSchema>["promptQueue"][number]): Prompt {
  return {
    id: createPromptId(prompt.id),
    type: prompt.type,
    mood: prompt.mood,
    intensity: createIntensity(prompt.intensity),
    text: prompt.text,
    safetyNotes: prompt.safetyNotes,
    source: prompt.source,
    ...(prompt.followUp === undefined ? {} : { followUp: prompt.followUp }),
  };
}
