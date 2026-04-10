declare module "better-sqlite3" {
  type RunResult = {
    changes: number;
    lastInsertRowid: bigint | number;
  };

  interface Statement {
    all(...params: unknown[]): unknown[];
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): RunResult;
  }

  export default class Database {
    constructor(
      filename: string,
      options?: { readonly?: boolean; fileMustExist?: boolean }
    );
    prepare(sql: string): Statement;
    pragma(sql: string): unknown;
  }
}

declare module "cors" {
  import type { RequestHandler } from "express";

  export default function cors(): RequestHandler;
}
