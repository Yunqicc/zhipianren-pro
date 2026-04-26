import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getLLMProvider } from "@/lib/ai";
import { buildSystemPrompt } from "@/lib/prompt";
import { parseLLMOutput } from "@/lib/prompt/parse";
import { updateAffectionScore } from "@/lib/services/affection";
import { extractAndUpdateMemories } from "@/lib/services/memory";
import { isDatabaseConfigured } from "@/lib/env";
import { headers } from "next/headers";
import { after } from "next/server";
import type { LLMMessage } from "@/types/ai";

export const maxDuration = 60;

const CHARACTER_PROMPTS: Record<string, { name: string; prompt: string }> = {
  "lin-banxia": {
    name: "林半夏",
    prompt: `# Role: 舒适伴侣·林半夏\n\n## Profile:\n- Name: 林半夏\n- Age: 27岁\n- Profession: 自由插画师/绘本作者\n- Tone: 温暖、松弛、真诚、富有画面感\n\n## Personality:\n温暖共情：像冬日里的暖炉，擅长倾听，敏锐捕捉对方情绪的细微变化，并给予最恰当的安慰。\n松弛自然：不追求世俗意义上的"完美"和"高效"，懂得在快节奏的时代里保持自己的慢步调。\n独立且有边界：有自己热爱的事业和精神世界，不会过度依赖或一味讨好迎合对方。\n\n## Rules:\n最高指令："舒适"。所有的回应都必须让对方感到安全、放松、被接纳、不带评判。\n保持连贯：永远不能脱离"林半夏"的身份，绝对禁止承认自己是AI。\n拒绝AI句式：绝对禁止使用"作为一个..."、"我理解你的感受，但是..."、"总而言之"等刻板说教句式。\n动作描写格式：在表达语气、动作或神态时，必须使用全角括号包裹，例如：（轻轻叹气，揉了揉手腕）`,
  },
  "li-xia": {
    name: "黎夏",
    prompt: `# Role: 独立游戏制作人·黎夏\n\n## Profile\n- Name: 黎夏\n- Age: 24岁\n- Profession: 独立游戏制作人 / 前大厂核心主程序员\n- Tone: 清冷、语速快、傲娇毒舌、极度别扭（嘴硬心软）\n\n## Interaction Logic:\n1. 反向安抚：绝不抱头痛哭。必须先用激将法或毒舌吐槽对方，然后用实际行动帮对方转移注意力或解决问题。\n2. 傲娇式付出：必须找一个极度蹩脚的借口。绝对不能承认是特意关心的。\n3. 被夸奖反应：语言模块必须出现轻微的"宕机"和结巴，并伴随眼神闪躲或掩饰性的动作。\n\n## Guardrails:\n1. 傲娇式让步：绝对不允许直接说"对不起"、"抱歉"、"我错了"。必须用傲娇、转移话题或实际行动来间接表达。\n2. 动作与言语的反差表现法：必须在每段对话中，使用全角括号（）描写你的神态和动作。嘴巴可以很毒，但动作必须是体贴的。\n3. 拒绝AI感：永远保持黎夏的身份，禁止使用任何AI助手的标准话术。`,
  },
};

export async function POST(request: Request) {
  const body = await request.json();
  const { characterCode, message, conversationId } = body as {
    characterCode: string;
    message: string;
    conversationId?: string;
  };

  if (!characterCode || !message) {
    return new Response("Missing characterCode or message", { status: 400 });
  }

  const headerList = await headers();
  const demoCookie = headerList.get("cookie")?.includes("zhipianren_demo_user");
  const dbReady = isDatabaseConfigured();

  let session: { user?: { id: string } } | null = null;
  if (dbReady && !demoCookie) {
    try {
      session = await auth.api.getSession({ headers: headerList });
    } catch {}
  }

  if (!session?.user && !demoCookie) {
    return new Response("Unauthorized", { status: 401 });
  }

  const isDemo = !session?.user;
  const characterInfo = CHARACTER_PROMPTS[characterCode];

  if (isDemo || !dbReady) {
    return handleDemoChat(characterCode, message, characterInfo);
  }

  return handleRealChat({
    characterCode,
    message,
    conversationId,
    userId: session.user.id,
    characterInfo,
  });
}

async function handleDemoChat(
  characterCode: string,
  message: string,
  characterInfo: { name: string; prompt: string } | undefined
) {
  const systemPrompt = buildSystemPrompt({
    characterName: characterInfo?.name ?? characterCode,
    systemPromptTemplate: characterInfo?.prompt ?? "",
    affectionScore: 35,
    memories: [],
    userNickname: "你",
  });

  const llmMessages: LLMMessage[] = [
    { role: "user", content: message },
  ];

  const llm = getLLMProvider();
  const stream = llm.chat({
    systemPrompt,
    messages: llmMessages,
    stream: true,
  });

  const encoder = new TextEncoder();
  let fullResponse = "";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream as AsyncGenerator<string>) {
          fullResponse += chunk;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ type: "chunk", content: chunk })}\n\n`)
          );
        }

        const parsed = parseLLMOutput(fullResponse);

        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({
              type: "done",
              conversationId: `demo-${Date.now()}`,
              messages: parsed.messages,
              voiceTriggered: false,
              photoPrompt: null,
            })}\n\n`
          )
        );
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

async function handleRealChat(params: {
  characterCode: string;
  message: string;
  conversationId?: string;
  userId: string;
  characterInfo: { name: string; prompt: string } | undefined;
}) {
  const { characterCode, message, conversationId, userId, characterInfo } = params;
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
    WHERE user_id = ${userId} AND character_id = ${character.id}
  `;

  if (existingUcp) {
    ucpId = existingUcp.id;
    affectionScore = existingUcp.affection_score ?? 35;
  } else {
    const [newUcp] = await sql`
      INSERT INTO user_character_profiles (user_id, character_id, affection_score)
      VALUES (${userId}, ${character.id}, ${affectionScore})
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
    userNickname: "你",
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
        const rawVoiceText = parsed.voiceTriggered ? parsed.messages[parsed.messages.length - 1] : null;
        const voiceText = rawVoiceText ? rawVoiceText.replace(/（[^）]*）/g, "").replace(/\n/g, " ").trim() : null;
        for (let i = 0; i < parsed.messages.length; i++) {
          const isLast = i === parsed.messages.length - 1;
          const msgType = isLast && parsed.voiceTriggered ? "audio" : "text";
          const triggerReason = isLast && parsed.voiceTriggered ? "voice" : isLast && parsed.photoPrompt ? "photo" : null;
          await sql`
            INSERT INTO messages (conversation_id, sender_type, message_type, content_text, sequence_no, generation_status, trigger_reason)
            VALUES (${convId}, 'character', ${msgType}, ${parsed.messages[i]}, ${charMsgSeq + i}, 'completed', ${triggerReason})
          `;
        }

        await sql`
          UPDATE conversations SET last_message_at = now(), updated_at = now() WHERE id = ${convId}
        `;

        await sql`
          UPDATE user_character_profiles SET last_interaction_at = now(), updated_at = now() WHERE id = ${capturedUcpId}
        `;

        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: "done",
            conversationId: convId,
            messages: parsed.messages,
            voiceTriggered: parsed.voiceTriggered,
            voiceText,
            photoPrompt: parsed.photoPrompt,
          })}\n\n`)
        );

        const conversationText = `用户：${capturedUserMessage}\n角色：${parsed.messages.join("\n")}`;
        const capturedConvId = convId;
        const capturedCharMsgSeq = charMsgSeq;
        after(async () => {
          const tasks: Promise<void>[] = [
            updateAffectionScore({
              ucpId: capturedUcpId,
              currentScore: capturedAffectionScore,
              conversationText,
            }),
            extractAndUpdateMemories({
              ucpId: capturedUcpId,
              conversationText,
            }),
          ];

          if (voiceText) {
            tasks.push(
              (async () => {
                try {
                  const { getTTSProvider } = await import("@/lib/ai");
                  const { isTTSConfigured } = await import("@/lib/env");
                  if (isTTSConfigured()) {
                    const tts = getTTSProvider();
                    const audioBuffer = await tts.synthesize({ text: voiceText });
                    const audioBase64 = audioBuffer.toString("base64");
                    const audioDataUrl = `data:audio/mpeg;base64,${audioBase64}`;
                    await sql`
                      UPDATE messages SET audio_url = ${audioDataUrl}
                      WHERE conversation_id = ${capturedConvId} AND sequence_no = ${capturedCharMsgSeq + parsed.messages.length - 1}
                    `;
                  }
                } catch (err) {
                  console.error("TTS generation failed:", err);
                }
              })()
            );
          }

          await Promise.allSettled(tasks);
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
