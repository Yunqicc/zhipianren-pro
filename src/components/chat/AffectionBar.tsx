"use client";

import { getAffectionLevel } from "@/lib/prompt";

interface AffectionBarProps {
  score: number;
  compact?: boolean;
}

export function AffectionBar({ score, compact }: AffectionBarProps) {
  const level = getAffectionLevel(score);
  const clampedScore = Math.max(0, Math.min(100, score));
  const percentage = clampedScore;

  const colorMap: Record<string, string> = {
    "初识": "bg-gray-300",
    "熟悉": "bg-blue-400",
    "在意": "bg-pink-400",
    "亲密": "bg-rose-500",
    "深爱": "bg-red-500",
  };

  const barColor = colorMap[level.name] ?? "bg-gray-300";

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">{level.name}</span>
        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${barColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-3 bg-white/60 backdrop-blur-sm border-t border-pink-50">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-gray-600">
          好感度 · {level.name}
        </span>
        <span className="text-xs text-gray-400">{clampedScore}/100</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${barColor}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
