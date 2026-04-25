import { getDb } from "@/lib/db";
import { getLLMProvider } from "@/lib/ai";
import { MEMORY_EXTRACTION_PROMPT } from "@/lib/prompt";

interface ExtractedMemory {
  key: string;
  label: string;
  value: string;
  confidence: number;
}

export async function extractAndUpdateMemories(params: {
  ucpId: string;
  conversationText: string;
}): Promise<{ extracted: number; updated: number }> {
  const { ucpId, conversationText } = params;

  const llm = getLLMProvider();
  const prompt = MEMORY_EXTRACTION_PROMPT.replace(
    "{{conversation_text}}",
    conversationText
  );

  try {
    const result = await llm.chat({
      systemPrompt: prompt,
      messages: [],
      stream: false,
    });

    const text = typeof result === "string" ? result : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { extracted: 0, updated: 0 };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    const memories: ExtractedMemory[] = parsed.memories ?? [];
    const validMemories = memories.filter((m) => m.confidence >= 0.6);

    if (validMemories.length === 0) {
      return { extracted: 0, updated: 0 };
    }

    const sql = getDb();
    let updated = 0;

    for (const memory of validMemories) {
      const [existing] = await sql`
        SELECT id FROM user_memories
        WHERE user_character_profile_id = ${ucpId} AND memory_key = ${memory.key} AND is_active = true
      `;

      if (existing) {
        await sql`
          UPDATE user_memories
          SET memory_value = ${memory.value}, confidence_score = ${memory.confidence},
              last_confirmed_at = now(), updated_at = now()
          WHERE id = ${existing.id}
        `;
      } else {
        await sql`
          INSERT INTO user_memories (user_character_profile_id, memory_key, memory_label, memory_value, confidence_score)
          VALUES (${ucpId}, ${memory.key}, ${memory.label}, ${memory.value}, ${memory.confidence})
        `;
      }
      updated++;
    }

    return { extracted: validMemories.length, updated };
  } catch {
    return { extracted: 0, updated: 0 };
  }
}
