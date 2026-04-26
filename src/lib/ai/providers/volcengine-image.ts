import crypto from "crypto";
import type { ImageProvider, ImageGenParams } from "@/types/ai";
import { getEnv } from "@/lib/env";

function hmacSHA256(key: Buffer | string, data: string): Buffer {
  return crypto.createHmac("sha256", key).update(data).digest();
}

function sha256Hex(data: string): string {
  return crypto.createHash("sha256").update(data).digest("hex");
}

function getSignatureHeaders(
  accessKey: string,
  secretKey: string,
  method: string,
  path: string,
  body: string,
  contentType: string
) {
  const service = "cv";
  const region = "cn-north-1";
  const host = "visual.volcengineapi.com";
  const now = new Date();
  const dateStamp = now.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
  const shortDate = dateStamp.slice(0, 8);

  const canonicalQueryString = `Action=CVProcess&Version=2022-08-31`;
  const payloadHash = sha256Hex(body);

  const canonicalHeaders = [
    `content-type:${contentType}`,
    `host:${host}`,
    `x-content-sha256:${payloadHash}`,
    `x-date:${dateStamp}`,
  ].join("\n") + "\n";

  const signedHeaders = "content-type;host;x-content-sha256;x-date";

  const canonicalRequest = [
    method,
    path,
    canonicalQueryString,
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const credentialScope = `${shortDate}/${region}/${service}/request`;
  const stringToSign = [
    "HMAC-SHA256",
    dateStamp,
    credentialScope,
    sha256Hex(canonicalRequest),
  ].join("\n");

  const kDate = hmacSHA256(secretKey, shortDate);
  const kRegion = hmacSHA256(kDate, region);
  const kService = hmacSHA256(kRegion, service);
  const kSigning = hmacSHA256(kService, "request");
  const signature = crypto.createHmac("sha256", kSigning).update(stringToSign).digest("hex");

  return {
    Authorization: `HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`,
    "X-Date": dateStamp,
    "X-Content-Sha256": payloadHash,
  };
}

export class VolcengineImageProvider implements ImageProvider {
  async generateWithRef(params: ImageGenParams): Promise<string> {
    const env = getEnv();
    const { volcengine } = env;

    const body: Record<string, unknown> = {
      req_key: "high_aes_general_v21_L",
      prompt: params.prompt,
      return_url: true,
      logo_info: { add_logo: false },
    };

    if (params.referenceImageUrl) {
      body.image_urls = [params.referenceImageUrl];
      body.strength = params.strength ?? 0.6;
    }

    const bodyStr = JSON.stringify(body);
    const contentType = "application/json";
    const path = "/";
    const sigHeaders = getSignatureHeaders(
      volcengine.accessKey,
      volcengine.secretKey,
      "POST",
      path,
      bodyStr,
      contentType
    );

    const response = await fetch(
      `${volcengine.imageBaseUrl}/?Action=CVProcess&Version=2022-08-31`,
      {
        method: "POST",
        headers: {
          "Content-Type": contentType,
          Host: "visual.volcengineapi.com",
          ...sigHeaders,
        },
        body: bodyStr,
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Volcengine Image error: ${response.status} ${errText}`);
    }

    const result = await response.json();
    const imageUrl =
      result?.data?.image_urls?.[0] ?? result?.data?.image_url;

    if (!imageUrl) {
      throw new Error(
        `Volcengine Image: no image URL in response. Response: ${JSON.stringify(result).substring(0, 300)}`
      );
    }

    return imageUrl;
  }
}
