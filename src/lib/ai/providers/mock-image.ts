import type { ImageProvider } from "@/types/ai";

export class MockImageProvider implements ImageProvider {
  async generateWithRef(): Promise<string> {
    return "https://placehold.co/512x512?text=Mock+Image";
  }
}
