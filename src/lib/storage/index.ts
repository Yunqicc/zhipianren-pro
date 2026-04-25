import { isStorageConfigured } from "@/lib/env";

export async function uploadToR2(params: {
  key: string;
  data: Buffer;
  contentType: string;
}): Promise<string> {
  if (!isStorageConfigured()) {
    throw new Error("R2 storage is not configured");
  }

  const { key, data, contentType } = params;
  const env = (await import("@/lib/env")).getEnv();
  const { r2 } = env;

  const url = `https://${r2.accountId}.r2.cloudflarestorage.com/${r2.bucketName}/${key}`;

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
      Authorization: `AWS ${r2.accessKeyId}:${r2.secretAccessKey}`,
    },
    body: new Uint8Array(data),
  });

  if (!response.ok) {
    throw new Error(`R2 upload failed: ${response.status}`);
  }

  return `${r2.publicUrl}/${key}`;
}

export function generateStorageKey(prefix: string, ext: string): string {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}/${dateStr}/${random}.${ext}`;
}
