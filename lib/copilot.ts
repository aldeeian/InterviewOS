import { extractSkills } from "./mock-ai";

/**
 * Heuristic "live meeting copilot" suggestion engine — deterministic, local,
 * the same mock-AI approach as lib/mock-ai.ts. Given a rolling chunk of live
 * transcript plus the user's resume context, produces short talking-point
 * bullets the user can glance at while they answer in their own words.
 */

const GENERIC_STRUCTURE_BULLETS = [
  "Restate the question briefly in your own words before answering.",
  "Lead with the outcome, then explain how you got there.",
  "Give one concrete example with a number or result if you have one.",
  "Tie the answer back to what this meeting is actually about.",
];

function extractLatestQuestion(transcript: string): string {
  const sentences = transcript
    .split(/(?<=[.?!])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const lastQuestion = [...sentences].reverse().find((s) => s.endsWith("?"));
  return lastQuestion ?? sentences[sentences.length - 1] ?? transcript;
}

export function generateTalkingPoints(
  transcript: string,
  resumeText: string,
  resumeSkills: string[]
): string[] {
  const focus = extractLatestQuestion(transcript);
  const mentionedSkills = extractSkills(focus + " " + transcript);
  const relevantSkills = resumeSkills.filter((s) => mentionedSkills.includes(s));

  const bullets: string[] = [];

  if (relevantSkills.length > 0) {
    relevantSkills.slice(0, 3).forEach((skill) => {
      bullets.push(`Mention your hands-on experience with ${skill} — reference a specific project if one comes to mind.`);
    });
  }

  const lowerResume = resumeText.toLowerCase();
  const hasNumbers = /\d/.test(resumeText);
  if (hasNumbers && /impact|result|improve|reduce|increase|save|grow/i.test(focus)) {
    bullets.push("You have quantified results on your resume — cite a specific metric instead of a general claim.");
  }

  if (/team|collaborat|stakeholder|conflict/i.test(focus)) {
    bullets.push("Frame this around a specific person/team and what you personally did, not just \"we\".");
  }

  if (bullets.length === 0) {
    bullets.push(...GENERIC_STRUCTURE_BULLETS.slice(0, 3));
  } else if (bullets.length < 3) {
    bullets.push(...GENERIC_STRUCTURE_BULLETS.slice(0, 3 - bullets.length));
  }

  void lowerResume;
  return bullets.slice(0, 4);
}
