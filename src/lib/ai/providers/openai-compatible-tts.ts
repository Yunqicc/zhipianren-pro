import type { TTSProvider } from "@/types/ai";
import { getEnv } from "@/lib/env";

export class OpenAICompatibleTTSProvider implements TTSProvider {
  async synthesize(params: { text: string; voiceId?: string }): Promise<Buffer> {
    const env = getEnv();
    const { tts } = env;

    const baseUrl = tts.baseUrl.replace(/\/+$/, "");

    const body = {
      model: tts.model,
      input: params.text,
      voice: params.voiceId ?? "alloy",
      response_format: "mp3",
      speed: 1.0,
    };

    const response = await fetch(`${baseUrl}/audio/speech`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tts.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`TTS API error: ${response.status} ${errText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}
