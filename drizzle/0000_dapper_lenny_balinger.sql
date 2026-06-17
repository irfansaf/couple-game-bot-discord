CREATE TABLE "game_sessions" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"guild_id" text NOT NULL,
	"channel_id" text NOT NULL,
	"player_ids" jsonb NOT NULL,
	"mode" text NOT NULL,
	"mood" text NOT NULL,
	"intensity" integer NOT NULL,
	"recent_prompt_ids" jsonb NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone
);
