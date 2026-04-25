import type { TTSProvider, TTSParams } from "@/types/ai";
import { getEnv } from "@/lib/env";

export class VolcengineTTSProvider implements TTSProvider {
  async synthesize(params: TTSParams): Promise<Buffer> {
    const env = getEnv();
    const { volcengine } = env;

    const body = {
      app: {
        appid: volcengine.ttsAppId,
        token: "access_token",
      },
      user: {
        uid: "zhipianren_tts",
      },
      audio: {
        voice_type: params.voiceId ?? "zh_female_tianmeixiaoyuan_moon_bigtts",
        encoding: "mp3",
        speed_ratio: 1.0,
      },
      request: {
        reqid: crypto.randomUUID(),
        text: params.text,
        text_type: "plain",
        operation: "query",
      },
    };

    const response = await fetch(
      "https://openspeech.bytedance.com/api/v1/tts",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer;${volcengine.accessKey}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Volcengine TTS error: ${response.status} ${errText}`);
    }

    const result = await response.json();
    if (result.code !== 3000) {
      throw new Error(`Volcengine TTS error: ${result.code} ${result.message}`);
    }

    const audioBase64 = result.data;
    return Buffer.from(audioBase64, "base64");
  }
}
