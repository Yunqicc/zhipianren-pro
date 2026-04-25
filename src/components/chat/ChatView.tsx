"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@/lib/hooks/use-chat";
import { MessageBubble, StreamingBubble } from "@/components/chat/MessageBubble";
import { AffectionBar } from "@/components/chat/AffectionBar";

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
  const {
    messages,
    isStreaming,
    streamingText,
    error,
    sendMessage,
    stopStreaming,
  } = useChat({ characterCode });

  const [input, setInput] = useState("");
  const [affectionScore, setAffectionScore] = useState(35);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingText]);

  useEffect(() => {
    async function loadAffection() {
      try {
        const res = await fetch(`/api/chat/history?characterCode=${characterCode}`);
        if (res.ok) {
          const data = await res.json();
          if (data.affectionScore != null) {
            setAffectionScore(data.affectionScore);
          }
        }
      } catch {
        // ignore
      }
    }
    loadAffection();
  }, [characterCode]);

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

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-pink-50/50 to-white">
      <header className="flex items-center gap-3 px-4 py-3 border-b border-pink-100 bg-white/80 backdrop-blur-sm shrink-0">
        <a
          href="/"
          className="text-gray-400 hover:text-gray-600 transition-colors"
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
        <div className="flex-1">
          <h1 className="text-sm font-semibold text-gray-900">
            {characterName}
          </h1>
          <AffectionBar score={affectionScore} compact />
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 && !isStreaming && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center text-2xl mb-4">
              {characterEmoji}
            </div>
            <p className="text-gray-400 text-sm">
              和{characterName}说点什么吧
            </p>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}

        {isStreaming && <StreamingBubble text={streamingText} />}

        {error && (
          <div className="text-center text-sm text-red-400 py-2">{error}</div>
        )}
      </div>

      <AffectionBar score={affectionScore} />

      <div className="shrink-0 border-t border-pink-100 bg-white px-4 py-3">
        <div className="flex items-end gap-2 max-w-2xl mx-auto">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息..."
            rows={1}
            className="flex-1 resize-none rounded-2xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pink-300 focus:border-pink-300 max-h-32"
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
