import { ApiError, GoogleGenAI } from "@google/genai";

let client: GoogleGenAI | null = null;

export function hasGeminiKey(): boolean {
  return !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
}

function getClient(): GoogleGenAI {
  if (!client) client = new GoogleGenAI({});
  return client;
}

const BULLET_JSON_SCHEMA = {
  type: "object",
  properties: {
    bullets: {
      type: "array",
      items: { type: "string" },
      description: "Up to 4 short talking-point bullets, each under ~20 words.",
    },
  },
  required: ["bullets"],
} as const;

const SYSTEM_PROMPT = `You are a live meeting copilot. The user is in a real meeting; you see a rolling transcript of what has been said so far. When the transcript is speaker-labeled ("You: ..." / "Them: ..."), "Them" is whoever the user is talking to and "You" is the user themselves — always respond to the other person's most recent question or point, not something the user already said.

Given the transcript and the user's resume context, produce up to 4 short talking-point bullets they could use right now to answer or contribute to the conversation.

Rules:
- Each bullet under ~20 words, specific and immediately usable — not generic advice.
- Ground bullets in the resume context only when it's actually relevant to the transcript.
- Never invent numbers, employers, projects, or skills that are not present in the provided resume text.
- If nothing in the resume is relevant, give general structural guidance instead (lead with the outcome, give one concrete example, tie it back to the topic).`;

/**
 * Returns null (not an empty array) on any failure — missing key, rate limit,
 * network error, or a malformed response — so the caller can fall back to the
 * local heuristic engine instead of showing the user an error.
 */
export async function generateTalkingPointsWithGemini(
  transcript: string,
  resumeText: string,
  resumeSkills: string[]
): Promise<string[] | null> {
  try {
    const ai = getClient();
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Resume skills: ${resumeSkills.join(", ") || "(none extracted)"}

Resume text:
${resumeText || "(no resume provided)"}

Live transcript so far:
${transcript}`,
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: "application/json",
        responseJsonSchema: BULLET_JSON_SCHEMA,
      },
    });

    const text = response.text;
    if (!text) return null;

    const parsed = JSON.parse(text) as { bullets?: unknown };
    if (!Array.isArray(parsed.bullets)) return null;
    return parsed.bullets.filter((b): b is string => typeof b === "string").slice(0, 4);
  } catch (error) {
    if (error instanceof ApiError) {
      console.warn(`[copilot] Gemini API error (${error.status}): ${error.message}`);
    } else {
      console.warn("[copilot] Unexpected error calling Gemini:", error);
    }
    return null;
  }
}
