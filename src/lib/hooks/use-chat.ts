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
  voiceText?: string;
  voiceProfile?: { voiceId?: string; instructions?: string } | null;
  photoPrompt?: string | null;
  characterCode?: string;
  message?: string;
}

async function fetchTTSAudio(text: string, voiceProfile?: { voiceId?: string; instructions?: string } | null): Promise<string | null> {
  try {
    const res = await fetch("/api/chat/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, voiceId: voiceProfile?.voiceId, instructions: voiceProfile?.instructions }),
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return URL.createObjectURL(blob);
  } catch {
    return null;
  }
}

async function fetchImage(prompt: string, characterCode: string): Promise<string | null> {
  try {
    const res = await fetch("/api/chat/image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, characterCode }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.imageUrl ?? null;
  } catch {
    return null;
  }
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
                  const lastIdx = event.messages.length - 1;
                  const hasPhoto = !!event.photoPrompt;
                  const charMessages: ChatMessage[] = event.messages.map(
                    (msg, i) => {
                      let msgType: "text" | "audio" | "image" = "text";
                      if (i === lastIdx && event.voiceTriggered) msgType = "audio";
                      if (i === lastIdx && hasPhoto) msgType = "image";
                      return {
                        id: `char-${Date.now()}-${i}`,
                        sender: "character" as const,
                        content: msg,
                        type: msgType,
                        createdAt: new Date(),
                      };
                    }
                  );
                  setMessages((prev) => [...prev, ...charMessages]);

                  if (event.voiceTriggered && event.voiceText) {
                    const voiceText = event.voiceText;
                    const voiceProfile = event.voiceProfile;
                    const lastMsgId = charMessages[lastIdx].id;
                    fetchTTSAudio(voiceText, voiceProfile).then((audioUrl) => {
                      if (audioUrl) {
                        setMessages((prev) =>
                          prev.map((m) =>
                            m.id === lastMsgId ? { ...m, audioUrl } : m
                          )
                        );
                      }
                    });
                  }

                  if (hasPhoto && event.photoPrompt) {
                    const photoPrompt = event.photoPrompt;
                    const lastMsgId = charMessages[lastIdx].id;
                    fetchImage(photoPrompt, characterCode).then((imageUrl) => {
                      if (imageUrl) {
                        setMessages((prev) =>
                          prev.map((m) =>
                            m.id === lastMsgId ? { ...m, imageUrl } : m
                          )
                        );
                      }
                    });
                  }
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
