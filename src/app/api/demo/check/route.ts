import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const demoUser = request.cookies.get("zhipianren_demo_user")?.value;
  return NextResponse.json({ isDemo: !!demoUser, name: demoUser ?? null });
}
