"use client";

import Link from "next/link";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Flame, ListChecks, Loader2, Target, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MetricCard } from "@/components/dashboard/metric-card";
import { useInterviewStore, useStoreHydrated } from "@/lib/store";
import { buildTrend, completedSessions, computeStreak, overallAverage, weakestAxis } from "@/lib/analytics";

const AXIS_LABELS: Record<string, string> = {
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

export default function DashboardPage() {
  const hydrated = useStoreHydrated();
  const sessions = useInterviewStore((s) => s.sessions);

  if (!hydrated) {
    return (
      <AppShell>
        <div className="flex h-64 items-center justify-center text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      </AppShell>
    );
  }

  const done = completedSessions(sessions);
  const streak = computeStreak(sessions);
  const trend = buildTrend(sessions);
  const weakest = weakestAxis(sessions);
  const recent = [...sessions].sort((a, b) => b.startedAt - a.startedAt).slice(0, 8);

  if (done.length === 0) {
    return (
      <AppShell>
        <div className="mx-auto max-w-md space-y-4 py-16 text-center">
          <p className="text-lg font-medium">No completed sessions yet</p>
          <p className="text-sm text-muted-foreground">
            Finish a practice session to start seeing your trends here.
          </p>
          <Link href="/interview/new">
            <Button>Start practicing</Button>
          </Link>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Performance dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {done.length} completed session{done.length === 1 ? "" : "s"} tracked locally.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard icon={Flame} label="Current streak" value={`${streak.current} day${streak.current === 1 ? "" : "s"}`} hint={`Longest: ${streak.longest}`} />
          <MetricCard icon={ListChecks} label="Sessions completed" value={String(done.length)} />
          <MetricCard
            icon={TrendingUp}
            label="Latest overall score"
            value={String(overallAverage(done[done.length - 1].overallScores!))}
            hint={done.length > 1 ? `Was ${overallAverage(done[done.length - 2].overallScores!)} last time` : undefined}
          />
          <MetricCard
            icon={Target}
            label="Weakest area"
            value={weakest ? AXIS_LABELS[weakest.axis] : "—"}
            hint={weakest ? `Avg ${weakest.value}/100` : undefined}
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">Progress over time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trend}>
                  <defs>
                    <linearGradient id="overallGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-primary)" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="var(--color-primary)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                  <YAxis domain={[0, 100]} tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="overall"
                    stroke="var(--color-primary)"
                    fill="url(#overallGradient)"
                    strokeWidth={2}
                    name="Overall score"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">Recent sessions</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="px-5 py-2 font-medium">Date</th>
                    <th className="px-5 py-2 font-medium">Category</th>
                    <th className="px-5 py-2 font-medium">Difficulty</th>
                    <th className="px-5 py-2 font-medium">Status</th>
                    <th className="px-5 py-2 font-medium">Score</th>
                    <th className="px-5 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {recent.map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-2.5 text-muted-foreground">
                        {new Date(s.startedAt).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-2.5 capitalize">{s.category.replace("_", " ")}</td>
                      <td className="px-5 py-2.5 capitalize">{s.difficulty}</td>
                      <td className="px-5 py-2.5">
                        <Badge variant={s.status === "completed" ? "success" : "secondary"}>
                          {s.status === "completed" ? "Completed" : "In progress"}
                        </Badge>
                      </td>
                      <td className="px-5 py-2.5">
                        {s.overallScores ? overallAverage(s.overallScores) : "—"}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        <Link
                          href={s.status === "completed" ? `/interview/${s.id}/feedback` : `/interview/${s.id}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
