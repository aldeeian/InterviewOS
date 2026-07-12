import OpenAI from "openai";
import { buildCopilotSystemPrompt, buildCopilotUserMessage, type CopilotPromptInput } from "./copilot-prompt";

let client: OpenAI | null = null;

export function hasOpenAIKey(): boolean {
  return !!process.env.OPENAI_API_KEY;
}

function getClient(): OpenAI {
  // The SDK also honors OPENAI_BASE_URL, so this provider works with any
  // OpenAI-compatible endpoint (e.g. NVIDIA's integrate.api.nvidia.com).
  if (!client) client = new OpenAI();
  return client;
}

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const ANSWER_JSON_SCHEMA = {
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

/**
 * Returns null on any failure — missing key, rate limit, network error, or a
 * malformed response — so the caller can fall back to the next provider or
 * the local heuristic engine instead of showing an error.
 */
export async function generateSpokenAnswerWithOpenAI(
  input: CopilotPromptInput
): Promise<string | null> {
  try {
    const openai = getClient();
    const response = await openai.chat.completions.create({
      model: MODEL,
      max_tokens: 1200,
      messages: [
        { role: "system", content: buildCopilotSystemPrompt(input) },
        { role: "user", content: buildCopilotUserMessage(input) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: { name: "spoken_answer", schema: ANSWER_JSON_SCHEMA, strict: true },
      },
    });

    const text = response.choices[0]?.message?.content;
    if (!text) return null;

    const parsed = JSON.parse(text) as { answer?: unknown };
    if (typeof parsed.answer !== "string" || !parsed.answer.trim()) return null;
    return parsed.answer.trim();
  } catch (error) {
    if (error instanceof OpenAI.RateLimitError) {
      console.warn("[copilot] OpenAI rate limited — falling back.");
    } else if (error instanceof OpenAI.AuthenticationError) {
      console.warn("[copilot] OpenAI authentication failed — falling back.");
    } else if (error instanceof OpenAI.APIError) {
      console.warn(`[copilot] OpenAI API error (${error.status}): ${error.message}`);
    } else {
      console.warn("[copilot] Unexpected error calling OpenAI:", error);
    }
    return null;
  }
}
