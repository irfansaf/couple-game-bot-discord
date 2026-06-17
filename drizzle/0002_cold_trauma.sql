ALTER TABLE "game_sessions" ADD COLUMN "host_user_id" text;--> statement-breakpoint
UPDATE "game_sessions" SET "host_user_id" = "player_ids"->>0 WHERE "host_user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "game_sessions" ALTER COLUMN "host_user_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "prompt_queue_type" text;--> statement-breakpoint
UPDATE "game_sessions" SET "prompt_queue_type" = "mode" WHERE "mode" IN ('truth', 'dare', 'couple_question', 'this_or_that');--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "current_prompt" jsonb;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "current_turn_index" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "game_sessions" ADD COLUMN "phase" text DEFAULT 'prompt_revealed' NOT NULL;
