import { NextResponse } from "next/server";
import { generateTalkingPoints } from "@/lib/copilot";
import { generateSpokenAnswerWithClaude, hasAnthropicKey } from "@/lib/ai/anthropic-copilot";
import { generateSpokenAnswerWithGemini, hasGeminiKey } from "@/lib/ai/gemini-copilot";
import { generateSpokenAnswerWithOpenAI, hasOpenAIKey } from "@/lib/ai/openai-copilot";
import { ANSWER_STYLES, type AnswerStyle, type CopilotPromptInput } from "@/lib/ai/copilot-prompt";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asAnswerStyle(value: unknown): AnswerStyle {
  return ANSWER_STYLES.includes(value as AnswerStyle) ? (value as AnswerStyle) : "natural";
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const input: CopilotPromptInput = {
    transcript: asString(body?.transcript),
    resumeText: asString(body?.resumeText),
    resumeSkills: Array.isArray(body?.resumeSkills) ? body.resumeSkills : [],
    jobDescription: asString(body?.jobDescription),
    knowledgeBase: asString(body?.knowledgeBase),
    behaviorInstructions: asString(body?.behaviorInstructions),
    answerStyle: asAnswerStyle(body?.answerStyle),
  };

  if (!input.transcript.trim()) {
    return NextResponse.json({ answer: "", source: "none" });
  }

  // Provider priority: OpenAI, then Gemini, then Anthropic, then the local
  // heuristic engine. Each configured provider falls through to the next on
  // any error/empty result rather than surfacing a failure to the user.
  const providers: { configured: boolean; source: string; run: () => Promise<string | null> }[] = [
    { configured: hasOpenAIKey(), source: "openai", run: () => generateSpokenAnswerWithOpenAI(input) },
    { configured: hasGeminiKey(), source: "gemini", run: () => generateSpokenAnswerWithGemini(input) },
    { configured: hasAnthropicKey(), source: "claude", run: () => generateSpokenAnswerWithClaude(input) },
  ];

  let anyConfigured = false;
  for (const provider of providers) {
    if (!provider.configured) continue;
    anyConfigured = true;
    const answer = await provider.run();
    if (answer) {
      return NextResponse.json({ answer, source: provider.source });
    }
  }

  if (!anyConfigured) {
    // No API key configured — simulate the latency of a real backend call so
    // the UI feels consistent between mock and live modes.
    await new Promise((resolve) => setTimeout(resolve, 250 + Math.random() * 300));
  }

  // The heuristic engine only produces short bullets from resume text; fold
  // the pasted context in as searchable material and stitch its bullets into
  // a single readable fallback answer.
  const heuristicResume = [input.resumeText, input.jobDescription, input.knowledgeBase]
    .filter(Boolean)
    .join("\n\n");
  const bullets = generateTalkingPoints(input.transcript, heuristicResume, input.resumeSkills);
  return NextResponse.json({ answer: bullets.join(" "), source: "heuristic" });
}
