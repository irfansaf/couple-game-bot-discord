import { loadEnv } from "./config/env";
import { createApp } from "./composition-root";

const config = loadEnv();
const app = createApp(config);

const shutdown = async (signal: string) => {
  app.logger.info(`Received ${signal}. Shutting down CoupleGame.`);
  await app.close();
  process.exit(0);
};

process.once("SIGINT", () => {
  void shutdown("SIGINT");
});

process.once("SIGTERM", () => {
  void shutdown("SIGTERM");
});

app.logger.info("CoupleGame backend initialized.", app.configSummary);

try {
  await app.start();
} catch (error) {
  app.logger.error("CoupleGame failed to start.", {
    error: error instanceof Error ? error.message : String(error),
  });
  await app.close();
  process.exit(1);
}
