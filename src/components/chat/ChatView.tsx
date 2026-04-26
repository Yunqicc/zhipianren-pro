"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useChat } from "@/lib/hooks/use-chat";
import { MessageBubble, StreamingBubble } from "@/components/chat/MessageBubble";
import { AffectionBar } from "@/components/chat/AffectionBar";
import type { ChatMessage } from "@/lib/hooks/use-chat";

interface Conversation {
  id: string;
  title: string | null;
  lastMessageAt: string | null;
  startedAt: string | null;
}

interface ChatPageProps {
  characterCode: string;
  characterName: string;
  characterEmoji: string;
}

export default function ChatView({
  characterCode,
  characterName,
  characterEmoji,
}: ChatPageProps) {
  const [input, setInput] = useState("");
  const [affectionScore, setAffectionScore] = useState(35);
  const [historyConvId, setHistoryConvId] = useState<string | undefined>();
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [showConvList, setShowConvList] = useState(false);
  const [historyLoaded, setHistoryLoaded] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const prevScrollHeightRef = useRef(0);

  const {
    messages,
    isStreaming,
    streamingText,
    error,
    sendMessage,
    stopStreaming,
    loadMessages,
    prependMessages,
  } = useChat({ characterCode, conversationId: historyConvId });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingText]);

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch(`/api/chat/history?characterCode=${characterCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data.affectionScore != null) {
            setAffectionScore(data.affectionScore);
          }
          if (data.activeConversationId) {
            setHistoryConvId(data.activeConversationId);
          }
          if (data.conversations) {
            setConversations(
              data.conversations.map((c: Record<string, unknown>) => ({
                id: String(c.id),
                title: c.title ? String(c.title) : null,
                lastMessageAt: c.last_message_at ? String(c.last_message_at) : null,
                startedAt: c.started_at ? String(c.started_at) : null,
              }))
            );
          }
          setHasMore(data.hasMore ?? false);
          if (data.messages && data.messages.length > 0) {
            const historyMsgs = data.messages.map(
              (m: Record<string, unknown>, i: number) => ({
                id: String(m.id ?? `hist-${i}`),
                sender: m.sender_type === "user" ? ("user" as const) : ("character" as const),
                content: String(m.content_text ?? ""),
                type: String(m.message_type ?? "text") as "text" | "audio" | "image",
                audioUrl: m.audio_url ? String(m.audio_url) : undefined,
                imageUrl: m.image_url ? String(m.image_url) : undefined,
                createdAt: m.created_at ? new Date(String(m.created_at)) : new Date(),
                sequenceNo: m.sequence_no ? Number(m.sequence_no) : undefined,
              })
            );
            loadMessages(historyMsgs);
          }
        }
      } catch {
        // ignore
      } finally {
        setHistoryLoaded(true);
      }
    }
    loadHistory();
  }, [characterCode, loadMessages]);

  const loadOlderMessages = useCallback(async () => {
    if (loadingMore || !hasMore || !historyConvId) return;

    const firstMsg = messages.find((m) => m.sequenceNo != null);
    if (!firstMsg?.sequenceNo) return;

    setLoadingMore(true);
    prevScrollHeightRef.current = scrollRef.current?.scrollHeight ?? 0;

    try {
      const res = await fetch(
        `/api/chat/history?characterCode=${characterCode}&conversationId=${historyConvId}&beforeSeq=${firstMsg.sequenceNo}`
      );
      if (res.ok) {
        const data = await res.json();
        setHasMore(data.hasMore ?? false);
        if (data.messages && data.messages.length > 0) {
          const olderMsgs: ChatMessage[] = data.messages.map(
            (m: Record<string, unknown>, i: number) => ({
              id: String(m.id ?? `old-${i}`),
              sender: m.sender_type === "user" ? ("user" as const) : ("character" as const),
              content: String(m.content_text ?? ""),
              type: String(m.message_type ?? "text") as "text" | "audio" | "image",
              audioUrl: m.audio_url ? String(m.audio_url) : undefined,
              imageUrl: m.image_url ? String(m.image_url) : undefined,
              createdAt: m.created_at ? new Date(String(m.created_at)) : new Date(),
              sequenceNo: m.sequence_no ? Number(m.sequence_no) : undefined,
            })
          );
          prependMessages(olderMsgs);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingMore(false);
      requestAnimationFrame(() => {
        if (scrollRef.current) {
          const newHeight = scrollRef.current.scrollHeight;
          scrollRef.current.scrollTop = newHeight - prevScrollHeightRef.current;
        }
      });
    }
  }, [loadingMore, hasMore, historyConvId, messages, characterCode, prependMessages]);

  const handleScroll = useCallback(() => {
    if (!scrollRef.current) return;
    const { scrollTop } = scrollRef.current;
    if (scrollTop < 100 && hasMore && !loadingMore && historyLoaded) {
      loadOlderMessages();
    }
  }, [hasMore, loadingMore, loadOlderMessages, historyLoaded]);

  const switchConversation = useCallback(
    async (convId: string) => {
      setShowConvList(false);
      setHistoryConvId(convId);
      setHistoryLoaded(false);

      try {
        const res = await fetch(
          `/api/chat/history?characterCode=${characterCode}&conversationId=${convId}`
        );
        if (res.ok) {
          const data = await res.json();
          setHasMore(data.hasMore ?? false);
          if (data.messages && data.messages.length > 0) {
            const historyMsgs = data.messages.map(
              (m: Record<string, unknown>, i: number) => ({
                id: String(m.id ?? `hist-${i}`),
                sender: m.sender_type === "user" ? ("user" as const) : ("character" as const),
                content: String(m.content_text ?? ""),
                type: String(m.message_type ?? "text") as "text" | "audio" | "image",
                audioUrl: m.audio_url ? String(m.audio_url) : undefined,
                imageUrl: m.image_url ? String(m.image_url) : undefined,
                createdAt: m.created_at ? new Date(String(m.created_at)) : new Date(),
                sequenceNo: m.sequence_no ? Number(m.sequence_no) : undefined,
              })
            );
            loadMessages(historyMsgs);
          } else {
            loadMessages([]);
          }
        }
      } catch {
        // ignore
      } finally {
        setHistoryLoaded(true);
      }
    },
    [characterCode, loadMessages]
  );

  function handleSend() {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    sendMessage(text);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function formatDate(dateStr: string | null) {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = d.toDateString() === yesterday.toDateString();

    if (isToday) return `今天 ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    if (isYesterday) return `昨天 ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
  }

  return (
    <div className="flex flex-col h-dvh bg-gradient-to-b from-pink-50/50 to-white safe-area-inset">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-pink-100 bg-white/80 backdrop-blur-sm shrink-0 [padding-top-env(safe-area-inset-top)]">
        <a
          href="/"
          className="text-gray-400 hover:text-gray-600 transition-colors -ml-1 p-1"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m15 18-6-6 6-6" />
          </svg>
        </a>
        <div className="w-9 h-9 bg-pink-100 rounded-full flex items-center justify-center text-lg">
          {characterEmoji}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-sm font-semibold text-gray-900 truncate">
            {characterName}
          </h1>
          <AffectionBar score={affectionScore} compact />
        </div>
        {conversations.length > 1 && (
          <button
            onClick={() => setShowConvList(!showConvList)}
            className="text-gray-400 hover:text-gray-600 transition-colors p-1"
            title="历史会话"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </button>
        )}
      </header>

      {showConvList && (
        <div className="border-b border-pink-100 bg-white/90 backdrop-blur-sm shrink-0 max-h-48 overflow-y-auto">
          {conversations.map((conv) => (
            <button
              key={conv.id}
              onClick={() => switchConversation(conv.id)}
              className={`w-full text-left px-4 py-2.5 text-sm border-b border-gray-50 hover:bg-pink-50 transition-colors ${
                conv.id === historyConvId ? "bg-pink-50 text-pink-700" : "text-gray-600"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="truncate">
                  {conv.title ?? "对话"}
                </span>
                <span className="text-xs text-gray-400 ml-2 shrink-0">
                  {formatDate(conv.lastMessageAt)}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 scroll-smooth"
      >
        {loadingMore && (
          <div className="text-center text-xs text-gray-400 py-2">
            加载更多...
          </div>
        )}

        {messages.length === 0 && !isStreaming && historyLoaded && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center text-2xl mb-4">
              {characterEmoji}
            </div>
            <p className="text-gray-400 text-sm">
              和{characterName}说点什么吧
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={msg.id}>
            {shouldShowTimeDivider(messages, idx) && (
              <div className="text-center text-xs text-gray-300 my-3">
                {formatTimeDivider(msg.createdAt)}
              </div>
            )}
            <MessageBubble message={msg} />
          </div>
        ))}

        {isStreaming && <StreamingBubble text={streamingText} />}

        {error && (
          <div className="text-center text-sm text-red-400 py-2">{error}</div>
        )}

        <div ref={bottomRef} />
      </div>

      <AffectionBar score={affectionScore} />

      <div className="shrink-0 border-t border-pink-100 bg-white px-4 py-3 [padding-bottom-env(safe-area-inset-bottom)]">
        <div className="flex items-end gap-2 max-w-2xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 max-h-32 bg-gray-50/50"
            style={{ minHeight: "42px" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = Math.min(el.scrollHeight, 128) + "px";
            }}
          />
          {isStreaming ? (
            <button
              onClick={stopStreaming}
              className="shrink-0 w-10 h-10 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center hover:bg-gray-300 transition-colors"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <rect x="6" y="6" width="12" height="12" rx="1" />
              </svg>
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="shrink-0 w-10 h-10 rounded-full bg-pink-500 text-white flex items-center justify-center hover:bg-pink-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m22 2-7 20-4-9-9-4Z" />
                <path d="M22 2 11 13" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function shouldShowTimeDivider(messages: ChatMessage[], idx: number): boolean {
  if (idx === 0) return false;
  const prev = messages[idx - 1].createdAt;
  const curr = messages[idx].createdAt;
  const diff = curr.getTime() - prev.getTime();
  return diff > 5 * 60 * 1000;
}

function formatTimeDivider(date: Date): string {
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const time = `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;

  if (isToday) return time;
  if (isYesterday) return `昨天 ${time}`;
  return `${date.getMonth() + 1}月${date.getDate()}日 ${time}`;
}
