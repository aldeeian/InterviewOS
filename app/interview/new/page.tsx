"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useInterviewStore } from "@/lib/store";
import type { Difficulty, InterviewCategory, SessionMode } from "@/lib/types";

const CATEGORY_OPTIONS: { value: InterviewCategory; label: string; description: string }[] = [
  { value: "behavioral", label: "Behavioral", description: "STAR-style situational questions" },
  { value: "technical", label: "Technical", description: "Concepts across the stack" },
  { value: "coding", label: "Coding", description: "Data structures & algorithms" },
  { value: "system_design", label: "System Design", description: "Architecture & trade-offs" },
];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "expert", label: "Expert" },
];

export default function NewInterviewPage() {
  const router = useRouter();
  const createSession = useInterviewStore((s) => s.createSession);
  const latestTrack = useInterviewStore((s) => s.latestTrack());

  const [category, setCategory] = useState<InterviewCategory>("behavioral");
  const [difficulty, setDifficulty] = useState<Difficulty>(latestTrack?.difficultyEstimate ?? "medium");
  const [mode, setMode] = useState<SessionMode>("text");
  const [useTrack, setUseTrack] = useState(!!latestTrack);

  function handleStart() {
    const session = createSession({
      category,
      difficulty,
      mode,
      trackId: useTrack && latestTrack ? latestTrack.id : null,
    });
    router.push(`/interview/${session.id}`);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">New practice session</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Pick a category, difficulty, and mode. You can wire this to a resume/job analysis
            from the Analyze page any time.
          </p>
        </div>

        {latestTrack && (
          <Card>
            <CardContent className="flex items-center justify-between gap-4 pt-5">
              <div>
                <p className="text-sm font-medium">Use your latest analysis</p>
                <p className="text-xs text-muted-foreground">
                  {latestTrack.matchPercentage}% match · focus: {latestTrack.focusAreas.join(", ")}
                </p>
              </div>
              <Button
                size="sm"
                variant={useTrack ? "default" : "outline"}
                onClick={() => setUseTrack((v) => !v)}
              >
                {useTrack ? "Using it" : "Use it"}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">Category</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {CATEGORY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setCategory(opt.value)}
                className={`rounded-md border px-4 py-3 text-left transition-colors ${
                  category === opt.value
                    ? "border-primary bg-primary/10"
                    : "border-border hover:bg-muted"
                }`}
              >
                <p className="text-sm font-medium">{opt.label}</p>
                <p className="text-xs text-muted-foreground">{opt.description}</p>
              </button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">Difficulty</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {DIFFICULTY_OPTIONS.map((opt) => (
              <Button
                key={opt.value}
                size="sm"
                variant={difficulty === opt.value ? "default" : "outline"}
                onClick={() => setDifficulty(opt.value)}
                type="button"
              >
                {opt.label}
              </Button>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">Mode</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-2">
            <Button size="sm" variant={mode === "text" ? "default" : "outline"} onClick={() => setMode("text")} type="button">
              Text
            </Button>
            <Button size="sm" variant={mode === "voice" ? "default" : "outline"} onClick={() => setMode("voice")} type="button">
              Voice
            </Button>
          </CardContent>
        </Card>

        <Button size="lg" onClick={handleStart}>
          Start interview
        </Button>
      </div>
    </AppShell>
  );
}
