"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { SCORE_AXES, type ScoreAxes, type Turn } from "@/lib/types";
import { averageScores } from "@/lib/mock-ai";

const AXIS_LABELS: Record<keyof ScoreAxes, string> = {
  communication: "Communication",
  confidence: "Confidence",
  technicalAccuracy: "Technical accuracy",
  depth: "Depth",
  structure: "Structure",
  completeness: "Completeness",
  grammar: "Grammar",
  vocabulary: "Vocabulary",
  professionalism: "Professionalism",
};

export function LiveAssessmentPanel({ turns, thinking }: { turns: Turn[]; thinking: boolean }) {
  const scored = turns.filter((t) => t.scores).map((t) => t.scores!) as ScoreAxes[];
  const avg = averageScores(scored);
  const answeredCount = scored.length;

  return (
    <Card className="sticky top-6">
      <CardHeader>
        <CardTitle className="text-base font-semibold text-foreground">Live assessment</CardTitle>
        <p className="text-xs text-muted-foreground">
          {answeredCount === 0
            ? "Scores appear after your first answer."
            : `Based on ${answeredCount} answer${answeredCount === 1 ? "" : "s"} so far.`}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {SCORE_AXES.map((axis) => (
          <div key={axis}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-muted-foreground">{AXIS_LABELS[axis]}</span>
              <span className="font-medium">{answeredCount ? avg[axis] : "—"}</span>
            </div>
            <Progress value={answeredCount ? avg[axis] : 0} />
          </div>
        ))}
        {thinking && (
          <p className="pt-1 text-xs text-muted-foreground">Interviewer is scoring your last answer…</p>
        )}
      </CardContent>
    </Card>
  );
}
