import { NextResponse } from "next/server";
import { hasDeepgramKey } from "@/lib/ai/deepgram-server";

export function GET() {
  return NextResponse.json({ configured: hasDeepgramKey() });
}
