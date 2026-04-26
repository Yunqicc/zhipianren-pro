import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { headers } from "next/headers";

export async function GET(request: Request) {
  const headerList = await headers();
  const demoCookie = headerList.get("cookie")?.includes("zhipianren_demo_user");
  const dbReady = isDatabaseConfigured();

  if (!dbReady || demoCookie) {
    return Response.json({ conversations: [], messages: [], affectionScore: 35 });
  }

  let session: { user?: { id: string } } | null = null;
  try {
    session = await auth.api.getSession({ headers: headerList });
  } catch {}

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const conversationId = searchParams.get("conversationId");
  const characterCode = searchParams.get("characterCode");

  if (!characterCode) {
    return new Response("Missing characterCode", { status: 400 });
  }

  const sql = getDb();

  const [character] = await sql`
    SELECT id FROM characters WHERE code = ${characterCode} AND is_active = true
  `;

  if (!character) {
    return new Response("Character not found", { status: 404 });
  }

  const [ucp] = await sql`
    SELECT id, affection_score FROM user_character_profiles
    WHERE user_id = ${session.user.id} AND character_id = ${character.id}
  `;

  if (!ucp) {
    return Response.json({ conversations: [], messages: [], affectionScore: 35 });
  }

  let targetConvId = conversationId;

  if (!targetConvId) {
    const [latestConv] = await sql`
      SELECT id FROM conversations
      WHERE user_character_profile_id = ${ucp.id} AND status = 'active'
      ORDER BY last_message_at DESC NULLS LAST, created_at DESC
      LIMIT 1
    `;
    targetConvId = latestConv?.id ?? null;
  }

  const conversations = await sql`
    SELECT id, title, status, started_at, last_message_at
    FROM conversations
    WHERE user_character_profile_id = ${ucp.id} AND status = 'active'
    ORDER BY last_message_at DESC NULLS LAST, created_at DESC
    LIMIT 20
  `;

  let messages: Record<string, unknown>[] = [];
  if (targetConvId) {
    messages = await sql`
      SELECT id, sender_type, message_type, content_text, audio_url, image_url, sequence_no, created_at
      FROM messages
      WHERE conversation_id = ${targetConvId}
      ORDER BY sequence_no ASC
      LIMIT 100
    `;
  }

  return Response.json({
    conversations,
    messages,
    affectionScore: ucp.affection_score ?? 35,
    activeConversationId: targetConvId,
  });
}
