import postgres from "postgres";
import fs from "fs";
import path from "path";
import { config } from "dotenv";

const envLocalPath = path.resolve(process.cwd(), ".env.local");
const envPath = path.resolve(process.cwd(), ".env");

if (fs.existsSync(envLocalPath)) {
  config({ path: envLocalPath, override: true });
}
config({ path: envPath });

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL is not set. Check .env.local or .env.production");
    process.exit(1);
  }

  const envLabel = process.env.NODE_ENV || "development";
  console.log(`Environment: ${envLabel}`);
  console.log(`Database: ${new URL(dbUrl).pathname.replace("/", "")}`);

  const sql = postgres(dbUrl, { ssl: "require" });

  try {
    console.log("\nConnected. Checking BetterAuth tables...");

    const [userTable] = await sql`
      SELECT EXISTS (
        SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'user'
      ) as exists
    `;

    if (!userTable.exists) {
      console.log("BetterAuth tables not found. Run 'npx @better-auth/cli migrate' first.");
      process.exit(1);
    }
    console.log("BetterAuth tables OK.");

    console.log("\nCreating business tables...");
    const schemaPath = path.join(process.cwd(), "src/lib/db/schema.sql");
    const schema = fs.readFileSync(schemaPath, "utf-8");
    await sql.unsafe(schema);
    console.log("Business tables created.");

    console.log("\nVerifying...");
    const tables = await sql`
      SELECT tablename FROM pg_tables 
      WHERE schemaname = 'public' ORDER BY tablename
    `;
    console.log("Tables:", tables.map((t) => t.tablename).join(", "));

    const charCount = await sql`SELECT count(*) as cnt FROM characters`;
    console.log(`Characters: ${charCount[0].cnt}`);
  } catch (err) {
    console.error("Migration failed:", err);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

main();
