import Anthropic from "@anthropic-ai/sdk";

let client: Anthropic | null = null;

export function hasAnthropicKey(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

function getClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

const BULLET_SCHEMA = {
  type: "object",
  properties: {
    bullets: {
      type: "array",
      items: { type: "string" },
      description: "Up to 4 short talking-point bullets, each under ~20 words.",
    },
  },
  required: ["bullets"],
  additionalProperties: false,
} as const;

const SYSTEM_PROMPT = `You are a live meeting copilot. The user is in a real meeting and speaking out loud; you see a rolling transcript of what has been said so far (their own voice and whoever they're talking to, not clearly separated by speaker).

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
export async function generateTalkingPointsWithClaude(
  transcript: string,
  resumeText: string,
  resumeSkills: string[]
): Promise<string[] | null> {
  try {
    const anthropic = getClient();
    const response = await anthropic.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 400,
      system: SYSTEM_PROMPT,
      output_config: { format: { type: "json_schema", schema: BULLET_SCHEMA } },
      messages: [
        {
          role: "user",
          content: `Resume skills: ${resumeSkills.join(", ") || "(none extracted)"}

Resume text:
${resumeText || "(no resume provided)"}

Live transcript so far:
${transcript}`,
        },
      ],
    });

    if (response.stop_reason === "refusal") return null;

    const textBlock = response.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") return null;

    const parsed = JSON.parse(textBlock.text) as { bullets?: unknown };
    if (!Array.isArray(parsed.bullets)) return null;
    return parsed.bullets.filter((b): b is string => typeof b === "string").slice(0, 4);
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
