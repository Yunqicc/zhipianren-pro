import { betterAuth } from "better-auth";
import { getEnv } from "@/lib/env";

export const auth = betterAuth({
  database: {
    connectionString: getEnv().database.url,
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  baseURL: getEnv().auth.url,
  secret: getEnv().auth.secret,
});

export type Auth = typeof auth;
