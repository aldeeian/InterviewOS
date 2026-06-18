import { SCORE_AXES, type InterviewSession, type ScoreAxes } from "./types";

export function completedSessions(sessions: InterviewSession[]): InterviewSession[] {
  return sessions
    .filter((s) => s.status === "completed" && s.overallScores && s.endedAt)
    .sort((a, b) => (a.endedAt ?? 0) - (b.endedAt ?? 0));
}

export function overallAverage(scores: ScoreAxes): number {
  return Math.round(SCORE_AXES.reduce((acc, axis) => acc + scores[axis], 0) / SCORE_AXES.length);
}

export function computeStreak(sessions: InterviewSession[]): { current: number; longest: number } {
  const dates = Array.from(
    new Set(
      completedSessions(sessions).map((s) => new Date(s.endedAt!).toDateString())
    )
  )
    .map((d) => new Date(d).getTime())
    .sort((a, b) => b - a);

  if (dates.length === 0) return { current: 0, longest: 0 };

  const dayMs = 24 * 60 * 60 * 1000;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let current = 0;
  const mostRecentGapDays = Math.round((today.getTime() - dates[0]) / dayMs);
  if (mostRecentGapDays <= 1) {
    current = 1;
    for (let i = 1; i < dates.length; i++) {
      const gap = Math.round((dates[i - 1] - dates[i]) / dayMs);
      if (gap === 1) current++;
      else break;
    }
  }

  let longest = 1;
  let running = 1;
  for (let i = 1; i < dates.length; i++) {
    const gap = Math.round((dates[i - 1] - dates[i]) / dayMs);
    running = gap === 1 ? running + 1 : 1;
    longest = Math.max(longest, running);
  }

  return { current, longest: Math.max(longest, current) };
}

export function weakestAxis(sessions: InterviewSession[]): { axis: keyof ScoreAxes; value: number } | null {
  const done = completedSessions(sessions);
  if (done.length === 0) return null;
  const sums = SCORE_AXES.reduce((acc, axis) => {
    acc[axis] = 0;
    return acc;
  }, {} as ScoreAxes);
  done.forEach((s) => {
    SCORE_AXES.forEach((axis) => {
      sums[axis] += s.overallScores![axis];
    });
  });
  const averaged = SCORE_AXES.map((axis) => ({ axis, value: Math.round(sums[axis] / done.length) }));
  return averaged.sort((a, b) => a.value - b.value)[0];
}

export interface TrendPoint {
  index: number;
  date: string;
  overall: number;
  confidence: number;
  technicalAccuracy: number;
}

export function buildTrend(sessions: InterviewSession[]): TrendPoint[] {
  return completedSessions(sessions).map((s, i) => ({
    index: i + 1,
    date: new Date(s.endedAt!).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
    overall: overallAverage(s.overallScores!),
    confidence: s.overallScores!.confidence,
    technicalAccuracy: s.overallScores!.technicalAccuracy,
  }));
}
