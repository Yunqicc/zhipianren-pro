import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getLLMProvider } from "@/lib/ai";
import { buildSystemPrompt } from "@/lib/prompt";
import { parseLLMOutput } from "@/lib/prompt/parse";
import { updateAffectionScore } from "@/lib/services/affection";
import { extractAndUpdateMemories } from "@/lib/services/memory";
import { headers } from "next/headers";
import { after } from "next/server";

export const maxDuration = 60;

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();
  const { characterCode, message, conversationId } = body as {
    characterCode: string;
    message: string;
    conversationId?: string;
  };

  if (!characterCode || !message) {
    return new Response("Missing characterCode or message", { status: 400 });
  }

  const sql = getDb();

  const [character] = await sql`
    SELECT id, code, name, system_prompt_template, base_image_url, voice_profile
    FROM characters
    WHERE code = ${characterCode} AND is_active = true
  `;

  if (!character) {
    return new Response("Character not found", { status: 404 });
  }

  let ucpId: string;
  let affectionScore = 35;

  const [existingUcp] = await sql`
    SELECT id, affection_score
    FROM user_character_profiles
    WHERE user_id = ${session.user.id} AND character_id = ${character.id}
  `;

  if (existingUcp) {
    ucpId = existingUcp.id;
    affectionScore = existingUcp.affection_score ?? 35;
  } else {
    const [newUcp] = await sql`
      INSERT INTO user_character_profiles (user_id, character_id, affection_score)
      VALUES (${session.user.id}, ${character.id}, ${affectionScore})
      RETURNING id, affection_score
    `;
    ucpId = newUcp.id;
  }

  let convId: string = conversationId ?? "";

  if (!convId) {
    const [newConv] = await sql`
      INSERT INTO conversations (user_character_profile_id)
      VALUES (${ucpId})
      RETURNING id
    `;
    convId = newConv.id;
  }

  const [maxSeq] = await sql`
    SELECT COALESCE(MAX(sequence_no), 0) as max_seq FROM messages WHERE conversation_id = ${convId}
  `;
  const nextSeq = (maxSeq?.max_seq ?? 0) + 1;

  await sql`
    INSERT INTO messages (conversation_id, sender_type, message_type, content_text, sequence_no, generation_status)
    VALUES (${convId}, 'user', 'text', ${message}, ${nextSeq}, 'completed')
  `;

  const memories = await sql`
    SELECT memory_key, memory_label, memory_value
    FROM user_memories
    WHERE user_character_profile_id = ${ucpId} AND is_active = true
    ORDER BY updated_at DESC
    LIMIT 20
  `;

  const recentMessages = await sql`
    SELECT sender_type, content_text
    FROM messages
    WHERE conversation_id = ${convId} AND generation_status = 'completed'
    ORDER BY sequence_no DESC
    LIMIT 20
  `;

  const systemPrompt = buildSystemPrompt({
    characterName: character.name,
    systemPromptTemplate: character.system_prompt_template ?? "",
    affectionScore,
    memories: memories.map((m) => ({
      label: m.memory_label,
      value: m.memory_value,
    })),
    userNickname: session.user.name ?? "你",
  });

  const llmMessages = recentMessages
    .reverse()
    .map((m) => ({
      role: m.sender_type === "user" ? ("user" as const) : ("assistant" as const),
      content: m.content_text ?? "",
    }));

  const llm = getLLMProvider();
  const stream = llm.chat({
    systemPrompt,
    messages: llmMessages,
    stream: true,
  });

  const encoder = new TextEncoder();
  let fullResponse = "";

  const capturedUcpId = ucpId;
  const capturedAffectionScore = affectionScore;
  const capturedUserMessage = message;

  const readable = new ReadableStream({
    async start(controller) {
      try {
        if (Symbol.asyncIterator in Object(stream)) {
          for await (const chunk of stream as AsyncGenerator<string>) {
            fullResponse += chunk;
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`)
            );
          }
        } else {
          fullResponse = stream as unknown as string;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "chunk", content: fullResponse })}\n\n`)
          );
        }

        const parsed = parseLLMOutput(fullResponse);

        const charMsgSeq = nextSeq + 1;
        for (let i = 0; i < parsed.messages.length; i++) {
          await sql`
            INSERT INTO messages (conversation_id, sender_type, message_type, content_text, sequence_no, generation_status, trigger_reason)
            VALUES (${convId}, 'character', 'text', ${parsed.messages[i]}, ${charMsgSeq + i}, 'completed',
              ${i === parsed.messages.length - 1 && parsed.voiceTriggered ? "voice" : parsed.photoPrompt ? "photo" : null})
          `;
        }

        await sql`
          UPDATE conversations SET last_message_at = now(), updated_at = now() WHERE id = ${convId}
        `;

        await sql`
          UPDATE user_character_profiles SET last_interaction_at = now(), updated_at = now() WHERE id = ${capturedUcpId}
        `;

        const result: Record<string, unknown> = {
          type: "done",
          conversationId: convId,
          messages: parsed.messages,
          voiceTriggered: parsed.voiceTriggered,
          photoPrompt: parsed.photoPrompt,
        };

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify(result)}\n\n`)
        );

        const conversationText = `用户：${capturedUserMessage}\n角色：${parsed.messages.join("\n")}`;
        after(async () => {
          await Promise.allSettled([
            updateAffectionScore({
              ucpId: capturedUcpId,
              currentScore: capturedAffectionScore,
              conversationText,
            }),
            extractAndUpdateMemories({
              ucpId: capturedUcpId,
              conversationText,
            }),
          ]);
        });
      } catch (err) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ type: "error", message: String(err) })}\n\n`)
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
