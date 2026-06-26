"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Loader2, Mic, MicOff, Send, Square } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { ChatBubble } from "@/components/interview/chat-bubble";
import { LiveAssessmentPanel } from "@/components/interview/live-assessment-panel";
import { useInterviewStore, useStoreHydrated } from "@/lib/store";
import { useSpeechRecognition, useSpeechSynthesis } from "@/lib/speech";
import { averageScores, improvementPlanFrom, summaryFeedbackFrom } from "@/lib/mock-ai";
import type { Turn } from "@/lib/types";

function useElapsed(startedAt: number, active: boolean) {
  const [elapsed, setElapsed] = useState(() => Date.now() - startedAt);
  useEffect(() => {
    if (!active) return;
    const interval = setInterval(() => setElapsed(Date.now() - startedAt), 1000);
    return () => clearInterval(interval);
  }, [startedAt, active]);
  const totalSeconds = Math.floor(elapsed / 1000);
  const mm = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const ss = String(totalSeconds % 60).padStart(2, "0");
  return `${mm}:${ss}`;
}

export function InterviewSessionView({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const hydrated = useStoreHydrated();
  const session = useInterviewStore((s) => s.getSession(sessionId));
  const track = useInterviewStore((s) => s.getTrack(session?.trackId ?? null));
  const updateSession = useInterviewStore((s) => s.updateSession);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionText, setCurrentQuestionText] = useState<string>("");
  const [currentFollowUpCount, setCurrentFollowUpCount] = useState(0);
  const initiatedRef = useRef(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const recognition = useSpeechRecognition();
  const synthesis = useSpeechSynthesis();
  const elapsed = useElapsed(session?.startedAt ?? 0, session?.status === "in_progress");

  const askedQuestionIds = (session?.turns ?? [])
    .filter((t) => t.role === "interviewer" && t.questionId && t.questionId !== "followup")
    .map((t) => t.questionId!) as string[];

  async function fetchNext(answerPayload?: { answer: string; currentQuestion: string }) {
    if (!session) return;
    setThinking(true);
    setError(null);
    try {
      const res = await fetch("/api/interview/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: session.category,
          difficulty: session.difficulty,
          jobSkills: track?.extractedJobSkills ?? [],
          focusAreas: track?.focusAreas ?? [],
          askedQuestionIds,
          currentQuestion: answerPayload?.currentQuestion,
          currentQuestionFollowUps: currentFollowUpCount,
          answer: answerPayload?.answer,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error?.message ?? "The interviewer service failed to respond.");
        return;
      }

      updateSession(session.id, (s) => {
        const turns = [...s.turns];
        if (answerPayload && data.scores) {
          const lastIdx = turns.length - 1;
          if (turns[lastIdx]?.role === "candidate") {
            turns[lastIdx] = { ...turns[lastIdx], scores: data.scores, feedback: data.feedback };
          }
        }
        const interviewerTurn: Turn = {
          id: `turn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          role: "interviewer",
          content: data.reply,
          createdAt: Date.now(),
          questionId: data.questionId,
          isFollowUp: !data.isNewQuestion,
        };
        turns.push(interviewerTurn);
        return { ...s, turns };
      });

      setCurrentQuestionText(data.reply);
      setCurrentFollowUpCount(data.isNewQuestion ? 0 : currentFollowUpCount + 1);
      if (session.mode === "voice") synthesis.speak(data.reply);
    } catch {
      setError("Couldn't reach the interviewer service. Try again.");
    } finally {
      setThinking(false);
    }
  }

  useEffect(() => {
    if (!session || initiatedRef.current) return;
    if (session.turns.length === 0 && session.status === "in_progress") {
      initiatedRef.current = true;
      // Fetch-on-mount to kick off the interviewer's opening question.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void fetchNext();
    } else if (session.turns.length > 0) {
      const lastInterviewer = [...session.turns].reverse().find((t) => t.role === "interviewer");
      if (lastInterviewer) setCurrentQuestionText(lastInterviewer.content);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [session?.turns.length, thinking]);

  useEffect(() => {
    // Syncs live speech-recognition transcript (external system) into React state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (recognition.transcript) setInput(recognition.transcript);
  }, [recognition.transcript]);

  function handleSend() {
    if (!session || !input.trim() || thinking) return;
    const answerText = input.trim();
    const candidateTurn: Turn = {
      id: `turn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      role: "candidate",
      content: answerText,
      createdAt: Date.now(),
    };
    updateSession(session.id, (s) => ({ ...s, turns: [...s.turns, candidateTurn] }));
    setInput("");
    recognition.reset();
    void fetchNext({ answer: answerText, currentQuestion: currentQuestionText });
  }

  function handleEnd() {
    if (!session) return;
    updateSession(session.id, (s) => {
      const scored = s.turns.filter((t) => t.scores).map((t) => t.scores!);
      const overall = averageScores(scored);
      return {
        ...s,
        status: "completed",
        endedAt: Date.now(),
        overallScores: overall,
        summaryFeedback: summaryFeedbackFrom(overall, s.category),
        improvementPlan: improvementPlanFrom(overall),
      };
    });
    router.push(`/interview/${session.id}/feedback`);
  }

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
          <p className="text-sm text-muted-foreground">
            It may have been on a different device or cleared from local storage.
          </p>
          <Button onClick={() => router.push("/interview/new")}>Start a new session</Button>
        </div>
      </AppShell>
    );
  }

  const answeredCount = session.turns.filter((t) => t.role === "candidate").length;

  return (
    <AppShell>
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline" className="capitalize">
                {session.category.replace("_", " ")}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {session.difficulty}
              </Badge>
              <Badge variant="secondary" className="capitalize">
                {session.mode}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {answeredCount} answer{answeredCount === 1 ? "" : "s"} · {elapsed}
              </span>
            </div>
            {session.status === "in_progress" ? (
              <Button size="sm" variant="outline" onClick={handleEnd} disabled={answeredCount === 0}>
                <Square className="h-3.5 w-3.5" /> End session
              </Button>
            ) : (
              <Button size="sm" onClick={() => router.push(`/interview/${session.id}/feedback`)}>
                View feedback
              </Button>
            )}
          </div>

          <Card className="flex h-[60vh] flex-col overflow-hidden">
            <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-4 overflow-y-auto p-5">
              {session.turns.map((turn) => (
                <ChatBubble key={turn.id} turn={turn} />
              ))}
              {thinking && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Interviewer is thinking…
                </div>
              )}
            </div>

            {session.status === "in_progress" && (
              <div className="border-t border-border p-4">
                {error && <p className="mb-2 text-xs text-danger">{error}</p>}
                <div className="flex items-end gap-2">
                  <Textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    placeholder={
                      session.mode === "voice"
                        ? "Speak, or type your answer here…"
                        : "Type your answer… (Enter to send, Shift+Enter for a new line)"
                    }
                    className="min-h-16"
                    disabled={thinking}
                  />
                  {session.mode === "voice" && recognition.supported && (
                    <Button
                      type="button"
                      variant={recognition.listening ? "danger" : "outline"}
                      size="icon"
                      onClick={() => (recognition.listening ? recognition.stop() : recognition.start())}
                      aria-label={recognition.listening ? "Stop recording" : "Start recording"}
                    >
                      {recognition.listening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                    </Button>
                  )}
                  <Button type="button" onClick={handleSend} disabled={thinking || !input.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {session.mode === "voice" && !recognition.supported && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Voice input isn&apos;t supported in this browser — falling back to text.
                  </p>
                )}
              </div>
            )}
          </Card>
        </div>

        <LiveAssessmentPanel turns={session.turns} thinking={thinking} />
      </div>
    </AppShell>
  );
}
