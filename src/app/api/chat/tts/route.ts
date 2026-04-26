import { getTTSProvider } from "@/lib/ai";
import { isTTSConfigured } from "@/lib/env";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  if (!isTTSConfigured()) {
    return NextResponse.json({ error: "TTS not configured" }, { status: 503 });
  }

  const body = await request.json();
  const { text, voiceId } = body as { text: string; voiceId?: string };

  if (!text?.trim()) {
    return NextResponse.json({ error: "Missing text" }, { status: 400 });
  }

  try {
    const tts = getTTSProvider();
    const audioBuffer = await tts.synthesize({ text: text.trim(), voiceId });

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.length),
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("TTS synthesis failed:", err);
    return NextResponse.json(
      { error: "TTS synthesis failed", detail: String(err) },
      { status: 500 }
    );
  }
}
