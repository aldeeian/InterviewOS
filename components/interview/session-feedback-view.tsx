"use client";

import { useRouter } from "next/navigation";
import {
  PolarAngleAxis,
  PolarGrid,
  Radar,
  RadarChart,
  ResponsiveContainer,
} from "recharts";
import { Loader2, RotateCcw } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreRing } from "@/components/ui/score-ring";
import { useInterviewStore, useStoreHydrated } from "@/lib/store";
import { SCORE_AXES, type ScoreAxes } from "@/lib/types";

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

export function SessionFeedbackView({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const hydrated = useStoreHydrated();
  const session = useInterviewStore((s) => s.getSession(sessionId));
  const createSession = useInterviewStore((s) => s.createSession);

  if (!hydrated) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </AppShell>
    );
  }

  if (!session) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md space-y-4 text-center">
          <p className="text-lg font-medium">Session not found</p>
          <Button onClick={() => router.push("/interview/new")}>Start a new session</Button>
        </div>
      </AppShell>
    );
  }

  if (session.status !== "completed" || !session.overallScores) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md space-y-4 text-center">
          <p className="text-lg font-medium">This session isn&apos;t finished yet</p>
          <p className="text-sm text-muted-foreground">
            Finish or end the session to see the full feedback report.
          </p>
          <Button onClick={() => router.push(`/interview/${session.id}`)}>Return to session</Button>
        </div>
      </AppShell>
    );
  }

  const radarData = SCORE_AXES.map((axis) => ({
    axis: AXIS_LABELS[axis],
    value: session.overallScores![axis],
  }));

  const overallAvg = Math.round(
    SCORE_AXES.reduce((acc, axis) => acc + session.overallScores![axis], 0) / SCORE_AXES.length
  );

  function handlePracticeAgain() {
    const newSession = createSession({
      category: session!.category,
      difficulty: session!.difficulty,
      mode: session!.mode,
      trackId: session!.trackId,
    });
    router.push(`/interview/${newSession.id}`);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Session feedback</h1>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {session.category.replace("_", " ")}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {session.difficulty}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {new Date(session.startedAt).toLocaleString()}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Dashboard
            </Button>
            <Button onClick={handlePracticeAgain}>
              <RotateCcw className="h-4 w-4" /> Practice again
            </Button>
          </div>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center gap-6 pt-6 sm:flex-row">
            <ScoreRing value={overallAvg} size={120} label="overall" />
            <div className="flex-1">
              <p className="text-sm leading-relaxed text-muted-foreground">{session.summaryFeedback}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">Score breakdown</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={radarData} outerRadius="75%">
                  <PolarGrid stroke="var(--color-border)" />
                  <PolarAngleAxis
                    dataKey="axis"
                    tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                  />
                  <Radar
                    dataKey="value"
                    stroke="var(--color-primary)"
                    fill="var(--color-primary)"
                    fillOpacity={0.35}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-3">
              {SCORE_AXES.map((axis) => (
                <div key={axis} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{AXIS_LABELS[axis]}</span>
                  <span className="font-medium">{session.overallScores![axis]}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              What to work on next
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {session.improvementPlan?.map((item, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">
                    {i + 1}
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">Transcript</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {session.turns.map((turn) => (
              <div
                key={turn.id}
                className={
                  turn.role === "interviewer"
                    ? "rounded-md bg-muted/50 px-3 py-2 text-sm"
                    : "rounded-md border border-border px-3 py-2 text-sm"
                }
              >
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {turn.role === "interviewer" ? "Interviewer" : "You"}
                </p>
                <p>{turn.content}</p>
                {turn.feedback && (
                  <p className="mt-1 text-xs text-muted-foreground">Note: {turn.feedback}</p>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
