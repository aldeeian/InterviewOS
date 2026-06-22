"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { CheckCircle2, Loader2, UploadCloud, XCircle } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScoreRing } from "@/components/ui/score-ring";
import { useInterviewStore } from "@/lib/store";
import type { Difficulty, InterviewCategory, SessionMode, Track } from "@/lib/types";

function TextOrUploadField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [tab, setTab] = useState("paste");
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setFileError(null);
    const isText = file.type === "text/plain" || file.name.toLowerCase().endsWith(".txt");
    if (!isText) {
      setFileError(
        "This local prototype reads .txt files directly. For PDF/DOCX, paste the text instead — extraction wires up to a real backend later."
      );
      setFileName(file.name);
      return;
    }
    const text = await file.text();
    setFileName(file.name);
    onChange(text);
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList>
            <TabsTrigger value="paste">Paste</TabsTrigger>
            <TabsTrigger value="upload">Upload</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsContent value="paste">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="min-h-48"
          />
        </TabsContent>
        <TabsContent value="upload">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex min-h-48 w-full flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-muted/40 text-sm text-muted-foreground transition-colors hover:bg-muted"
          >
            <UploadCloud className="h-6 w-6" />
            <span>{fileName ?? "Click to choose a .txt file"}</span>
            {fileError && (
              <span className="mx-6 mt-1 max-w-sm text-center text-xs text-warning">{fileError}</span>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".txt,text/plain,.pdf,.doc,.docx"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

const CATEGORY_OPTIONS: { value: InterviewCategory; label: string }[] = [
  { value: "behavioral", label: "Behavioral" },
  { value: "technical", label: "Technical" },
  { value: "coding", label: "Coding" },
  { value: "system_design", label: "System Design" },
];

const DIFFICULTY_OPTIONS: { value: Difficulty; label: string }[] = [
  { value: "easy", label: "Easy" },
  { value: "medium", label: "Medium" },
  { value: "hard", label: "Hard" },
  { value: "expert", label: "Expert" },
];

export default function IntakePage() {
  const router = useRouter();
  const addTrack = useInterviewStore((s) => s.addTrack);
  const createSession = useInterviewStore((s) => s.createSession);

  const [resumeText, setResumeText] = useState("");
  const [jobText, setJobText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [track, setTrack] = useState<Track | null>(null);

  const [category, setCategory] = useState<InterviewCategory>("behavioral");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [mode, setMode] = useState<SessionMode>("text");

  async function handleAnalyze() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resumeText, jobDescriptionText: jobText }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "Analysis failed.");
        return;
      }
      const result: Track = data.track;
      addTrack(result);
      setTrack(result);
      setDifficulty(result.difficultyEstimate);
    } catch {
      setError("Something went wrong reaching the analysis service.");
    } finally {
      setLoading(false);
    }
  }

  function handleStart() {
    const session = createSession({ category, difficulty, mode, trackId: track?.id ?? null });
    router.push(`/interview/${session.id}`);
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl space-y-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Resume &amp; job analyzer</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Paste (or upload) your resume and a target job description. We&apos;ll estimate your
            skill match, flag gaps, and build a tailored prep roadmap.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <TextOrUploadField
            label="Your resume"
            value={resumeText}
            onChange={setResumeText}
            placeholder="Paste your resume text here..."
          />
          <TextOrUploadField
            label="Target job description"
            value={jobText}
            onChange={setJobText}
            placeholder="Paste the job description here..."
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">
            <XCircle className="h-4 w-4 shrink-0" /> {error}
          </div>
        )}

        <div className="flex items-center gap-3">
          <Button onClick={handleAnalyze} disabled={loading || (!resumeText.trim() && !jobText.trim())}>
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
            Analyze
          </Button>
          <Button variant="ghost" onClick={() => router.push("/interview/new")}>
            Skip — practice without analysis
          </Button>
        </div>

        {track && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base font-semibold text-foreground">
                Analysis results
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex flex-col items-start gap-6 sm:flex-row">
                <ScoreRing value={track.matchPercentage} label="match" />
                <div className="flex-1 space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">Estimated difficulty: {track.difficultyEstimate}</Badge>
                    {track.focusAreas.map((area) => (
                      <Badge key={area} variant="secondary">
                        {area}
                      </Badge>
                    ))}
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                      Matching skills ({track.matchingSkills.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {track.matchingSkills.length === 0 && (
                        <span className="text-xs text-muted-foreground">None detected yet.</span>
                      )}
                      {track.matchingSkills.map((skill) => (
                        <Badge key={skill} variant="success">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div>
                    <p className="mb-1.5 text-xs font-medium text-muted-foreground">
                      Missing skills ({track.missingSkills.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {track.missingSkills.length === 0 && (
                        <span className="text-xs text-muted-foreground">No gaps detected.</span>
                      )}
                      {track.missingSkills.map((skill) => (
                        <Badge key={skill} variant="danger">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground">Prep roadmap</p>
                <ul className="space-y-2">
                  {track.roadmap.map((item) => (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 rounded-md border border-border bg-muted/30 px-3 py-2"
                    >
                      <Badge
                        variant={item.priority === "high" ? "danger" : "secondary"}
                        className="mt-0.5 shrink-0"
                      >
                        {item.priority}
                      </Badge>
                      <div>
                        <p className="text-sm font-medium">{item.title}</p>
                        <p className="text-xs text-muted-foreground">{item.rationale}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold text-foreground">
              Start a practice session
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Category</p>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_OPTIONS.map((opt) => (
                    <Button
                      key={opt.value}
                      size="sm"
                      variant={category === opt.value ? "default" : "outline"}
                      onClick={() => setCategory(opt.value)}
                      type="button"
                    >
                      {opt.label}
                    </Button>
                  ))}
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Difficulty</p>
                <div className="flex flex-wrap gap-1.5">
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
                </div>
              </div>
              <div>
                <p className="mb-1.5 text-xs font-medium text-muted-foreground">Mode</p>
                <div className="flex flex-wrap gap-1.5">
                  <Button
                    size="sm"
                    variant={mode === "text" ? "default" : "outline"}
                    onClick={() => setMode("text")}
                    type="button"
                  >
                    Text
                  </Button>
                  <Button
                    size="sm"
                    variant={mode === "voice" ? "default" : "outline"}
                    onClick={() => setMode("voice")}
                    type="button"
                  >
                    Voice
                  </Button>
                </div>
              </div>
            </div>
            <Button size="lg" onClick={handleStart}>
              Start interview
            </Button>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
