import type { LLMProvider } from "@/types/ai";

export class MockLLMProvider implements LLMProvider {
  async *chat({ messages }: { systemPrompt: string; messages: { role: string; content: string }[]; stream?: boolean }): AsyncGenerator<string> {
    const lastUserMsg = messages.filter((m) => m.role === "user").pop();
    const userText = lastUserMsg?.content ?? "";

    const response = `（轻轻笑了一下）嗯……你说的是"${userText.slice(0, 20)}"对吧？我听到啦～[SPLIT]不过我现在还在调试中，等我上线了再好好陪你聊天吧！`;

    const chars = response.split("");
    for (const char of chars) {
      yield char;
      await new Promise((r) => setTimeout(r, 30));
    }
  }
}
