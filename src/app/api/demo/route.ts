import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name } = body as { name?: string };

  const demoName = name || "体验用户";

  const response = NextResponse.json({ ok: true, name: demoName });

  response.cookies.set("zhipianren_demo_user", demoName, {
    httpOnly: true,
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    sameSite: "lax",
  });

  return response;
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set("zhipianren_demo_user", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}
