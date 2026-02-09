import * as fs from "node:fs";
import * as path from "node:path";
import * as ExcelJS from "exceljs";
import { parse as csvParse } from "csv-parse";

import { validationNWC } from "./handlers/validationNWC";
import { validationOther } from "./handlers/validationOther";
import { validationProofLink } from "./handlers/validationProofLink";
import { validationTitlePlSummary } from "./handlers/validationTitlePlSummary";
import type { LineType, RuleHandler, ValidationResult } from "./types";
import { SUB_RULES_ENUM } from "./types";

/**
 * Validation handlers selected by sub_status (strategy pattern)
 */
const handlers: Record<SUB_RULES_ENUM, RuleHandler> = {
  [SUB_RULES_ENUM.TITLE_PL_SUMMARY]: validationTitlePlSummary,
  [SUB_RULES_ENUM.PROOFLINK]: validationProofLink,
  [SUB_RULES_ENUM.NWC]: validationNWC,
  [SUB_RULES_ENUM.OTHER]: validationOther,
};

/**
 * Calls the correct validation handler and handles errors safely
 */
const validateLine = (line: LineType): ValidationResult => {
  const subStatusRaw = line.sub_status ?? "";
  const subStatus = subStatusRaw as SUB_RULES_ENUM;
  const handler = handlers[subStatus];

  if (!handler) {
    return { result: "RECHECK", comment: `Unknown sub_status: ${subStatusRaw}` };
  }

  try {
    const res = handler(line);

    if (!res || typeof res !== "object" || !("result" in res)) {
      return {
        result: "RECHECK",
        comment: `Handler returned empty result for sub_status: ${subStatusRaw}`,
      };
    }

    return res;
  } catch (e: any) {
    return {
      result: "RECHECK",
      comment: `Handler error for sub_status: ${subStatusRaw}: ${e?.message ?? String(e)}`,
    };
  }
};

/**
 * Normalize column header to a standard format
 */
const normalizeHeader = (h: string) => {
  return h.trim().toLowerCase().replace(/\s+/g, "_");
}

const REQUIRED_COLUMNS: (keyof LineType)[] = [
  "first_name",
  "last_name",
  "company",
  "title",
  "prooflink",
  "location",
  "status",
  "email",
  "employees",
  "employees_prooflink",
  "industry",
  "req",
  "sub_status",
];

/**
 * Makes sure row have all required fields, missing ones set to empty
 */
const ensureLine = (obj: Record<string, string>): LineType => {
  const line: any = {};
  for (const k of REQUIRED_COLUMNS) line[k] = obj[k as string] ?? "";
  return line as LineType;
}

/**
 * Asyncronous generator function that reads CSV file line by line and return rows one by one
 */
async function* readCsv(inputPath: string): AsyncIterable<LineType> {
  const stream = fs.createReadStream(inputPath);
  const parser = stream.pipe(
    csvParse({
      columns: (headers) => headers.map(normalizeHeader),
      relax_quotes: true,
      relax_column_count: true,
      trim: true,
      skip_empty_lines: true,
    })
  );

  for await (const record of parser) {

    yield ensureLine(record);
  }
}

/**
 * Asyncronous generator function that reads XLSX file line by line and return rows one by one
 */
async function* readXlsx(inputPath: string): AsyncIterable<LineType> {
  const wb = new ExcelJS.stream.xlsx.WorkbookReader(inputPath, {
    worksheets: "emit",
    sharedStrings: "cache",
    hyperlinks: "emit",
    styles: "cache",
  });

  for await (const ws of wb) {
    let headers: string[] | null = null;

    for await (const row of ws) {
      const values = row.values as any[];
      const cells = values.slice(1).map((v) => (v ?? "").toString());

      if (!headers) {
        headers = cells.map(normalizeHeader);
        continue;
      }

      const rec: Record<string, string> = {};
      for (let i = 0; i < headers.length; i++) {
        rec[headers[i]] = cells[i] ?? "";
      }

      yield ensureLine(rec);
    }

    break; // first worksheet
  }
}

/**
 * Write rows to xlsx file one by one without loading all data to memory
 */
async function writeXlsx(
  outputPath: string,
  rows: AsyncIterable<LineType>
): Promise<void> {
  const wb = new ExcelJS.stream.xlsx.WorkbookWriter({
    filename: outputPath,
    useStyles: false,
    useSharedStrings: true,
  });

  const ws = wb.addWorksheet("Result");

  const header = [...REQUIRED_COLUMNS, "result", "comment"] as const;
  ws.addRow(header).commit();

  for await (const line of rows) {
    const res = validateLine(line);

    const outRow = [
      line.first_name,
      line.last_name,
      line.company,
      line.title,
      line.prooflink,
      line.location,
      line.status,
      line.email,
      line.employees,
      line.employees_prooflink,
      line.industry,
      line.req,
      line.sub_status,
      res.result,
      res.comment ?? "",
    ];

    ws.addRow(outRow).commit();
  }

  ws.commit();
  await wb.commit();
}

const main = async () => {
  const inputPath = process.argv[2];
  if (!inputPath) {
    console.error("Usage: npm run dev -- <input.csv|input.xlsx> [output.xlsx]");
    process.exit(1);
  }

  const outputPath = process.argv[3] ?? "output.xlsx";
  const ext = path.extname(inputPath).toLowerCase();

  let reader: AsyncIterable<LineType>;
  
  if (ext === ".csv") {
    reader = readCsv(inputPath);
  } else if (ext === ".xlsx") {
    reader = readXlsx(inputPath);
  } else {
    console.error(`Unsupported input extension: ${ext}`);
    process.exit(1);
  }

  await writeXlsx(outputPath, reader);
  console.log(`Done. Output written to: ${outputPath}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});