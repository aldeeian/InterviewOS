import type {
  Difficulty,
  InterviewCategory,
  RoadmapItem,
  ScoreAxes,
  Track,
} from "./types";

/**
 * Everything in this file is a deterministic, local heuristic engine standing
 * in for a real LLM backend. It is intentionally isolated behind plain
 * functions (analyzeTrack, nextQuestion, scoreAnswer, summarizeSession) so a
 * real provider call can be swapped in later without touching UI code.
 */

// ---------------------------------------------------------------------------
// Skill extraction
// ---------------------------------------------------------------------------

export const SKILL_DICTIONARY = [
  "javascript", "typescript", "python", "java", "c++", "c#", "go", "rust",
  "react", "next.js", "vue", "angular", "node.js", "express", "graphql",
  "rest", "grpc", "sql", "postgresql", "mysql", "mongodb", "redis",
  "docker", "kubernetes", "aws", "azure", "gcp", "terraform", "ci/cd",
  "microservices", "distributed systems", "system design", "kafka",
  "rabbitmq", "websockets", "oauth", "jwt", "testing", "jest", "cypress",
  "playwright", "tailwind", "css", "html", "webpack", "vite", "git",
  "agile", "scrum", "machine learning", "pytorch", "tensorflow", "pandas",
  "numpy", "data pipelines", "etl", "spark", "airflow", "linux",
  "networking", "security", "encryption", "load balancing", "caching",
  "concurrency", "multithreading", "algorithms", "data structures",
] as const;

export function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  return SKILL_DICTIONARY.filter((skill) => lower.includes(skill));
}

// ---------------------------------------------------------------------------
// Resume <-> Job analysis
// ---------------------------------------------------------------------------

function estimateDifficulty(jobText: string, jobSkillCount: number): Difficulty {
  const lower = jobText.toLowerCase();
  if (/(staff|principal|lead|architect|expert)/.test(lower) || jobSkillCount > 14) {
    return "expert";
  }
  if (/(senior|sr\.)/.test(lower) || jobSkillCount > 9) return "hard";
  if (/(mid|intermediate|ii\b)/.test(lower) || jobSkillCount > 5) return "medium";
  return "easy";
}

function buildRoadmap(missingSkills: string[], weakFocusAreas: string[]): RoadmapItem[] {
  const items: RoadmapItem[] = [];
  missingSkills.slice(0, 5).forEach((skill, i) => {
    items.push({
      id: `gap-${i}`,
      title: `Close the gap on "${skill}"`,
      category: /design|distributed|microservices|kafka|scal/.test(skill)
        ? "system_design"
        : "technical",
      priority: i < 2 ? "high" : "medium",
      rationale: `The target role lists "${skill}" but it wasn't found in your resume — expect at least one question probing it directly.`,
    });
  });
  weakFocusAreas.forEach((area, i) => {
    items.push({
      id: `focus-${i}`,
      title: `Practice ${area} interviews`,
      category: "behavioral",
      priority: "medium",
      rationale: `${area} came up as a likely interview focus area based on the job description's language.`,
    });
  });
  if (items.length === 0) {
    items.push({
      id: "baseline",
      title: "Run a mixed mock interview to establish a baseline",
      category: "behavioral",
      priority: "high",
      rationale: "No major resume/job gaps detected — start with a broad session to find weak spots.",
    });
  }
  return items;
}

const BEHAVIORAL_FOCUS_HINTS: [RegExp, string][] = [
  [/lead|mentor|manag/i, "Leadership"],
  [/conflict|disagreement/i, "Conflict resolution"],
  [/deadline|fast-paced|ambiguity/i, "Working under pressure"],
  [/collaborat|cross-functional|stakeholder/i, "Cross-team collaboration"],
  [/own(ership|er)|autonomous|self-directed/i, "Ownership"],
];

export function analyzeTrack(resumeText: string, jobDescriptionText: string): Track {
  const resumeSkills = extractSkills(resumeText);
  const jobSkills = extractSkills(jobDescriptionText);
  const matchingSkills = jobSkills.filter((s) => resumeSkills.includes(s));
  const missingSkills = jobSkills.filter((s) => !resumeSkills.includes(s));
  const matchPercentage = jobSkills.length
    ? Math.round((matchingSkills.length / jobSkills.length) * 100)
    : 50;

  const focusAreas = BEHAVIORAL_FOCUS_HINTS
    .filter(([regex]) => regex.test(jobDescriptionText))
    .map(([, label]) => label);

  const difficultyEstimate = estimateDifficulty(jobDescriptionText, jobSkills.length);

  return {
    id: `track-${Date.now()}`,
    createdAt: Date.now(),
    resumeText,
    jobDescriptionText,
    extractedResumeSkills: resumeSkills,
    extractedJobSkills: jobSkills,
    matchingSkills,
    missingSkills,
    matchPercentage,
    focusAreas: focusAreas.length ? focusAreas : ["General problem solving"],
    difficultyEstimate,
    roadmap: buildRoadmap(missingSkills, focusAreas),
  };
}

// ---------------------------------------------------------------------------
// Question bank
// ---------------------------------------------------------------------------

interface BankQuestion {
  id: string;
  category: InterviewCategory;
  difficulty: Difficulty;
  prompt: string;
  tags: string[];
}

const QUESTION_BANK: BankQuestion[] = [
  // Behavioral
  { id: "b-e-1", category: "behavioral", difficulty: "easy", prompt: "Tell me about a project you're proud of. What was your role?", tags: ["general"] },
  { id: "b-e-2", category: "behavioral", difficulty: "easy", prompt: "Describe a time you had to learn something new quickly.", tags: ["general"] },
  { id: "b-m-1", category: "behavioral", difficulty: "medium", prompt: "Tell me about a time you disagreed with a teammate's technical decision. What did you do?", tags: ["Conflict resolution"] },
  { id: "b-m-2", category: "behavioral", difficulty: "medium", prompt: "Describe a situation where you had to deliver bad news or push back on a deadline.", tags: ["Working under pressure"] },
  { id: "b-h-1", category: "behavioral", difficulty: "hard", prompt: "Tell me about a time you had to influence a decision without formal authority.", tags: ["Leadership"] },
  { id: "b-h-2", category: "behavioral", difficulty: "hard", prompt: "Describe the hardest cross-functional conflict you've navigated and how you resolved it.", tags: ["Cross-team collaboration"] },
  { id: "b-x-1", category: "behavioral", difficulty: "expert", prompt: "Tell me about a time you owned a decision that turned out to be wrong at significant cost. How did you handle the fallout?", tags: ["Ownership"] },

  // Technical
  { id: "t-e-1", category: "technical", difficulty: "easy", prompt: "What's the difference between `let`, `const`, and `var` in JavaScript?", tags: ["javascript"] },
  { id: "t-e-2", category: "technical", difficulty: "easy", prompt: "Explain the difference between SQL and NoSQL databases.", tags: ["sql", "mongodb"] },
  { id: "t-m-1", category: "technical", difficulty: "medium", prompt: "How would you design a rate limiter for a public API?", tags: ["system design", "caching"] },
  { id: "t-m-2", category: "technical", difficulty: "medium", prompt: "Explain how you'd debug a memory leak in a Node.js service.", tags: ["node.js"] },
  { id: "t-h-1", category: "technical", difficulty: "hard", prompt: "Walk me through how you'd design a distributed cache with eventual consistency guarantees.", tags: ["distributed systems", "caching"] },
  { id: "t-h-2", category: "technical", difficulty: "hard", prompt: "How would you approach zero-downtime schema migrations on a high-traffic Postgres database?", tags: ["postgresql"] },
  { id: "t-x-1", category: "technical", difficulty: "expert", prompt: "Design a multi-region active-active system that must survive a full region outage with no data loss. What do you trade off?", tags: ["distributed systems", "system design"] },

  // Coding
  { id: "c-e-1", category: "coding", difficulty: "easy", prompt: "Write a function that returns whether a string is a palindrome.", tags: ["algorithms"] },
  { id: "c-e-2", category: "coding", difficulty: "easy", prompt: "Given an array of integers, return the two indices whose values sum to a target.", tags: ["algorithms", "data structures"] },
  { id: "c-m-1", category: "coding", difficulty: "medium", prompt: "Implement an LRU cache with O(1) get and put.", tags: ["data structures"] },
  { id: "c-m-2", category: "coding", difficulty: "medium", prompt: "Given a binary tree, return its level-order traversal.", tags: ["data structures", "algorithms"] },
  { id: "c-h-1", category: "coding", difficulty: "hard", prompt: "Find the shortest path in a weighted graph with possibly negative edges (no negative cycles).", tags: ["algorithms"] },
  { id: "c-h-2", category: "coding", difficulty: "hard", prompt: "Design and implement a thread-safe bounded blocking queue.", tags: ["concurrency"] },
  { id: "c-x-1", category: "coding", difficulty: "expert", prompt: "Implement a rate limiter supporting sliding-window counters across a distributed cluster with no single point of failure.", tags: ["distributed systems", "concurrency"] },

  // System Design
  { id: "s-e-1", category: "system_design", difficulty: "easy", prompt: "Design a URL shortener.", tags: ["system design"] },
  { id: "s-m-1", category: "system_design", difficulty: "medium", prompt: "Design a news-feed system for a social app.", tags: ["system design", "distributed systems"] },
  { id: "s-h-1", category: "system_design", difficulty: "hard", prompt: "Design a real-time collaborative document editor (like Google Docs).", tags: ["system design", "distributed systems", "websockets"] },
  { id: "s-x-1", category: "system_design", difficulty: "expert", prompt: "Design a globally distributed payments ledger that must guarantee exactly-once processing under network partitions.", tags: ["distributed systems", "system design"] },
];

function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export function nextQuestion(
  category: InterviewCategory,
  difficulty: Difficulty,
  askedIds: string[],
  focusAreas: string[] = []
): BankQuestion {
  const pool = QUESTION_BANK.filter(
    (q) => q.category === category && q.difficulty === difficulty && !askedIds.includes(q.id)
  );
  const fallbackPool = QUESTION_BANK.filter(
    (q) => q.category === category && !askedIds.includes(q.id)
  );
  const candidates = pool.length ? pool : fallbackPool;
  if (candidates.length === 0) {
    return {
      id: `generated-${askedIds.length}`,
      category,
      difficulty,
      prompt: "Let's go deeper — walk me through a decision you'd revisit if you had more time on your most recent project.",
      tags: [],
    };
  }
  const tagged = candidates.filter((q) => q.tags.some((t) => focusAreas.includes(t)));
  const finalPool = tagged.length ? tagged : candidates;
  const seed = hashString(askedIds.join(",") + category + difficulty);
  return finalPool[seed % finalPool.length];
}

export function followUpFor(question: string, answer: string): string {
  const wordCount = answer.trim().split(/\s+/).filter(Boolean).length;
  if (wordCount < 20) {
    return "Can you go a bit deeper — walk me through the specific steps you took and why?";
  }
  if (!/\b(result|outcome|impact|so |therefore|which led)\b/i.test(answer)) {
    return "What was the actual outcome, and how did you measure it?";
  }
  if (/\b(we|team)\b/i.test(answer) && !/\bI\b/.test(answer)) {
    return "That's helpful context on the team — what was your specific individual contribution?";
  }
  return "Good — if you had to do it again with what you know now, what would you change?";
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

const FILLER_WORDS = ["um", "uh", "like", "you know", "sort of", "kind of", "basically", "actually"];
const HEDGING = ["i think maybe", "i guess", "not really sure", "probably", "i'm not sure"];
const UNPROFESSIONAL = ["stuff", "whatever", "dunno", "gonna", "kinda"];
const STAR_MARKERS = ["situation", "task", "action", "result", "for example", "specifically", "the outcome", "as a result"];

function clamp(n: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, n));
}

export function scoreAnswer(
  question: string,
  answer: string,
  jobSkills: string[] = []
): { scores: ScoreAxes; feedback: string } {
  const text = answer.trim();
  const lower = text.toLowerCase();
  const words = text.split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  const uniqueWords = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z0-9]/g, ""))).size;
  const fillerCount = FILLER_WORDS.reduce(
    (acc, f) => acc + (lower.match(new RegExp(`\\b${f}\\b`, "g"))?.length ?? 0),
    0
  );
  const hedgeCount = HEDGING.reduce((acc, h) => acc + (lower.includes(h) ? 1 : 0), 0);
  const unprofessionalCount = UNPROFESSIONAL.reduce(
    (acc, u) => acc + (lower.match(new RegExp(`\\b${u}\\b`, "g"))?.length ?? 0),
    0
  );
  const starHits = STAR_MARKERS.reduce((acc, m) => acc + (lower.includes(m) ? 1 : 0), 0);
  const hasNumbers = /\d/.test(text);
  const skillMentions = jobSkills.filter((s) => lower.includes(s)).length;

  const completeness = clamp(20 + wordCount * 0.8);
  const structure = clamp(35 + starHits * 16);
  const depth = clamp(25 + (hasNumbers ? 20 : 0) + Math.min(wordCount, 120) * 0.35);
  const communication = clamp(80 - fillerCount * 8 - hedgeCount * 6);
  const confidence = clamp(85 - hedgeCount * 12 - fillerCount * 4);
  const professionalism = clamp(95 - unprofessionalCount * 15);
  const vocabulary = clamp(40 + (wordCount ? (uniqueWords / wordCount) * 100 : 0));
  const grammar = clamp(90 - unprofessionalCount * 5 - (wordCount < 4 ? 30 : 0));
  const technicalAccuracy = clamp(30 + skillMentions * 15 + (hasNumbers ? 10 : 0));

  const scores: ScoreAxes = {
    communication,
    confidence,
    technicalAccuracy,
    depth,
    structure,
    completeness,
    grammar,
    vocabulary,
    professionalism,
  };

  const weakest = (Object.entries(scores) as [keyof ScoreAxes, number][]).sort((a, b) => a[1] - b[1])[0];
  const feedbackMap: Record<keyof ScoreAxes, string> = {
    communication: "Try to cut filler words (\"um\", \"like\") — pause silently instead.",
    confidence: "Avoid hedging language (\"I guess\", \"probably\") — state your reasoning directly.",
    technicalAccuracy: "Anchor your answer with specific technologies or numbers relevant to the role.",
    depth: "Add more concrete detail — what exactly did you do, step by step?",
    structure: "Use a clear Situation → Task → Action → Result shape.",
    completeness: "This answer is quite short — expand with context and outcome.",
    grammar: "Watch sentence structure — keep it clean and complete.",
    vocabulary: "Vary your word choice — you're repeating the same terms.",
    professionalism: "Keep the tone polished — avoid casual filler like \"stuff\" or \"kinda\".",
  };

  return { scores, feedback: feedbackMap[weakest[0]] };
}

export function averageScores(all: ScoreAxes[]): ScoreAxes {
  if (all.length === 0) {
    return {
      communication: 0, confidence: 0, technicalAccuracy: 0, depth: 0,
      structure: 0, completeness: 0, grammar: 0, vocabulary: 0, professionalism: 0,
    };
  }
  const sum = all.reduce((acc, s) => {
    (Object.keys(acc) as (keyof ScoreAxes)[]).forEach((k) => {
      acc[k] += s[k];
    });
    return acc;
  }, { communication: 0, confidence: 0, technicalAccuracy: 0, depth: 0, structure: 0, completeness: 0, grammar: 0, vocabulary: 0, professionalism: 0 } as ScoreAxes);
  (Object.keys(sum) as (keyof ScoreAxes)[]).forEach((k) => {
    sum[k] = Math.round(sum[k] / all.length);
  });
  return sum;
}

export function improvementPlanFrom(scores: ScoreAxes): string[] {
  const sorted = (Object.entries(scores) as [keyof ScoreAxes, number][]).sort((a, b) => a[1] - b[1]);
  const labels: Record<keyof ScoreAxes, string> = {
    communication: "Reduce filler words and speak in complete sentences",
    confidence: "Practice stating conclusions directly instead of hedging",
    technicalAccuracy: "Review core technical concepts tied to your target role",
    depth: "Practice giving more concrete, detailed answers",
    structure: "Drill the STAR method for behavioral answers",
    completeness: "Practice fuller answers that cover context, action, and result",
    grammar: "Slow down and focus on clean sentence construction",
    vocabulary: "Expand technical vocabulary relevant to your target role",
    professionalism: "Keep language polished and interview-appropriate",
  };
  return sorted.slice(0, 3).map(([axis]) => labels[axis]);
}

export function summaryFeedbackFrom(scores: ScoreAxes, category: InterviewCategory): string {
  const avg = Math.round(
    (Object.values(scores) as number[]).reduce((a, b) => a + b, 0) / Object.values(scores).length
  );
  if (avg >= 80) {
    return `Strong ${category.replace("_", " ")} session overall — your answers were structured and specific. Keep sharpening the weaker axes below.`;
  }
  if (avg >= 60) {
    return `Solid foundation in this ${category.replace("_", " ")} session, with clear room to tighten structure and depth in a few answers.`;
  }
  return `This session surfaced real gaps to work on — focus on the improvement plan below before your next ${category.replace("_", " ")} session.`;
}
