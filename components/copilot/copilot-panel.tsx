"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, MonitorUp, MonitorX, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "@/lib/speech";
import { useLiveMeetingTranscript } from "@/lib/deepgram-live";
import { useInterviewStore, useStoreHydrated } from "@/lib/store";
import type { AnswerStyle } from "@/lib/ai/copilot-prompt";

type SuggestionSource = "openai" | "gemini" | "claude" | "heuristic" | "none";

const STYLE_OPTIONS: { value: AnswerStyle; label: string; title: string }[] = [
  { value: "bullets", label: "Bullets", title: "5-8 scannable speakable points" },
  { value: "quick", label: "Quick", title: "Fastest possible 2-3 sentence answer" },
  { value: "natural", label: "Natural", title: "Full flowing spoken answer (7-8 points)" },
  { value: "star", label: "STAR", title: "Situation / Task / Action / Result story" },
];

export function CopilotPanel({ compact = false }: { compact?: boolean }) {
  const legacyMic = useSpeechRecognition();
  const live = useLiveMeetingTranscript();
  const hydrated = useStoreHydrated();
  const track = useInterviewStore((s) => s.latestTrack());
  const copilotContext = useInterviewStore((s) => s.copilotContext);
  const answerStyle = useInterviewStore((s) => s.answerStyle);
  const setAnswerStyle = useInterviewStore((s) => s.setAnswerStyle);
  const [answer, setAnswer] = useState("");
  const [source, setSource] = useState<SuggestionSource>("none");
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef("");

  // Deepgram covers the whole meeting (mic + shared tab audio); the browser's
  // built-in Web Speech API is the mic-only fallback when it's not configured.
  const useLiveMode = live.configured === true;
  const transcript = useLiveMode ? live.fullTranscript : legacyMic.transcript;

  useEffect(() => {
    // Key the dedupe on style + transcript so switching styles regenerates
    // the answer even when the transcript hasn't moved.
    const requestKey = `${answerStyle}|${transcript}`;
    if (!transcript.trim() || requestKey === lastSentRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      lastSentRef.current = requestKey;
      setLoading(true);
      try {
        const res = await fetch("/api/copilot/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript,
            resumeText: track?.resumeText ?? "",
            resumeSkills: track?.extractedResumeSkills ?? [],
            jobDescription: copilotContext.jobDescription,
            knowledgeBase: copilotContext.knowledgeBase,
            behaviorInstructions: copilotContext.behaviorInstructions,
            answerStyle,
          }),
        });
        const data = await res.json();
        setAnswer(data.answer ?? "");
        setSource(data.source ?? "heuristic");
      } catch {
        // silent — suggestions are best-effort
      } finally {
        setLoading(false);
      }
    }, 900);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [transcript, track, copilotContext, answerStyle]);

  return (
    <div className={cn("flex flex-col gap-3", compact ? "p-3" : "p-5")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
            {!hydrated ? "Loading…" : track ? "Personalized to your resume" : "No resume loaded"}
          </span>
        </div>

        {useLiveMode ? (
          <div className="flex gap-1.5">
            <Button
              size={compact ? "sm" : "default"}
              variant={live.micActive ? "danger" : "outline"}
              onClick={() => (live.micActive ? live.stop() : live.startMic())}
              disabled={!live.supported}
            >
              {live.micActive ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
              {!compact && (live.micActive ? "Stop mic" : "My mic")}
            </Button>
            <Button
              size={compact ? "sm" : "default"}
              variant={live.tabAudioActive ? "danger" : "outline"}
              onClick={() => (live.tabAudioActive ? live.stop() : live.startTabAudio())}
              disabled={!live.supported}
            >
              {live.tabAudioActive ? (
                <MonitorX className="h-3.5 w-3.5" />
              ) : (
                <MonitorUp className="h-3.5 w-3.5" />
              )}
              {!compact && (live.tabAudioActive ? "Stop tab audio" : "Meeting tab audio")}
            </Button>
          </div>
        ) : legacyMic.supported ? (
          <Button
            size={compact ? "sm" : "default"}
            variant={legacyMic.listening ? "danger" : "outline"}
            onClick={() => (legacyMic.listening ? legacyMic.stop() : legacyMic.start())}
          >
            {legacyMic.listening ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
            {!compact && (legacyMic.listening ? "Stop" : "Start listening")}
          </Button>
        ) : (
          <span className="text-xs text-muted-foreground">Mic not supported in this browser</span>
        )}
      </div>

      {useLiveMode && !compact && (
        <p className="text-xs text-muted-foreground">
          &quot;Meeting tab audio&quot; shares a Zoom/Meet browser tab (check &quot;Share tab audio&quot; in
          the picker) so both sides of the conversation get transcribed — visible to you only, same as any
          notes app.
        </p>
      )}

      {live.error && (
        <p className="rounded-md border border-danger/30 bg-danger/10 px-2 py-1.5 text-xs text-danger">
          {live.error}
        </p>
      )}

      <div
        className={cn(
          "scrollbar-thin overflow-y-auto whitespace-pre-wrap rounded-md border border-border bg-muted/30 text-muted-foreground",
          compact ? "max-h-16 p-2 text-xs" : "max-h-28 p-3 text-sm"
        )}
      >
        {transcript || "Live transcript will appear here once you start listening."}
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <p className={cn("font-medium text-foreground", compact ? "text-xs" : "text-sm")}>
              Your answer {loading && "· updating…"}
            </p>
          {source === "openai" && (
            <Badge variant="accent" className="text-[10px]">
              OpenAI
            </Badge>
          )}
          {source === "gemini" && (
            <Badge variant="accent" className="text-[10px]">
              Gemini
            </Badge>
          )}
          {source === "claude" && (
            <Badge variant="accent" className="text-[10px]">
              Claude
            </Badge>
          )}
          {source === "heuristic" && (
            <Badge variant="secondary" className="text-[10px]">
              Offline mode
            </Badge>
          )}
          </div>
          <div className="flex overflow-hidden rounded-md border border-border" role="group" aria-label="Answer style">
            {STYLE_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                title={option.title}
                onClick={() => setAnswerStyle(option.value)}
                className={cn(
                  "px-2 py-1 font-medium transition-colors",
                  compact ? "text-[10px]" : "text-xs",
                  answerStyle === option.value
                    ? "bg-primary text-primary-foreground"
                    : "bg-transparent text-muted-foreground hover:bg-muted"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        {!answer ? (
          <p className="text-xs text-muted-foreground">
            A full, ready-to-say answer will appear here shortly after they start speaking.
          </p>
        ) : (
          <div
            className={cn(
              "scrollbar-thin overflow-y-auto whitespace-pre-wrap rounded-md border border-primary/20 bg-primary/5 leading-relaxed",
              compact ? "max-h-48 p-2.5 text-xs" : "max-h-80 p-4 text-[15px]"
            )}
          >
            {answer}
          </div>
        )}
      </div>
    </div>
  );
}
