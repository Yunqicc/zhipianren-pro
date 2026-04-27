import { NextResponse } from "next/server";
import { getImageProvider } from "@/lib/ai";
import { isImageConfigured, resolveImageUrl } from "@/lib/env";
import { checkImageQuota, incrementImageQuota } from "@/lib/db/quota";
import { getDb } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function POST(request: Request) {
  if (!isImageConfigured()) {
    return NextResponse.json({ error: "Image generation not configured" }, { status: 503 });
  }

  const session = await auth.api.getSession({ headers: request.headers });
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const quota = await checkImageQuota(session.user.id);
  if (!quota.allowed) {
    return NextResponse.json(
      { error: `今日图片额度已用完（${quota.used}/${quota.limit}）`, used: quota.used, limit: quota.limit },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { prompt, characterCode } = body as {
    prompt: string;
    characterCode?: string;
  };

  if (!prompt?.trim()) {
    return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
  }

  try {
    let referenceImageUrl = "";
    let visualPrompt = "";

    if (characterCode) {
      const sql = getDb();
      const [character] = await sql`
        SELECT base_image_url, visual_prompt
        FROM characters
        WHERE code = ${characterCode} AND is_active = true
      `;
      if (character) {
        referenceImageUrl = resolveImageUrl(character.base_image_url ?? "");
        visualPrompt = character.visual_prompt ?? "";
      }
    }

    const fullPrompt = visualPrompt
      ? `${visualPrompt}, ${prompt.trim()}, lifestyle photography, natural, candid`
      : prompt.trim();

    const imageProvider = getImageProvider();
    const imageUrl = await imageProvider.generateWithRef({
      prompt: fullPrompt,
      referenceImageUrl,
      strength: referenceImageUrl ? 0.6 : undefined,
    });

    await incrementImageQuota(session.user.id);

    return NextResponse.json({ imageUrl });
  } catch (err) {
    console.error("Image generation failed:", err);
    return NextResponse.json(
      { error: `Image generation failed: ${String(err)}` },
      { status: 500 }
    );
  }
}
