import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import type { RuntimeConfig } from "../../config/env";
import * as schema from "./schema";

export function createPostgresConnection(
  databaseConfig: RuntimeConfig["database"],
) {
  const sql = postgres(databaseConfig.url, {
    idle_timeout: 20,
    max: 10,
    ssl: databaseConfig.ssl ? "require" : false,
  });

  return {
    db: drizzle(sql, { schema }),
    sql,
    close: () => sql.end({ timeout: 5 }),
  };
}

export type PostgresConnection = ReturnType<typeof createPostgresConnection>;
