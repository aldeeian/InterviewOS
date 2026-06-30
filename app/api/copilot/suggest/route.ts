import { NextResponse } from "next/server";
import { generateTalkingPoints } from "@/lib/copilot";
import { generateTalkingPointsWithClaude, hasAnthropicKey } from "@/lib/ai/anthropic-copilot";
import { generateTalkingPointsWithGemini, hasGeminiKey } from "@/lib/ai/gemini-copilot";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const transcript = typeof body?.transcript === "string" ? body.transcript : "";
  const resumeText = typeof body?.resumeText === "string" ? body.resumeText : "";
  const resumeSkills = Array.isArray(body?.resumeSkills) ? body.resumeSkills : [];

  if (!transcript.trim()) {
    return NextResponse.json({ bullets: [], source: "none" });
  }

  // Gemini takes priority when configured, then Anthropic, then the local
  // heuristic engine. Each provider falls through to the next on any
  // error/empty result rather than surfacing a failure to the user.
  if (hasGeminiKey()) {
    const bullets = await generateTalkingPointsWithGemini(transcript, resumeText, resumeSkills);
    if (bullets && bullets.length > 0) {
      return NextResponse.json({ bullets, source: "gemini" });
    }
  } else if (hasAnthropicKey()) {
    const bullets = await generateTalkingPointsWithClaude(transcript, resumeText, resumeSkills);
    if (bullets && bullets.length > 0) {
      return NextResponse.json({ bullets, source: "claude" });
    }
  } else {
    // No API key configured — simulate the latency of a real backend call so
    // the UI feels consistent between mock and live modes.
    await new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 300));
  }

  const bullets = generateTalkingPoints(transcript, resumeText, resumeSkills);
  return NextResponse.json({ bullets, source: "heuristic" });
}
