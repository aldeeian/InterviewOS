import { NextResponse } from "next/server";
import { generateTalkingPoints } from "@/lib/copilot";
import {
  generateSpokenAnswerWithClaude,
  hasAnthropicKey,
  streamSpokenAnswerWithClaude,
} from "@/lib/ai/anthropic-copilot";
import {
  generateSpokenAnswerWithGemini,
  hasGeminiKey,
  streamSpokenAnswerWithGemini,
} from "@/lib/ai/gemini-copilot";
import {
  generateSpokenAnswerWithOpenAI,
  hasOpenAIKey,
  streamSpokenAnswerWithOpenAI,
} from "@/lib/ai/openai-copilot";
import {
  ANSWER_STYLES,
  COPILOT_SPEEDS,
  type AnswerStyle,
  type CopilotPromptInput,
  type CopilotSpeed,
} from "@/lib/ai/copilot-prompt";

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function asAnswerStyle(value: unknown): AnswerStyle {
  return ANSWER_STYLES.includes(value as AnswerStyle) ? (value as AnswerStyle) : "natural";
}

function asSpeed(value: unknown): CopilotSpeed {
  return COPILOT_SPEEDS.includes(value as CopilotSpeed) ? (value as CopilotSpeed) : "deep";
}

const PROVIDER_IDS = ["openai", "gemini", "claude"] as const;
type ProviderId = (typeof PROVIDER_IDS)[number];

function asPreferredProvider(value: unknown): ProviderId | null {
  return PROVIDER_IDS.includes(value as ProviderId) ? (value as ProviderId) : null;
}

interface ProviderSpec {
  source: ProviderId;
  configured: boolean;
  run: () => Promise<string | null>;
  stream: () => AsyncGenerator<string>;
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
    lastDetectedQuestion: asString(body?.lastDetectedQuestion),
    transcriptSummary: asString(body?.transcriptSummary),
  };
  const wantStream = body?.stream === true;
  const speed = asSpeed(body?.preferredSpeed);
  const preferredProvider = asPreferredProvider(body?.preferredProvider);

  if (!input.transcript.trim()) {
    return NextResponse.json({ answer: "", source: "none" });
  }

  // Provider priority: OpenAI, then Gemini, then Anthropic, then the local
  // heuristic engine. Each configured provider falls through to the next on
  // any error/empty result rather than surfacing a failure to the user. A
  // preferred provider (from the panel settings) is tried first; the rest
  // stay in line as fallbacks.
  let providers: ProviderSpec[] = [
    {
      source: "openai",
      configured: hasOpenAIKey(),
      run: () => generateSpokenAnswerWithOpenAI(input),
      stream: () => streamSpokenAnswerWithOpenAI(input),
    },
    {
      source: "gemini",
      configured: hasGeminiKey(),
      run: () => generateSpokenAnswerWithGemini(input, speed),
      stream: () => streamSpokenAnswerWithGemini(input, speed),
    },
    {
      source: "claude",
      configured: hasAnthropicKey(),
      run: () => generateSpokenAnswerWithClaude(input, speed),
      stream: () => streamSpokenAnswerWithClaude(input, speed),
    },
  ];
  if (preferredProvider) {
    providers = [
      ...providers.filter((p) => p.source === preferredProvider),
      ...providers.filter((p) => p.source !== preferredProvider),
    ];
  }

  let anyConfigured = false;

  if (wantStream) {
    for (const provider of providers) {
      if (!provider.configured) continue;
      anyConfigured = true;
      const started = await startStream(provider.stream());
      if (!started) continue;
      return new Response(started, {
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
          "X-Copilot-Source": provider.source,
        },
      });
    }
    // No provider could start a stream — fall through to the heuristic JSON
    // path below (streaming a canned heuristic answer isn't worth it).
  } else {
    for (const provider of providers) {
      if (!provider.configured) continue;
      anyConfigured = true;
      const answer = await provider.run();
      if (answer) {
        return NextResponse.json({ answer, source: provider.source });
      }
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

/**
 * Pulls the first non-empty chunk before committing to a provider's stream,
 * so a provider that errors before producing any text falls through to the
 * next one. After the first chunk is sent, a mid-stream error just ends the
 * response — the client keeps whatever text already arrived.
 */
async function startStream(gen: AsyncGenerator<string>): Promise<ReadableStream<Uint8Array> | null> {
  const iterator = gen[Symbol.asyncIterator]();
  let first: IteratorResult<string>;
  try {
    first = await iterator.next();
    while (!first.done && !first.value) first = await iterator.next();
    if (first.done) return null;
  } catch (error) {
    console.warn("[copilot] Streaming provider failed before first token — falling back:", error);
    return null;
  }

  const encoder = new TextEncoder();
  const firstChunk = first.value;
  let cancelled = false;
  return new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        controller.enqueue(encoder.encode(firstChunk));
        let next = await iterator.next();
        while (!next.done && !cancelled) {
          if (next.value) controller.enqueue(encoder.encode(next.value));
          next = await iterator.next();
        }
      } catch (error) {
        // A closed controller here just means the client disconnected.
        if (!cancelled) console.warn("[copilot] Streaming provider failed mid-stream:", error);
      } finally {
        if (!cancelled) {
          try {
            controller.close();
          } catch {
            // already closed/errored
          }
        }
      }
    },
    cancel() {
      cancelled = true;
      void iterator.return?.(undefined);
    },
  });
}
