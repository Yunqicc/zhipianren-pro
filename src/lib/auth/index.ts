import { betterAuth } from "better-auth";
import { Pool } from "pg";
import { getEnv } from "@/lib/env";

const env = getEnv();

export const auth = betterAuth({
  database: new Pool({
    connectionString: env.database.url,
    ssl: env.database.url.includes("neon.tech")
      ? { rejectUnauthorized: false }
      : undefined,
  }),
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  baseURL: env.auth.url,
  secret: env.auth.secret,
});

export type Auth = typeof auth;
