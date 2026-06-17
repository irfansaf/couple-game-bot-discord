import type { PlayContext } from "../../domain/entities/game-session";
import type { Mood, PromptType } from "../../domain/entities/prompt";

export interface AiOutputCaptureRecord {
  readonly provider: "openai-compatible";
  readonly baseUrl: string;
  readonly model: string;
  readonly promptType: PromptType;
  readonly mood: Mood;
  readonly intensity: number;
  readonly playContext: PlayContext | null;
  readonly requestedCount: number;
  readonly attempt: number;
  readonly maxTokens: number;
  readonly temperature: number;
  readonly validationStatus: "valid" | "invalid";
  readonly validationErrors: readonly string[];
  readonly questionCount: number;
  readonly content: string;
  readonly createdAt: Date;
}

export interface AiOutputCaptureRepository {
  saveBatch(records: readonly AiOutputCaptureRecord[]): Promise<void>;
}
