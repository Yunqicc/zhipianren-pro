import { auth } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { isDatabaseConfigured } from "@/lib/env";
import { headers } from "next/headers";

export async function GET() {
  const headerList = await headers();
  const demoCookie = headerList.get("cookie")?.includes("zhipianren_demo_user");
  const dbReady = isDatabaseConfigured();

  if (!dbReady || demoCookie) {
    return Response.json({ characters: [] });
  }

  let session: { user?: { id: string } } | null = null;
  try {
    session = await auth.api.getSession({ headers: headerList });
  } catch {}

  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const sql = getDb();

  try {
    const characters = await sql`
      SELECT c.code, c.name, c.subtitle, c.visual_prompt, c.sort_order,
        COALESCE(ucp.affection_score, 35) as affection_score,
        ucp.last_interaction_at
      FROM characters c
      LEFT JOIN user_character_profiles ucp
        ON ucp.character_id = c.id AND ucp.user_id = ${session.user.id}
      WHERE c.is_active = true
      ORDER BY c.sort_order ASC
    `;

    return Response.json({ characters });
  } catch {
    return Response.json({ characters: [] });
  }
}
