import type { LLMProvider, TTSProvider, ImageProvider } from "@/types/ai";
import { isAIConfigured, isTTSConfigured } from "@/lib/env";
import { MockLLMProvider } from "./providers/mock-llm";
import { MockTTSProvider } from "./providers/mock-tts";
import { MockImageProvider } from "./providers/mock-image";
import { OpenAICompatibleLLMProvider } from "./providers/openai-compatible-llm";
import { OpenAICompatibleTTSProvider } from "./providers/openai-compatible-tts";
import { VolcengineTTSProvider } from "./providers/volcengine-tts";
import { VolcengineImageProvider } from "./providers/volcengine-image";

let llmProvider: LLMProvider | null = null;
let ttsProvider: TTSProvider | null = null;
let imageProvider: ImageProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (!llmProvider) {
    if (isAIConfigured()) {
      llmProvider = new OpenAICompatibleLLMProvider();
    } else {
      llmProvider = new MockLLMProvider();
    }
  }
  return llmProvider;
}

export function getTTSProvider(): TTSProvider {
  if (!ttsProvider) {
    if (isTTSConfigured()) {
      ttsProvider = new OpenAICompatibleTTSProvider();
    } else {
      ttsProvider = new MockTTSProvider();
    }
  }
  return ttsProvider;
}

export function getImageProvider(): ImageProvider {
  if (!imageProvider) {
    imageProvider = new MockImageProvider();
  }
  return imageProvider;
}

export function resetProviders() {
  llmProvider = null;
  ttsProvider = null;
  imageProvider = null;
}
