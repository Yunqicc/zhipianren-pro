"use client";

import ChatView from "@/components/chat/ChatView";
import { useParams } from "next/navigation";

const CHARACTER_MAP: Record<string, { name: string; emoji: string }> = {
  "lin-banxia": { name: "林半夏", emoji: "🎨" },
  "li-xia": { name: "黎夏", emoji: "🎮" },
};

export default function CharacterChatPage() {
  const params = useParams();
  const characterCode = params.code as string;
  const character = CHARACTER_MAP[characterCode];

  if (!character) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">角色不存在</p>
      </div>
    );
  }

  return (
    <ChatView
      characterCode={characterCode}
      characterName={character.name}
      characterEmoji={character.emoji}
    />
  );
}
