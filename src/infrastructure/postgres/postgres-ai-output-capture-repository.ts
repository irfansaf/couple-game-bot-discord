import type {
  AiOutputCaptureRecord,
  AiOutputCaptureRepository,
} from "../../application/ports/ai-output-capture-repository";
import { aiPromptGenerations } from "./schema";
import type { PostgresConnection } from "./client";

export class PostgresAiOutputCaptureRepository
  implements AiOutputCaptureRepository
{
  public constructor(private readonly connection: PostgresConnection) {}

  public async saveBatch(
    records: readonly AiOutputCaptureRecord[],
  ): Promise<void> {
    if (records.length === 0) {
      return;
    }

    await this.connection.db.insert(aiPromptGenerations).values(
      records.map((record) => ({
        provider: record.provider,
        baseUrl: record.baseUrl,
        model: record.model,
        promptType: record.promptType,
        mood: record.mood,
        intensity: record.intensity,
        playContext: record.playContext,
        requestedCount: record.requestedCount,
        attempt: record.attempt,
        maxTokens: record.maxTokens,
        temperature: record.temperature,
        validationStatus: record.validationStatus,
        validationErrors: [...record.validationErrors],
        questionCount: record.questionCount,
        content: record.content,
        createdAt: record.createdAt,
      })),
    );
  }
}
