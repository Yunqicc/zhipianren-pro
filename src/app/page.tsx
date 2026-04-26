"use client";

import { useSession, signOut } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface CharacterInfo {
  code: string;
  name: string;
  subtitle: string;
  visual_prompt: string;
  affection_score: number;
  last_interaction_at: string | null;
}

const FALLBACK_CHARACTERS: CharacterInfo[] = [
  {
    code: "lin-banxia",
    name: "林半夏",
    subtitle: "在平凡日子里带来治愈与安宁的温暖画手",
    visual_prompt: "",
    affection_score: 35,
    last_interaction_at: null,
  },
  {
    code: "li-xia",
    name: "黎夏",
    subtitle: "嘴硬心软的傲娇游戏制作人，骂完你偷偷帮你改代码",
    visual_prompt: "",
    affection_score: 35,
    last_interaction_at: null,
  },
];

const CHARACTER_META: Record<string, { emoji: string; tag: string; borderColor: string; shadowColor: string; bgAccent: string }> = {
  "lin-banxia": { emoji: "🎨", tag: "舒适伴侣型 · 温暖松弛", borderColor: "border-pink-100", shadowColor: "hover:shadow-pink-100/50", bgAccent: "bg-pink-100" },
  "li-xia": { emoji: "🎮", tag: "傲娇毒舌型 · 独立飒爽", borderColor: "border-purple-100", shadowColor: "hover:shadow-purple-100/50", bgAccent: "bg-purple-100" },
};

export default function Home() {
  const { data: session, isPending } = useSession();
  const router = useRouter();
  const [characters, setCharacters] = useState<CharacterInfo[]>(FALLBACK_CHARACTERS);
  const [isDemo, setIsDemo] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/api/demo/check")
      .then((r) => r.json())
      .then((d) => {
        setIsDemo(!!d.isDemo);
        setChecked(true);
      })
      .catch(() => setChecked(true));
  }, []);

  useEffect(() => {
    if (checked && !isPending && !session && !isDemo) {
      router.push("/login");
    }
  }, [session, isPending, isDemo, checked, router]);

  useEffect(() => {
    if (session || isDemo) {
      fetch("/api/characters")
        .then((res) => (res.ok ? res.json() : null))
        .then((data) => {
          if (data?.characters?.length > 0) {
            setCharacters(data.characters);
          }
        })
        .catch(() => {});
    }
  }, [session, isDemo]);

  if (!checked || isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 to-white">
        <p className="text-gray-400 text-sm">加载中...</p>
      </div>
    );
  }

  if (!session && !isDemo) {
    return null;
  }

  const displayName = isDemo
    ? "体验用户"
    : session?.user?.name || session?.user?.email || "";

  async function handleLogout() {
    if (isDemo) {
      await fetch("/api/demo", { method: "DELETE" });
      router.push("/login");
    } else {
      await signOut();
      router.push("/login");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-pink-100">
        <h1 className="text-lg font-bold text-gray-900">纸片人女友</h1>
        <div className="flex items-center gap-4">
          {isDemo && (
            <span className="text-xs text-orange-400 bg-orange-50 px-2 py-0.5 rounded-full">
              演示模式
            </span>
          )}
          <span className="text-sm text-gray-600">{displayName}</span>
          <button
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
          >
            退出
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            选择你的女友
          </h2>
          <p className="text-gray-500 text-sm">
            每个角色都有独特的性格和故事
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          {characters.map((char) => {
            const meta = CHARACTER_META[char.code] ?? { emoji: "💬", tag: "", borderColor: "border-gray-100", shadowColor: "hover:shadow-gray-100/50", bgAccent: "bg-gray-100" };
            return (
              <a
                key={char.code}
                href={`/chat/${char.code}`}
                className={`bg-white rounded-2xl ${meta.borderColor} border p-6 hover:shadow-lg ${meta.shadowColor} transition-shadow cursor-pointer block`}
              >
                <div className={`w-20 h-20 ${meta.bgAccent} rounded-full mx-auto mb-4 flex items-center justify-center text-3xl`}>
                  {meta.emoji}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 text-center">
                  {char.name}
                </h3>
                <p className="text-sm text-gray-500 text-center mt-1">
                  {char.subtitle}
                </p>
                <p className="text-xs text-pink-400 text-center mt-3">
                  {meta.tag}
                </p>
              </a>
            );
          })}
        </div>
      </main>
    </div>
  );
}
