"use client";

import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, MonitorUp, MonitorX, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "@/lib/speech";
import { useLiveMeetingTranscript } from "@/lib/deepgram-live";
import { useInterviewStore } from "@/lib/store";

type SuggestionSource = "gemini" | "claude" | "heuristic" | "none";

export function CopilotPanel({ compact = false }: { compact?: boolean }) {
  const legacyMic = useSpeechRecognition();
  const live = useLiveMeetingTranscript();
  const track = useInterviewStore((s) => s.latestTrack());
  const [bullets, setBullets] = useState<string[]>([]);
  const [source, setSource] = useState<SuggestionSource>("none");
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef("");

  // Deepgram covers the whole meeting (mic + shared tab audio); the browser's
  // built-in Web Speech API is the mic-only fallback when it's not configured.
  const useLiveMode = live.configured === true;
  const transcript = useLiveMode ? live.fullTranscript : legacyMic.transcript;

  useEffect(() => {
    if (!transcript.trim() || transcript === lastSentRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      lastSentRef.current = transcript;
      setLoading(true);
      try {
        const res = await fetch("/api/copilot/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transcript,
            resumeText: track?.resumeText ?? "",
            resumeSkills: track?.extractedResumeSkills ?? [],
          }),
        });
        const data = await res.json();
        setBullets(data.bullets ?? []);
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
  }, [transcript, track]);

  return (
    <div className={cn("flex flex-col gap-3", compact ? "p-3" : "p-5")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
            {track ? "Personalized to your resume" : "No resume loaded"}
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
        <div className="flex items-center gap-2">
          <p className={cn("font-medium text-foreground", compact ? "text-xs" : "text-sm")}>
            Suggested talking points {loading && "· updating…"}
          </p>
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
        {bullets.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Points will appear here shortly after you start speaking.
          </p>
        ) : (
          <ul className={cn("space-y-1.5", compact ? "text-xs" : "text-sm")}>
            {bullets.map((b, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="mt-1 h-1 w-1 shrink-0 rounded-full bg-primary" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
