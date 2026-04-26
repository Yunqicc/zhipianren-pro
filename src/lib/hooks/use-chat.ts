"use client";

import { useState, useCallback, useRef } from "react";

interface ChatMessage {
  id: string;
  sender: "user" | "character";
  content: string;
  type: "text" | "audio" | "image";
  audioUrl?: string;
  imageUrl?: string;
  createdAt: Date;
  sequenceNo?: number;
}

interface UseChatOptions {
  characterCode: string;
  conversationId?: string;
}

interface SSEEvent {
  type: "chunk" | "done" | "error";
  content?: string;
  conversationId?: string;
  messages?: string[];
  voiceTriggered?: boolean;
  photoPrompt?: string | null;
  message?: string;
}

export function useChat({ characterCode, conversationId: initialConvId }: UseChatOptions) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [conversationId, setConversationId] = useState(initialConvId);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (text: string) => {
      if (isStreaming || !text.trim()) return;

      setError(null);
      setIsStreaming(true);
      setStreamingText("");

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        sender: "user",
        content: text,
        type: "text",
        createdAt: new Date(),
      };
      setMessages((prev) => [...prev, userMsg]);

      abortRef.current = new AbortController();

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            characterCode,
            message: text,
            conversationId,
          }),
          signal: abortRef.current.signal,
        });

        if (!res.ok) {
          throw new Error(`请求失败: ${res.status}`);
        }

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        if (!reader) throw new Error("无法读取响应流");

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6);
            if (!jsonStr.trim()) continue;

            try {
              const event: SSEEvent = JSON.parse(jsonStr);

              if (event.type === "chunk" && event.content) {
                setStreamingText((prev) => prev + event.content);
              } else if (event.type === "done") {
                if (event.conversationId) {
                  setConversationId(event.conversationId);
                }

                if (event.messages && event.messages.length > 0) {
                  const charMessages: ChatMessage[] = event.messages.map(
                    (msg, i) => ({
                      id: `char-${Date.now()}-${i}`,
                      sender: "character" as const,
                      content: msg,
                      type: "text" as const,
                      createdAt: new Date(),
                    })
                  );
                  setMessages((prev) => [...prev, ...charMessages]);
                }

                setStreamingText("");
              } else if (event.type === "error") {
                setError(event.message ?? "未知错误");
              }
            } catch {
              // skip malformed JSON
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message ?? "发送失败");
        }
      } finally {
        setIsStreaming(false);
        setStreamingText("");
        abortRef.current = null;
      }
    },
    [characterCode, conversationId, isStreaming]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const loadMessages = useCallback((msgs: ChatMessage[]) => {
    setMessages(msgs);
  }, []);

  const prependMessages = useCallback((olderMsgs: ChatMessage[]) => {
    setMessages((prev) => [...olderMsgs, ...prev]);
  }, []);

  return {
    messages,
    isStreaming,
    streamingText,
    conversationId,
    error,
    sendMessage,
    stopStreaming,
    loadMessages,
    prependMessages,
  };
}

export type { ChatMessage };
