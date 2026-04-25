import { getDb } from "@/lib/db";
import { getLLMProvider } from "@/lib/ai";
import { AFFECTION_CHANGE_PROMPT, MEMORY_EXTRACTION_PROMPT } from "@/lib/prompt";

export async function updateAffectionScore(params: {
  ucpId: string;
  currentScore: number;
  conversationText: string;
}): Promise<{ newScore: number; change: number; reason: string }> {
  const { ucpId, currentScore, conversationText } = params;

  const llm = getLLMProvider();
  const prompt = AFFECTION_CHANGE_PROMPT
    .replace("{{current_score}}", String(currentScore))
    .replace("{{conversation_text}}", conversationText);

  try {
    const result = await llm.chat({
      systemPrompt: prompt,
      messages: [],
      stream: false,
    });

    const text = typeof result === "string" ? result : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { newScore: currentScore, change: 0, reason: "无法解析" };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const change = Math.max(-10, Math.min(10, Number(parsed.score_change) || 0));
    const newScore = Math.max(0, Math.min(100, currentScore + change));

    const sql = getDb();
    await sql`
      UPDATE user_character_profiles
      SET affection_score = ${newScore}, updated_at = now()
      WHERE id = ${ucpId}
    `;

    return { newScore, change, reason: parsed.reason ?? "" };
  } catch {
    return { newScore: currentScore, change: 0, reason: "计算失败" };
  }
}
