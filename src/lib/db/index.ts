import { drizzle } from "drizzle-orm/sqlite-proxy";
import Database from "@tauri-apps/plugin-sql";
import * as schema from "./schema";

type Db = ReturnType<typeof drizzle<typeof schema>>;

let _db: Db | null = null;

export async function getDb(): Promise<Db> {
  if (_db) return _db;
  const sqlite = await Database.load("sqlite:moss.db");
  _db = drizzle(
    async (sql, params, method) => {
      if (method === "run") {
        await sqlite.execute(sql, params as unknown[]);
        return { rows: [] };
      }
      const rows = await sqlite.select<Record<string, unknown>[]>(
        sql,
        params as unknown[],
      );
      const mapped = rows.map((row) => Object.values(row));
      if (method === "get") return { rows: mapped[0] ?? [] }; // single flat row
      return { rows: mapped }; // 'all' | 'values'
    },
    { schema },
  );
  return _db;
}
