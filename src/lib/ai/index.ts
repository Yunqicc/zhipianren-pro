import type { LLMProvider, TTSProvider, ImageProvider } from "@/types/ai";
import { isAIConfigured } from "@/lib/env";
import { MockLLMProvider } from "./providers/mock-llm";
import { MockTTSProvider } from "./providers/mock-tts";
import { MockImageProvider } from "./providers/mock-image";

let llmProvider: LLMProvider | null = null;
let ttsProvider: TTSProvider | null = null;
let imageProvider: ImageProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (!llmProvider) {
    if (isAIConfigured()) {
      throw new Error("Volcengine LLM provider not implemented yet");
    }
    llmProvider = new MockLLMProvider();
  }
  return llmProvider;
}

export function getTTSProvider(): TTSProvider {
  if (!ttsProvider) {
    if (isAIConfigured()) {
      throw new Error("Volcengine TTS provider not implemented yet");
    }
    ttsProvider = new MockTTSProvider();
  }
  return ttsProvider;
}

export function getImageProvider(): ImageProvider {
  if (!imageProvider) {
    if (isAIConfigured()) {
      throw new Error("Volcengine Image provider not implemented yet");
    }
    imageProvider = new MockImageProvider();
  }
  return imageProvider;
}
