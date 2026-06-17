export interface Logger {
  debug(message: string, context?: Record<string, unknown>): void;
  info(message: string, context?: Record<string, unknown>): void;
  warn(message: string, context?: Record<string, unknown>): void;
  error(message: string, context?: Record<string, unknown>): void;
}

export class ConsoleLogger implements Logger {
  public debug(message: string, context?: Record<string, unknown>): void {
    console.debug(message, context ?? {});
  }

  public info(message: string, context?: Record<string, unknown>): void {
    console.info(message, context ?? {});
  }

  public warn(message: string, context?: Record<string, unknown>): void {
    console.warn(message, context ?? {});
  }

  public error(message: string, context?: Record<string, unknown>): void {
    console.error(message, context ?? {});
  }
}
