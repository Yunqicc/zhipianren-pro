import type { ImageProvider, ImageGenParams } from "@/types/ai";
import { getEnv } from "@/lib/env";

export class VolcengineImageProvider implements ImageProvider {
  async generateWithRef(params: ImageGenParams): Promise<string> {
    const env = getEnv();
    const { volcengine } = env;

    const body = {
      req_key: "high_aes_general_v21_L",
      prompt: params.prompt,
      image_urls: [params.referenceImageUrl],
      strength: params.strength ?? 0.6,
      return_url: true,
      logo_info: {
        add_logo: false,
      },
    };

    const response = await fetch(
      "https://visual.volcengineapi.com/",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${volcengine.accessKey}`,
        },
        body: JSON.stringify(body),
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
      throw new Error("Volcengine Image: no image URL in response");
    }

    return imageUrl;
  }
}
