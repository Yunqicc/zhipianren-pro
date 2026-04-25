"use client";

import type { ChatMessage } from "@/lib/hooks/use-chat";

function formatContent(text: string) {
  const parts = text.split(/(（[^）]+）)/g);
  return parts.map((part, i) => {
    if (part.startsWith("（") && part.endsWith("）")) {
      return (
        <span key={i} className="text-gray-400 text-xs italic">
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.sender === "user";

  if (isUser) {
    return (
      <div className="flex justify-end mb-3">
        <div className="max-w-[75%] bg-pink-500 text-white px-4 py-2.5 rounded-2xl rounded-br-md text-sm leading-relaxed">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[75%] bg-white border border-gray-100 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm leading-relaxed shadow-sm">
        {message.type === "image" && message.imageUrl && (
          <div className="mb-2">
            <img
              src={message.imageUrl}
              alt="角色发送的图片"
              className="rounded-lg max-w-full"
            />
          </div>
        )}
        {message.type === "audio" && message.audioUrl && (
          <div className="mb-2">
            <audio controls src={message.audioUrl} className="h-8 w-48" />
          </div>
        )}
        <div className="text-gray-800">{formatContent(message.content)}</div>
      </div>
    </div>
  );
}

export function StreamingBubble({ text }: { text: string }) {
  if (!text) return null;

  return (
    <div className="flex justify-start mb-3">
      <div className="max-w-[75%] bg-white border border-gray-100 px-4 py-2.5 rounded-2xl rounded-bl-md text-sm leading-relaxed shadow-sm">
        <div className="text-gray-800">{formatContent(text)}</div>
        <span className="inline-block w-1.5 h-4 bg-pink-400 animate-pulse ml-0.5 align-middle" />
      </div>
    </div>
  );
}
