import type { TTSProvider } from "@/types/ai";
import { getEnv } from "@/lib/env";

export class OpenAICompatibleTTSProvider implements TTSProvider {
  async synthesize(params: { text: string; voiceId?: string; instructions?: string }): Promise<Buffer> {
    const env = getEnv();
    const { tts } = env;

    const baseUrl = tts.baseUrl.replace(/\/+$/, "");

    const body: Record<string, unknown> = {
      model: tts.model,
      input: params.text,
      voice: params.voiceId ?? "nova",
      response_format: "mp3",
      speed: 1.0,
    };

    if (params.instructions) {
      body.instructions = params.instructions;
    }

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
