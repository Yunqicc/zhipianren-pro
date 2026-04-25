export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMChatParams {
  systemPrompt: string;
  messages: LLMMessage[];
  stream?: boolean;
}

export interface LLMProvider {
  chat(params: LLMChatParams): AsyncGenerator<string> | Promise<string>;
}

export interface TTSParams {
  text: string;
  voiceId?: string;
}

export interface TTSProvider {
  synthesize(params: TTSParams): Promise<Buffer>;
}

export interface ImageGenParams {
  prompt: string;
  referenceImageUrl: string;
  strength?: number;
}

export interface ImageProvider {
  generateWithRef(params: ImageGenParams): Promise<string>;
}
