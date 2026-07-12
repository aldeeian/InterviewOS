import { ApiError, GoogleGenAI } from "@google/genai";
import { buildCopilotSystemPrompt, buildCopilotUserMessage, type CopilotPromptInput } from "./copilot-prompt";

let client: GoogleGenAI | null = null;

export function hasGeminiKey(): boolean {
  return !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
}

function getClient(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({});
  return client;
}

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
} as const;

/**
 * Returns null on any failure — missing key, rate limit, network error, or a
 * malformed response — so the caller can fall back to the local heuristic
 * engine instead of showing the user an error.
 */
export async function generateSpokenAnswerWithGemini(
  input: CopilotPromptInput
): Promise<string | null> {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: buildCopilotUserMessage(input),
      config: {
        systemInstruction: buildCopilotSystemPrompt(input),
        responseMimeType: "application/json",
        responseJsonSchema: ANSWER_JSON_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) return null;

    const parsed = JSON.parse(text) as { answer?: unknown };
    if (typeof parsed.answer !== "string" || !parsed.answer.trim()) return null;
    return parsed.answer.trim();
  } catch (error) {
    if (error instanceof ApiError) {
      console.warn(`[copilot] Gemini API error (${error.status}): ${error.message}`);
    } else {
      console.warn("[copilot] Unexpected error calling Gemini:", error);
    }
    return null;
  }
}
