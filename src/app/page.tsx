"use client";

import { useSession, signOut } from "@/lib/auth/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!isPending && !session) {
      router.push("/login");
    }
  }, [session, isPending, router]);

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-pink-50 to-white">
        <p className="text-gray-400 text-sm">加载中...</p>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-pink-50 to-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-pink-100">
        <h1 className="text-lg font-bold text-gray-900">纸片人女友</h1>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {session.user.name || session.user.email}
          </span>
          <button
            onClick={() => signOut()}
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
          <div className="bg-white rounded-2xl border border-pink-100 p-6 hover:shadow-lg hover:shadow-pink-100/50 transition-shadow cursor-pointer">
            <div className="w-20 h-20 bg-pink-100 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">
              🎨
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center">
              林半夏
            </h3>
            <p className="text-sm text-gray-500 text-center mt-1">
              在平凡日子里带来治愈与安宁的温暖画手
            </p>
            <p className="text-xs text-pink-400 text-center mt-3">
              舒适伴侣型 · 温暖松弛
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-purple-100 p-6 hover:shadow-lg hover:shadow-purple-100/50 transition-shadow cursor-pointer">
            <div className="w-20 h-20 bg-purple-100 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl">
              🎮
            </div>
            <h3 className="text-lg font-semibold text-gray-900 text-center">
              黎夏
            </h3>
            <p className="text-sm text-gray-500 text-center mt-1">
              嘴硬心软的傲娇游戏制作人
            </p>
            <p className="text-xs text-purple-400 text-center mt-3">
              傲娇毒舌型 · 独立飒爽
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
