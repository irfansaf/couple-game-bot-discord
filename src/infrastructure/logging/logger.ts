import pino from "pino";

export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export class PinoLogger implements Logger {
  private readonly logger: pino.Logger;

  public constructor(level: string) {
    this.logger = pino({
      level,
      base: null,
      timestamp: pino.stdTimeFunctions.isoTime,
      redact: {
        paths: [
          "discord.token",
          "ai.apiKey",
          "apiKey",
          "authorization",
          "headers.authorization",
        ],
        censor: "[redacted]",
      },
    });
  }

  public debug(message: string, context?: Record<string, unknown>): void {
    this.logger.debug(context ?? {}, message);
  }

  public info(message: string, context?: Record<string, unknown>): void {
    this.logger.info(context ?? {}, message);
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    this.logger.warn(context ?? {}, message);
  }

  public error(message: string, context?: Record<string, unknown>): void {
    this.logger.error(context ?? {}, message);
  }
}
