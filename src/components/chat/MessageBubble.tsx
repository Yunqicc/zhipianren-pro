"use client";

import { useState, useRef } from "react";
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

function AudioPlayer({ audioUrl, isLoading }: { audioUrl?: string; isLoading?: boolean }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);

  if (isLoading && !audioUrl) {
    return (
      <div className="flex items-center gap-2 mb-2 text-gray-400 text-xs">
        <div className="w-6 h-6 rounded-full bg-pink-50 flex items-center justify-center animate-pulse">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" className="text-pink-400">
            <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55C7.79 13 6 14.79 6 17s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z" />
          </svg>
        </div>
        <span>语音生成中...</span>
      </div>
    );
  }

  if (!audioUrl) return null;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
  };

  return (
    <div className="mb-2">
      <button
        onClick={togglePlay}
        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-pink-50 hover:bg-pink-100 transition-colors"
      >
        <div className={`w-6 h-6 rounded-full flex items-center justify-center ${playing ? "bg-pink-400" : "bg-pink-300"}`}>
          {playing ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
              <rect x="6" y="5" width="4" height="14" rx="1" />
              <rect x="14" y="5" width="4" height="14" rx="1" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </div>
        <div className="flex items-center gap-0.5">
          {[3, 5, 8, 5, 3, 6, 4, 7].map((h, i) => (
            <div
              key={i}
              className={`w-0.5 rounded-full ${playing ? "bg-pink-400 animate-pulse" : "bg-pink-300"}`}
              style={{ height: `${h}px`, animationDelay: `${i * 0.1}s` }}
            />
          ))}
        </div>
      </button>
      <audio
        ref={audioRef}
        src={audioUrl}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        preload="none"
      />
    </div>
  );
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

  const isAudioType = message.type === "audio";
  const showAudio = isAudioType || !!message.audioUrl;

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
        {showAudio && (
          <AudioPlayer
            audioUrl={message.audioUrl}
            isLoading={isAudioType && !message.audioUrl}
          />
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
