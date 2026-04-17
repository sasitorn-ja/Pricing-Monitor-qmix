import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { type PricingRecord } from "./analytics.js";

const columns = [
  "DIVISION_NAME",
  "FC_NAME",
  "SECT_NAME",
  "SITE_NO",
  "SITE_NAME",
  "SEGMENT",
  "CREATE_DATE",
  "DISCOUNT_DATE",
  "FUTURE_DISCOUNT_DATE",
  "DP_DATE",
  "DISCOUNT_TYPE",
  "COUNTSITE",
  "SUMQ",
  "NP_AVG",
  "NETCON",
  "DC_AVG",
  "LP_AVG",
  "CHANNEL",
  "CUSTOMER_NO",
  "CUSTOMER_NAME",
  "CUSTOMER_MEMBER_TYPE",
  "SUBCUSTOMER_NO",
  "SUBCUSTOMER_NAME",
  "SUBCUSTOMER_MEMBER_TYPE"
] as const;

const numericColumns = new Set([
  "COUNTSITE",
  "SUMQ",
  "NP_AVG",
  "NETCON",
  "DC_AVG",
  "LP_AVG"
]);

export function getCsvPath() {
  const customPath = process.env.DATA_CSV_PATH?.trim();

  if (customPath) {
    return path.isAbsolute(customPath)
      ? customPath
      : path.resolve(process.cwd(), customPath);
  }

  return path.resolve(process.cwd(), "data.csv");
}

function parseCsvLine(line: string) {
  const values: string[] = [];
  let current = "";
  let index = 0;
  let inQuotes = false;

  while (index < line.length) {
    const character = line[index];

    if (inQuotes) {
      if (character === '"') {
        if (line[index + 1] === '"') {
          current += '"';
          index += 2;
          continue;
        }

        inQuotes = false;
        index += 1;
        continue;
      }

      current += character;
      index += 1;
      continue;
    }

    if (character === ",") {
      values.push(current);
      current = "";
      index += 1;
      continue;
    }

    if (character === '"') {
      inQuotes = true;
      index += 1;
      continue;
    }

    current += character;
    index += 1;
  }

  values.push(current);
  return values;
}

function normalizeCell(column: string, value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  if (numericColumns.has(column)) {
    const numberValue = Number(trimmed);
    return Number.isNaN(numberValue) ? null : numberValue;
  }

  return trimmed;
}

function normalizeHeaderCell(value: string) {
  return value.replace(/^\ufeff/, "").trim();
}

function findHeaderIndex(header: string[], column: string) {
  const exactIndex = header.findIndex((item) => normalizeHeaderCell(item) === column);

  if (exactIndex !== -1) {
    return exactIndex;
  }

  return header.findIndex((item) => normalizeHeaderCell(item).endsWith(column));
}

export async function readPricingRecordsFromCsv() {
  const csvPath = getCsvPath();
  const fileStat = await stat(csvPath);
  const raw = await readFile(csvPath, "utf8");
  const lines = raw
    .replace(/^\ufeff/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  if (lines.length < 2) {
    throw new Error(`CSV file at ${csvPath} does not contain any data rows.`);
  }

  const header = parseCsvLine(lines[0]);
  const columnIndexes = columns.map((column) => findHeaderIndex(header, column));
  const missingColumns = columns.filter((_, index) => columnIndexes[index] === -1);

  if (missingColumns.length > 0) {
    throw new Error(
      `CSV file is missing required columns: ${missingColumns.join(", ")}`
    );
  }

  const records = lines.slice(1).map((line, lineIndex) => {
    const values = parseCsvLine(line);
    const record = {} as PricingRecord;

    columns.forEach((column, index) => {
      const csvIndex = columnIndexes[index];
      const rawValue = csvIndex >= 0 ? (values[csvIndex] ?? "") : "";
      record[column] = normalizeCell(column, rawValue) as never;
    });

    if (!record.SITE_NO || !record.DP_DATE) {
      throw new Error(
        `CSV row ${lineIndex + 2} is missing SITE_NO or DP_DATE and cannot be used.`
      );
    }

    return record;
  });

  return {
    csvPath,
    signature: `${fileStat.mtimeMs}:${fileStat.size}`,
    records
  };
}
