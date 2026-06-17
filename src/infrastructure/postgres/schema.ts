import { sql } from "drizzle-orm";
import { integer, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";

export const gameSessions = pgTable("game_sessions", {
  id: uuid("id").primaryKey().default(sql`uuidv7()`),
  guildId: text("guild_id").notNull(),
  channelId: text("channel_id").notNull(),
  hostUserId: text("host_user_id").notNull(),
  playerIds: jsonb("player_ids").$type<string[]>().notNull(),
  mode: text("mode").notNull(),
  mood: text("mood").notNull(),
  intensity: integer("intensity").notNull(),
  recentPromptIds: jsonb("recent_prompt_ids").$type<string[]>().notNull(),
  recentPromptTexts: jsonb("recent_prompt_texts").$type<string[]>().notNull().default([]),
  promptQueue: jsonb("prompt_queue").$type<unknown[]>().notNull().default([]),
  promptQueueType: text("prompt_queue_type"),
  currentPrompt: jsonb("current_prompt").$type<unknown>(),
  currentTurnIndex: integer("current_turn_index").notNull().default(0),
  phase: text("phase").notNull().default("prompt_revealed"),
  status: text("status").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});
