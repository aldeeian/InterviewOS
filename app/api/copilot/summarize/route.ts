import { NextResponse } from "next/server";
import { completeText } from "@/lib/ai/simple-complete";

const SYSTEM = `You maintain a running summary of a live meeting for an assistant that needs earlier context without the full transcript.

You get the existing summary (possibly empty) plus a newly-aged chunk of raw transcript ("You" is the user, "Them" is whoever they're talking to). Merge them into one updated summary:
- At most ~150 words, plain prose, no headings or bullets.
- Keep concrete facts an answer might need later: names, numbers, commitments, questions asked and how they were answered, topics covered.
- Drop filler and pleasantries. Never invent anything not in the input.
Reply with the updated summary text only.`;

/**
 * Folds an aged chunk of transcript into the running meeting summary. The
 * client only switches to windowed mode once this succeeds, so a failure here
 * (or no configured provider) just means the full transcript keeps being sent.
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const previousSummary = typeof body?.previousSummary === "string" ? body.previousSummary : "";
  const text = typeof body?.text === "string" ? body.text : "";

  if (!text.trim()) {
    return NextResponse.json({ summary: previousSummary || null });
  }

  const result = await completeText({
    system: SYSTEM,
    user: `Existing summary:\n${previousSummary.trim() || "(none yet)"}\n\nNew transcript chunk to fold in:\n${text}`,
    maxTokens: 400,
  });

  return NextResponse.json({ summary: result?.text ?? null });
}
