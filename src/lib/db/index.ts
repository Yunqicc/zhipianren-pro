import postgres from "postgres";
import { getEnv } from "@/lib/env";

let sql: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (!sql) {
    const env = getEnv();
    const url = env.database.url;
    const needsSsl = url.includes("neon.tech") || url.includes("sslmode=require");
    sql = postgres(url, {
      ssl: needsSsl ? "require" : undefined,
    });
  }
  return sql;
}

export async function closeDb() {
  if (sql) {
    await sql.end();
    sql = null;
  }
}
