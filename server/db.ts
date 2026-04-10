import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, "../storage/pricing-monitor.db");

export const db = new Database(dbPath, {
  readonly: false,
  fileMustExist: true
});

db.pragma("journal_mode = WAL");
