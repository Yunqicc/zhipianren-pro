import { betterAuth } from "better-auth";
import { getEnv } from "@/lib/env";

export function createAuth() {
  const env = getEnv();

  return betterAuth({
    database: {
      connectionString: env.database.url,
    },
    emailAndPassword: {
      enabled: true,
    },
    baseURL: env.auth.url,
    secret: env.auth.secret,
  });
}

export type Auth = ReturnType<typeof createAuth>;
