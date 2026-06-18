export type InterviewCategory =
  | "behavioral"
  | "technical"
  | "coding"
  | "system_design";

export type Difficulty = "easy" | "medium" | "hard" | "expert";

export type SessionMode = "text" | "voice";

export interface Track {
  id: string;
  createdAt: number;
  resumeText: string;
  jobDescriptionText: string;
  extractedResumeSkills: string[];
  extractedJobSkills: string[];
  matchingSkills: string[];
  missingSkills: string[];
  matchPercentage: number;
  focusAreas: string[];
  difficultyEstimate: Difficulty;
  roadmap: RoadmapItem[];
}

export interface RoadmapItem {
  id: string;
  title: string;
  category: InterviewCategory;
  priority: "high" | "medium" | "low";
  rationale: string;
}

export interface ScoreAxes {
  communication: number;
  confidence: number;
  technicalAccuracy: number;
  depth: number;
  structure: number;
  completeness: number;
  grammar: number;
  vocabulary: number;
  professionalism: number;
}

export const SCORE_AXES: (keyof ScoreAxes)[] = [
  "communication",
  "confidence",
  "technicalAccuracy",
  "depth",
  "structure",
  "completeness",
  "grammar",
  "vocabulary",
  "professionalism",
];

export interface Turn {
  id: string;
  role: "interviewer" | "candidate";
  content: string;
  createdAt: number;
  scores?: ScoreAxes;
  feedback?: string;
  questionId?: string;
  isFollowUp?: boolean;
}

export interface InterviewSession {
  id: string;
  trackId: string | null;
  category: InterviewCategory;
  difficulty: Difficulty;
  mode: SessionMode;
  status: "in_progress" | "completed";
  startedAt: number;
  endedAt: number | null;
  turns: Turn[];
  overallScores: ScoreAxes | null;
  summaryFeedback: string | null;
  improvementPlan: string[] | null;
}

export interface SessionSetup {
  category: InterviewCategory;
  difficulty: Difficulty;
  mode: SessionMode;
  trackId: string | null;
}
