import { mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, extname, join, relative } from "node:path";

import { validateGeneratedAiOutputPayload } from "../content/ai-generated-output";

const defaultInputDirectory = "ai-workbench/generated";
const defaultReportPath = "ai-workbench/reports/latest-validation.json";

interface FileReport {
  readonly file: string;
  readonly status: "valid" | "invalid";
  readonly questionCount: number;
  readonly errors: readonly string[];
}

interface ValidationRunReport {
  readonly generatedAt: string;
  readonly inputDirectory: string;
  readonly filesChecked: number;
  readonly validFiles: number;
  readonly invalidFiles: number;
  readonly files: readonly FileReport[];
}

async function main(): Promise<void> {
  const inputDirectory = process.argv[2] ?? defaultInputDirectory;
  const reportPath = process.argv[3] ?? defaultReportPath;
  const files = await listJsonFiles(inputDirectory);
  const reports = await Promise.all(
    files.map((file) => validateFile(inputDirectory, file)),
  );
  const invalidFiles = reports.filter((report) => report.status === "invalid");
  const runReport: ValidationRunReport = {
    generatedAt: new Date().toISOString(),
    inputDirectory,
    filesChecked: reports.length,
    validFiles: reports.length - invalidFiles.length,
    invalidFiles: invalidFiles.length,
    files: reports,
  };

  await mkdir(dirname(reportPath), { recursive: true });
  await writeFile(reportPath, `${JSON.stringify(runReport, null, 2)}\n`);

  console.log(
    `AI output validation: ${runReport.validFiles}/${runReport.filesChecked} files valid.`,
  );
  console.log(`Report written to ${reportPath}`);

  if (invalidFiles.length > 0) {
    for (const report of invalidFiles) {
      console.error(`${report.file}: ${report.errors.join("; ")}`);
    }

    process.exitCode = 1;
  }
}

async function validateFile(
  inputDirectory: string,
  file: string,
): Promise<FileReport> {
  try {
    const raw = await readFile(file, "utf8");
    const payload = JSON.parse(raw) as unknown;
    const result = validateGeneratedAiOutputPayload(payload);

    return {
      file: relative(inputDirectory, file),
      status: result.status,
      questionCount: result.questionCount,
      errors: result.errors,
    };
  } catch (error) {
    return {
      file: relative(inputDirectory, file),
      status: "invalid",
      questionCount: 0,
      errors: [error instanceof Error ? error.message : String(error)],
    };
  }
}

async function listJsonFiles(directory: string): Promise<readonly string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nestedFiles = await Promise.all(
    entries.map(async (entry) => {
      const path = join(directory, entry.name);

      if (entry.isDirectory()) {
        return listJsonFiles(path);
      }

      return extname(entry.name).toLowerCase() === ".json" ? [path] : [];
    }),
  );

  return nestedFiles.flat().sort();
}

await main();
