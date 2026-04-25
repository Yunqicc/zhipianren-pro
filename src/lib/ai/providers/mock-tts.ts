import type { TTSProvider } from "@/types/ai";

export class MockTTSProvider implements TTSProvider {
  async synthesize(): Promise<Buffer> {
    return Buffer.from("mock-audio-data");
  }
}
