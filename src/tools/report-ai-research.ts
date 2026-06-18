import "dotenv/config";

import postgres from "postgres";
import { z } from "zod";

import { loadEnv } from "../config/env";

const defaultSince = "24h";
const defaultLimit = 10;

const summaryRowSchema = z.object({
  total: z.number(),
  valid: z.number(),
  invalid: z.number(),
  latestCreatedAt: z.date().nullable(),
});

const breakdownRowSchema = z.object({
  model: z.string(),
  promptType: z.string(),
  mood: z.string(),
  validationStatus: z.string(),
  count: z.number(),
});

const attemptRowSchema = z.object({
  attempt: z.number(),
  validationStatus: z.string(),
  count: z.number(),
});

const errorRowSchema = z.object({
  validationError: z.string(),
  count: z.number(),
});

const recentRowSchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  model: z.string(),
  promptType: z.string(),
  mood: z.string(),
  intensity: z.number(),
  playContext: z.string().nullable(),
  requestedCount: z.number(),
  attempt: z.number(),
  validationStatus: z.string(),
  questionCount: z.number(),
  contentLength: z.number(),
  validationErrors: z.array(z.string()),
});

type SummaryRow = z.infer<typeof summaryRowSchema>;
type BreakdownRow = z.infer<typeof breakdownRowSchema>;
type AttemptRow = z.infer<typeof attemptRowSchema>;
type ErrorRow = z.infer<typeof errorRowSchema>;
type RecentRow = z.infer<typeof recentRowSchema>;

interface ReportOptions {
  readonly since: Date | null;
  readonly sinceLabel: string;
  readonly limit: number;
  readonly json: boolean;
}

interface AiResearchReport {
  readonly generatedAt: string;
  readonly since: string;
  readonly summary: SummaryRow & {
    readonly validRate: number;
    readonly invalidRate: number;
  };
  readonly breakdown: readonly BreakdownRow[];
  readonly attempts: readonly AttemptRow[];
  readonly topErrors: readonly ErrorRow[];
  readonly recentInvalid: readonly RecentRow[];
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));

  if (options === "help") {
    printHelp();
    return;
  }

  const config = loadEnv();
  const sql = postgres(config.database.url, {
    ssl: config.database.ssl ? "require" : false,
  });

  try {
    const tableExists = await hasAiResearchTable(sql);

    if (!tableExists) {
      console.error(
        "AI research table not found. Run `bun run db:migrate` before `bun run ai:report`.",
      );
      process.exitCode = 1;
      return;
    }

    const report = await buildAiResearchReport(sql, options);

    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
      return;
    }

    printReport(report);
  } finally {
    await sql.end();
  }
}

function parseArgs(argv: readonly string[]): ReportOptions | "help" {
  let sinceLabel = defaultSince;
  let limit = defaultLimit;
  let json = false;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === undefined) {
      continue;
    }

    if (arg === "--help" || arg === "-h") {
      return "help";
    }

    if (arg === "--json") {
      json = true;
      continue;
    }

    if (arg === "--since") {
      const value = argv[index + 1];

      if (value === undefined) {
        throw new Error("--since requires a value such as 24h, 7d, or all.");
      }

      sinceLabel = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("--since=")) {
      sinceLabel = arg.slice("--since=".length);
      continue;
    }

    if (arg === "--limit") {
      const value = argv[index + 1];

      if (value === undefined) {
        throw new Error("--limit requires a positive integer.");
      }

      limit = parseLimit(value);
      index += 1;
      continue;
    }

    if (arg.startsWith("--limit=")) {
      limit = parseLimit(arg.slice("--limit=".length));
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return {
    since: parseSince(sinceLabel),
    sinceLabel,
    limit,
    json,
  };
}

async function hasAiResearchTable(sql: postgres.Sql): Promise<boolean> {
  const rows = await sql<{ exists: boolean }[]>`
    select to_regclass('public.ai_prompt_generations') is not null as exists
  `;

  return rows[0]?.exists ?? false;
}

async function buildAiResearchReport(
  sql: postgres.Sql,
  options: ReportOptions,
): Promise<AiResearchReport> {
  const filter = options.since === null
    ? sql`true`
    : sql`created_at >= ${options.since}`;
  const summaryRows = await sql`
    select
      count(*)::int as "total",
      count(*) filter (where validation_status = 'valid')::int as "valid",
      count(*) filter (where validation_status = 'invalid')::int as "invalid",
      max(created_at) as "latestCreatedAt"
    from ai_prompt_generations
    where ${filter}
  `;
  const summary = summaryRowSchema.parse(summaryRows[0]);
  const breakdown = z.array(breakdownRowSchema).parse(await sql`
    select
      model,
      prompt_type as "promptType",
      mood,
      validation_status as "validationStatus",
      count(*)::int as count
    from ai_prompt_generations
    where ${filter}
    group by model, prompt_type, mood, validation_status
    order by count desc, model, prompt_type, mood, validation_status
  `);
  const attempts = z.array(attemptRowSchema).parse(await sql`
    select
      attempt,
      validation_status as "validationStatus",
      count(*)::int as count
    from ai_prompt_generations
    where ${filter}
    group by attempt, validation_status
    order by attempt, validation_status
  `);
  const topErrors = z.array(errorRowSchema).parse(await sql`
    select
      error_text as "validationError",
      count(*)::int as count
    from ai_prompt_generations
    cross join lateral jsonb_array_elements_text(validation_errors) as error_text
    where ${filter}
    group by error_text
    order by count desc, error_text
    limit ${options.limit}
  `);
  const recentInvalid = z.array(recentRowSchema).parse(await sql`
    select
      id::text,
      created_at as "createdAt",
      model,
      prompt_type as "promptType",
      mood,
      intensity,
      play_context as "playContext",
      requested_count as "requestedCount",
      attempt,
      validation_status as "validationStatus",
      question_count as "questionCount",
      length(content)::int as "contentLength",
      validation_errors as "validationErrors"
    from ai_prompt_generations
    where ${filter}
      and validation_status = 'invalid'
    order by created_at desc
    limit ${options.limit}
  `);

  return {
    generatedAt: new Date().toISOString(),
    since: options.sinceLabel,
    summary: {
      ...summary,
      validRate: rate(summary.valid, summary.total),
      invalidRate: rate(summary.invalid, summary.total),
    },
    breakdown,
    attempts,
    topErrors,
    recentInvalid,
  };
}

function printReport(report: AiResearchReport): void {
  console.log("AI Research Report");
  console.log(`Generated: ${report.generatedAt}`);
  console.log(`Window: ${report.since}`);
  console.log("");
  console.log("Summary");
  console.log(`- Total completions: ${report.summary.total}`);
  console.log(
    `- Stored valid: ${report.summary.valid} (${formatPercent(report.summary.validRate)})`,
  );
  console.log(
    `- Stored invalid: ${report.summary.invalid} (${formatPercent(report.summary.invalidRate)})`,
  );
  console.log(
    `- Latest capture: ${
      report.summary.latestCreatedAt?.toISOString() ?? "none"
    }`,
  );
  console.log("");

  printTable("Breakdown by model/mode/mood/stored status", report.breakdown, [
    ["model", (row) => row.model],
    ["type", (row) => row.promptType],
    ["mood", (row) => row.mood],
    ["status", (row) => row.validationStatus],
    ["count", (row) => row.count.toString()],
  ]);
  printTable("Attempts", report.attempts, [
    ["attempt", (row) => row.attempt.toString()],
    ["status", (row) => row.validationStatus],
    ["count", (row) => row.count.toString()],
  ]);
  printTable("Top Validation Errors", report.topErrors, [
    ["count", (row) => row.count.toString()],
    ["error", (row) => compact(row.validationError, 140)],
  ]);
  printTable("Recent Stored Invalid Captures", report.recentInvalid, [
    ["created", (row) => row.createdAt.toISOString()],
    ["id", (row) => row.id],
    ["model", (row) => row.model],
    ["type", (row) => row.promptType],
    ["attempt", (row) => row.attempt.toString()],
    ["questions", (row) => row.questionCount.toString()],
    ["chars", (row) => row.contentLength.toString()],
  ]);
}

function printTable<T>(
  title: string,
  rows: readonly T[],
  columns: readonly [string, (row: T) => string][],
): void {
  console.log(title);

  if (rows.length === 0) {
    console.log("- none");
    console.log("");
    return;
  }

  const widths = columns.map(([header, cell]) =>
    Math.max(header.length, ...rows.map((row) => cell(row).length)),
  );
  const header = columns
    .map(([label], index) => label.padEnd(widths[index] ?? label.length))
    .join("  ");
  const separator = widths.map((width) => "-".repeat(width)).join("  ");

  console.log(header);
  console.log(separator);

  for (const row of rows) {
    console.log(
      columns
        .map(([, cell], index) => cell(row).padEnd(widths[index] ?? 0))
        .join("  "),
    );
  }

  console.log("");
}

function parseSince(value: string): Date | null {
  if (value === "all") {
    return null;
  }

  const match = /^(?<amount>\d+)(?<unit>m|h|d)$/.exec(value);

  if (match?.groups === undefined) {
    throw new Error("--since must be all, or a duration like 30m, 24h, or 7d.");
  }

  const amount = Number.parseInt(match.groups.amount ?? "", 10);
  const unit = match.groups.unit;
  const multiplier =
    unit === "m" ? 60_000 : unit === "h" ? 3_600_000 : 86_400_000;

  return new Date(Date.now() - amount * multiplier);
}

function parseLimit(value: string): number {
  const parsed = Number.parseInt(value, 10);

  if (!Number.isInteger(parsed) || parsed < 1 || parsed > 100) {
    throw new Error("--limit must be an integer from 1 to 100.");
  }

  return parsed;
}

function rate(value: number, total: number): number {
  return total === 0 ? 0 : value / total;
}

function formatPercent(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function compact(value: string, maxLength: number): string {
  const singleLine = value.replace(/\s+/g, " ").trim();

  return singleLine.length > maxLength
    ? `${singleLine.slice(0, maxLength - 3)}...`
    : singleLine;
}

function printHelp(): void {
  console.log(`Usage: bun run ai:report [options]

Options:
  --since <duration>  Report window: 30m, 24h, 7d, or all. Default: ${defaultSince}
  --limit <number>    Max invalid rows/errors to show. Default: ${defaultLimit}
  --json              Print JSON instead of a human-readable report.
  --help              Show this help.

The report intentionally excludes raw generated prompt content.`);
}

await main();
