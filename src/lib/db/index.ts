import postgres from "postgres";
import { getEnv } from "@/lib/env";

let sql: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (!sql) {
    const env = getEnv();
    sql = postgres(env.database.url);
  }
  return sql;
}

export async function closeDb() {
  if (sql) {
    await sql.end();
    sql = null;
  }
}
