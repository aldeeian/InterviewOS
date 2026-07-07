import { NextResponse } from "next/server";
import { mintTempDeepgramKey } from "@/lib/ai/deepgram-server";

export const dynamic = "force-dynamic";

export async function GET() {
  const key = await mintTempDeepgramKey();
  if (!key) {
    return NextResponse.json({ error: "Deepgram is not configured on this server." }, { status: 503 });
  }
  return NextResponse.json({ key, expiresInSeconds: 60 });
}
