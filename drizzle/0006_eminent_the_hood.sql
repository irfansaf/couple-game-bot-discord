CREATE TABLE "ai_prompt_generations" (
	"id" uuid PRIMARY KEY DEFAULT uuidv7() NOT NULL,
	"provider" text NOT NULL,
	"base_url" text NOT NULL,
	"model" text NOT NULL,
	"prompt_type" text NOT NULL,
	"mood" text NOT NULL,
	"intensity" integer NOT NULL,
	"play_context" text,
	"requested_count" integer NOT NULL,
	"attempt" integer NOT NULL,
	"max_tokens" integer NOT NULL,
	"temperature" double precision NOT NULL,
	"validation_status" text NOT NULL,
	"validation_errors" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"question_count" integer NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
