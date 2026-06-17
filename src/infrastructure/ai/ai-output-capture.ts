import type {
  AiOutputCaptureRecord,
  AiOutputCaptureRepository,
} from "../../application/ports/ai-output-capture-repository";
import type { GenerateQuestionInput } from "../../application/ports/question-generator";
import type { AiProviderConfig } from "../../config/env";
import { validateGeneratedAiOutputPayload } from "../../content/ai-generated-output";
import { intensityValue } from "../../domain/value-objects/intensity";
import type { Logger } from "../logging/logger";

export interface AiOutputCaptureSink {
  enqueue(record: AiOutputCaptureRecord): void;
  flush(): Promise<void>;
  close(): Promise<void>;
}

export interface BuildAiOutputCaptureRecordInput {
  readonly config: AiProviderConfig;
  readonly input: GenerateQuestionInput;
  readonly count: number;
  readonly attempt: number;
  readonly content: string;
  readonly now?: Date;
}

export class BufferedAiOutputCapture implements AiOutputCaptureSink {
  private readonly queue: AiOutputCaptureRecord[] = [];
  private flushTimer: ReturnType<typeof setTimeout> | null = null;
  private currentFlush: Promise<void> | null = null;
  private flushing = false;
  private lastFlushFailed = false;
  private closing = false;

  public constructor(
    private readonly repository: AiOutputCaptureRepository,
    private readonly options: {
      readonly batchSize: number;
      readonly flushIntervalMs: number;
    },
    private readonly logger?: Logger,
  ) {}

  public enqueue(record: AiOutputCaptureRecord): void {
    this.queue.push(record);

    if (this.queue.length >= this.options.batchSize) {
      this.flushInBackground();
      return;
    }

    this.scheduleFlush();
  }

  public async flush(): Promise<void> {
    if (this.flushing || this.queue.length === 0) {
      return;
    }

    this.clearTimer();
    this.flushing = true;
    this.lastFlushFailed = false;
    const records = this.queue.splice(0, this.options.batchSize);

    try {
      await this.repository.saveBatch(records);
      this.logger?.debug("AI output capture batch stored.", {
        count: records.length,
      });
    } catch (error) {
      this.lastFlushFailed = true;
      this.queue.unshift(...records);
      this.logger?.warn("AI output capture batch store failed.", {
        count: records.length,
        error: error instanceof Error ? error.message : String(error),
      });
    } finally {
      this.flushing = false;

      if (
        !this.closing &&
        this.queue.length > 0 &&
        (this.lastFlushFailed || this.queue.length < this.options.batchSize)
      ) {
        this.scheduleFlush();
      }
    }
  }

  public async close(): Promise<void> {
    this.closing = true;
    this.clearTimer();

    while (this.queue.length > 0 || this.currentFlush !== null) {
      if (this.currentFlush !== null) {
        await this.currentFlush;
        continue;
      }

      const previousLength = this.queue.length;

      await this.flush();

      if (this.queue.length >= previousLength) {
        break;
      }
    }

    this.clearTimer();
  }

  private scheduleFlush(): void {
    if (this.closing || this.flushTimer !== null) {
      return;
    }

    this.flushTimer = setTimeout(() => {
      this.flushTimer = null;
      this.flushInBackground();
    }, this.options.flushIntervalMs);
  }

  private flushInBackground(): void {
    if (this.currentFlush !== null) {
      return;
    }

    this.currentFlush = this.flush().finally(() => {
      const shouldContinueImmediately =
        !this.closing &&
        !this.lastFlushFailed &&
        this.queue.length >= this.options.batchSize;

      this.currentFlush = null;

      if (shouldContinueImmediately) {
        this.flushInBackground();
      }
    });
  }

  private clearTimer(): void {
    if (this.flushTimer === null) {
      return;
    }

    clearTimeout(this.flushTimer);
    this.flushTimer = null;
  }
}

export function buildAiOutputCaptureRecord({
  config,
  input,
  count,
  attempt,
  content,
  now = new Date(),
}: BuildAiOutputCaptureRecordInput): AiOutputCaptureRecord {
  const validation = validateGeneratedAiOutputPayload({
    content,
  });

  return {
    provider: "openai-compatible",
    baseUrl: config.baseUrl,
    model: config.model,
    promptType: input.type,
    mood: input.mood,
    intensity: intensityValue(input.intensity),
    playContext: input.playContext ?? null,
    requestedCount: count,
    attempt,
    maxTokens: config.maxTokens,
    temperature: config.temperature,
    validationStatus: validation.status,
    validationErrors: validation.errors,
    questionCount: validation.questionCount,
    content,
    createdAt: now,
  };
}
