import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const csvPath = path.resolve(rootDir, "data.csv");
const storageDir = path.resolve(rootDir, "storage");
const dbPath = path.resolve(storageDir, "pricing-monitor.db");

if (!fs.existsSync(csvPath)) {
  throw new Error(`Cannot find CSV file at ${csvPath}`);
}

fs.mkdirSync(storageDir, { recursive: true });

if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const sql = `
PRAGMA journal_mode = WAL;
PRAGMA synchronous = NORMAL;
DROP TABLE IF EXISTS pricing_records;
CREATE TABLE pricing_records (
  DIVISION_NAME TEXT,
  FC_NAME TEXT,
  SECT_NAME TEXT,
  SITE_NO TEXT,
  SITE_NAME TEXT,
  SEGMENT TEXT,
  CREATE_DATE TEXT,
  DISCOUNT_DATE TEXT,
  FUTURE_DISCOUNT_DATE TEXT,
  DP_DATE TEXT,
  DISCOUNT_TYPE TEXT,
  COUNTSITE REAL,
  SUMQ REAL,
  NP_AVG REAL,
  NETCON REAL,
  DC_AVG REAL,
  LP_AVG REAL,
  CHANNEL TEXT,
  CUSTOMER_NO TEXT,
  CUSTOMER_NAME TEXT,
  CUSTOMER_MEMBER_TYPE TEXT,
  SUBCUSTOMER_NO TEXT,
  SUBCUSTOMER_NAME TEXT,
  SUBCUSTOMER_MEMBER_TYPE TEXT
);
.mode csv
.import --skip 1 "${csvPath}" pricing_records
CREATE INDEX idx_pricing_site_date ON pricing_records (SITE_NO, DP_DATE);
CREATE INDEX idx_pricing_date ON pricing_records (DP_DATE);
CREATE INDEX idx_pricing_site_name ON pricing_records (SITE_NAME);
`;

execFileSync("sqlite3", [dbPath], {
  cwd: rootDir,
  input: sql,
  stdio: ["pipe", "inherit", "inherit"]
});

console.log(`SQLite database created at ${dbPath}`);
