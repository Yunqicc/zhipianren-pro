import type { LLMProvider, LLMMessage } from "@/types/ai";
import { getEnv } from "@/lib/env";

export class VolcengineLLMProvider implements LLMProvider {
  async *chat(params: {
    systemPrompt: string;
    messages: LLMMessage[];
    stream?: boolean;
  }): AsyncGenerator<string> {
    const env = getEnv();
    const { volcengine } = env;

    const formattedMessages = [
      { role: "system" as const, content: params.systemPrompt },
      ...params.messages,
    ];

    const body = {
      model: volcengine.llmEndpointId,
      messages: formattedMessages,
      stream: true,
      temperature: 0.85,
      top_p: 0.9,
      max_tokens: 1024,
    };

    const response = await fetch(
      `https://ark.cn-beijing.volces.com/api/v3/chat/completions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${volcengine.accessKey}`,
        },
        body: JSON.stringify(body),
      }
    );

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Volcengine LLM error: ${response.status} ${errText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.startsWith("data: ")) continue;

        const data = trimmed.slice(6);
        if (data === "[DONE]") return;

        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            yield content;
          }
        } catch {
          // skip malformed
        }
      }
    }
  }
}
