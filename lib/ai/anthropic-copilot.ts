import Anthropic from "@anthropic-ai/sdk";
import {
  buildCopilotSystemPrompt,
  buildCopilotUserMessage,
  type CopilotPromptInput,
  type CopilotSpeed,
} from "./copilot-prompt";

let client: Anthropic | null = null;

export function hasAnthropicKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

const ANSWER_SCHEMA = {
  type: "object",
  properties: {
    answer: {
      type: "string",
      description:
        "The answer in the requested style, in the user's first-person voice, ready to use out loud right now.",
    },
  },
  required: ["answer"],
  additionalProperties: false,
} as const;

function modelFor(speed: CopilotSpeed): string {
  return speed === "fast" ? "claude-haiku-4-5-20251001" : "claude-opus-4-8";
}

/**
 * Streams the answer as plain-text deltas. Throws on any failure (including
 * before the first token) so the route can fall through to the next provider;
 * the JSON-schema mode used by the blocking path is skipped because schema
 * output can't stream readable text.
 */
export async function* streamSpokenAnswerWithClaude(
  input: CopilotPromptInput,
  speed: CopilotSpeed = "deep"
): AsyncGenerator<string> {
  const anthropic = getClient();
  const stream = anthropic.messages.stream({
    model: modelFor(speed),
    max_tokens: 1200,
    system: buildCopilotSystemPrompt(input),
    messages: [{ role: "user", content: buildCopilotUserMessage(input) }],
  });
  for await (const event of stream) {
    if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
      yield event.delta.text;
    }
  }
}

/**
 * Returns null on any failure — missing key, rate limit, network error, or a
 * malformed response — so the caller can fall back to the local heuristic
 * engine instead of showing the user an error.
 */
export async function generateSpokenAnswerWithClaude(
  input: CopilotPromptInput,
  speed: CopilotSpeed = "deep"
): Promise<string | null> {
  try {
    const anthropic = getClient();
    const response = await anthropic.messages.create({
      model: modelFor(speed),
      max_tokens: 1200,
      system: buildCopilotSystemPrompt(input),
      output_config: { format: { type: "json_schema", schema: ANSWER_SCHEMA } },
      messages: [{ role: "user", content: buildCopilotUserMessage(input) }],
    });

    if (response.stop_reason === "refusal") return null;

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    const parsed = JSON.parse(textBlock.text) as { answer?: unknown };
    if (typeof parsed.answer !== "string" || !parsed.answer.trim()) return null;
    return parsed.answer.trim();
  } catch (error) {
    if (error instanceof Anthropic.RateLimitError) {
      console.warn("[copilot] Anthropic rate limited — falling back to heuristic suggestions.");
    } else if (error instanceof Anthropic.AuthenticationError) {
      console.warn("[copilot] Anthropic authentication failed — falling back to heuristic suggestions.");
    } else if (error instanceof Anthropic.APIError) {
      console.warn(`[copilot] Anthropic API error (${error.status}): ${error.message}`);
    } else {
      console.warn("[copilot] Unexpected error calling Anthropic:", error);
    }
    return null;
  }
}
