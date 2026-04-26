import type { ImageProvider, ImageGenParams } from "@/types/ai";

export class MockImageProvider implements ImageProvider {
  async generateWithRef(params: ImageGenParams): Promise<string> {
    const text = params.referenceImageUrl
      ? `Mock+Image+(ref)`
      : `Mock+Image`;
    return `https://placehold.co/512x512/FFE4E6/EC4899?text=${text}`;
  }
}
