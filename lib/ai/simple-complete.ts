import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { GoogleGenAI } from "@google/genai";
import { hasAnthropicKey } from "./anthropic-copilot";
import { hasGeminiKey } from "./gemini-copilot";
import { hasOpenAIKey } from "./openai-copilot";

export interface SimpleCompleteInput {
  system: string;
  user: string;
  maxTokens?: number;
}

export interface SimpleCompleteResult {
  text: string;
  source: "openai" | "gemini" | "claude";
}

let openaiClient: OpenAI | null = null;
let geminiClient: GoogleGenAI | null = null;
let anthropicClient: Anthropic | null = null;

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

/**
 * Plain-text completion over the same provider chain as the copilot
 * (OpenAI → Gemini → Anthropic), on cheap/fast models — for auxiliary calls
 * like transcript summarization and session recaps. Returns null when no
 * provider is configured or every configured provider failed.
 */
export async function completeText(input: SimpleCompleteInput): Promise<SimpleCompleteResult | null> {
  const maxTokens = input.maxTokens ?? 800;

  if (hasOpenAIKey()) {
    try {
      if (!openaiClient) openaiClient = new OpenAI();
      const response = await openaiClient.chat.completions.create({
        model: OPENAI_MODEL,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: input.system },
          { role: "user", content: input.user },
        ],
      });
      const text = response.choices[0]?.message?.content?.trim();
      if (text) return { text, source: "openai" };
    } catch (error) {
      console.warn("[copilot] OpenAI completion failed — falling back:", error);
    }
  }

  if (hasGeminiKey()) {
    try {
      if (!geminiClient) geminiClient = new GoogleGenAI({});
      const response = await geminiClient.models.generateContent({
        // "-latest" alias — pinned lite models 404 for newer API keys.
        model: "gemini-flash-lite-latest",
        contents: input.user,
        config: { systemInstruction: input.system, maxOutputTokens: maxTokens },
      });
      const text = response.text?.trim();
      if (text) return { text, source: "gemini" };
    } catch (error) {
      console.warn("[copilot] Gemini completion failed — falling back:", error);
    }
  }

  if (hasAnthropicKey()) {
    try {
      if (!anthropicClient) anthropicClient = new Anthropic();
      const response = await anthropicClient.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: maxTokens,
        system: input.system,
        messages: [{ role: "user", content: input.user }],
      });
      const block = response.content.find((b) => b.type === "text");
      const text = block && block.type === "text" ? block.text.trim() : "";
      if (text) return { text, source: "claude" };
    } catch (error) {
      console.warn("[copilot] Anthropic completion failed:", error);
    }
  }

  return null;
}
