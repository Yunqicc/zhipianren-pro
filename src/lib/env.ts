const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  database: {
    url: process.env.DATABASE_URL ?? "",
  },
  auth: {
    secret: process.env.BETTER_AUTH_SECRET ?? "dev-secret-change-in-production",
    url: process.env.BETTER_AUTH_URL ?? "http://localhost:3000",
  },
  llm: {
    baseUrl: process.env.LLM_BASE_URL ?? "",
    apiKey: process.env.LLM_API_KEY ?? "",
    model: process.env.LLM_MODEL ?? "",
  },
  tts: {
    baseUrl: process.env.TTS_BASE_URL ?? "",
    apiKey: process.env.TTS_API_KEY ?? "",
    model: process.env.TTS_MODEL ?? "",
  },
  volcengine: {
    accessKey: process.env.VOLC_ACCESS_KEY ?? "",
    secretKey: process.env.VOLC_SECRET_KEY ?? "",
    llmEndpointId: process.env.VOLC_LLM_ENDPOINT_ID ?? "",
    ttsAppId: process.env.VOLC_TTS_APP_ID ?? "",
    imageApiKey: process.env.VOLC_IMAGE_API_KEY ?? "",
  },
  r2: {
    accountId: process.env.R2_ACCOUNT_ID ?? "",
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
    bucketName: process.env.R2_BUCKET_NAME ?? "",
    publicUrl: process.env.R2_PUBLIC_URL ?? "",
  },
} as const;

export type Env = typeof env;

export function getEnv() {
  return env;
}

export function isDev(): boolean {
  return env.nodeEnv === "development";
}

export function isProd(): boolean {
  return env.nodeEnv === "production";
}

export function isLLMConfigured(): boolean {
  return !!(env.llm.baseUrl && env.llm.apiKey && env.llm.model);
}

export function isTTSConfigured(): boolean {
  return !!(env.tts.baseUrl && env.tts.apiKey && env.tts.model);
}

export function isAIConfigured(): boolean {
  return isLLMConfigured();
}

export function isStorageConfigured(): boolean {
  const { r2: r } = env;
  return !!(r.accountId && r.accessKeyId && r.secretAccessKey && r.bucketName);
}

export function isDatabaseConfigured(): boolean {
  return !!env.database.url;
}
