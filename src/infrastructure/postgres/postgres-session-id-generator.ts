import { z } from "zod";

import type { SessionIdGenerator } from "../../application/ports/session-id-generator";
import { createSessionId } from "../../domain/value-objects/ids";
import type { PostgresConnection } from "./client";

const uuidV7RowSchema = z.object({
  id: z.uuid(),
});

export class PostgresSessionIdGenerator implements SessionIdGenerator {
  public constructor(private readonly connection: PostgresConnection) {}

  public async next() {
    const rows: unknown = await this.connection.sql`
      select uuidv7()::text as id
    `;
    const parsedRows = z.array(uuidV7RowSchema).min(1).parse(rows);
    const row = parsedRows[0];

    if (row === undefined) {
      throw new Error("Postgres did not return a UUIDv7 session id.");
    }

    return createSessionId(row.id);
  }
}
