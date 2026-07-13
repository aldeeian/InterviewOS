import { NextResponse } from "next/server";
import { completeText } from "@/lib/ai/simple-complete";

const SYSTEM = `You write post-meeting recaps. You get the raw transcript of a meeting ("You" is the user, "Them" is whoever they were talking to) and optionally the AI answer suggestions that were generated during it.

Produce a recap in Markdown with exactly these sections:
## Meeting summary
A short paragraph (3-6 sentences) of what the meeting was about and how it went.
## Key questions asked
A bullet list of the substantive questions "Them" asked, each with a one-line note on how it was addressed. If none, write "- (none detected)".
## Action items & follow-ups
A bullet list of anything either side committed to or should follow up on. If none, write "- (none mentioned)".

Ground everything in the transcript — never invent commitments or questions that aren't there. The transcript comes from live speech-to-text, so silently correct obvious recognition errors.`;

interface RecapHistoryItem {
  timestamp: number;
  answerStyle: string;
  answer: string;
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const transcript = typeof body?.transcript === "string" ? body.transcript : "";
  const history: RecapHistoryItem[] = Array.isArray(body?.history) ? body.history : [];

  if (!transcript.trim() && history.length === 0) {
    return NextResponse.json({ recap: null, source: "none" });
  }

  const sections = [
    `Meeting transcript:\n${transcript.trim() || "(no audio transcript was captured — the user only typed questions; recap what the suggestions below imply about the meeting)"}`,
  ];
  if (history.length > 0) {
    const lines = history
      .slice()
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((h) => `[${new Date(h.timestamp).toISOString()}] (${h.answerStyle}) ${h.answer}`)
      .join("\n\n");
    sections.push(`AI answer suggestions generated during the meeting (for reference):\n${lines}`);
  }

  const result = await completeText({
    system: SYSTEM,
    user: sections.join("\n\n"),
    maxTokens: 1200,
  });

  if (!result) {
    return NextResponse.json({ recap: null, source: "none" });
  }
  return NextResponse.json({ recap: result.text, source: result.source });
}
