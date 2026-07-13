"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Download,
  FileText,
  Keyboard,
  Mic,
  MicOff,
  MonitorUp,
  MonitorX,
  Send,
  Settings,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useSpeechRecognition } from "@/lib/speech";
import { useLiveMeetingTranscript } from "@/lib/deepgram-live";
import { extractLastQuestion, useTranscriptWindow } from "@/lib/transcript-window";
import { downloadMarkdown } from "@/lib/download";
import { LevelMeter } from "@/components/copilot/level-meter";
import { PinButton, SuggestionHistory } from "@/components/copilot/suggestion-history";
import { RecapDialog } from "@/components/copilot/recap-dialog";
import {
  useInterviewStore,
  useStoreHydrated,
  type CopilotProviderPref,
  type CopilotSpeedPref,
  type SuggestionSource,
} from "@/lib/store";
import type { AnswerStyle } from "@/lib/ai/copilot-prompt";

type PanelSource = SuggestionSource | "none";

const STYLE_OPTIONS: { value: AnswerStyle; label: string; title: string }[] = [
  { value: "bullets", label: "Bullets", title: "5-8 scannable speakable points" },
  { value: "quick", label: "Quick", title: "Fastest possible 2-3 sentence answer" },
  { value: "natural", label: "Natural", title: "Full flowing spoken answer (7-8 points)" },
  { value: "star", label: "STAR", title: "Situation / Task / Action / Result story" },
];

const SPEED_OPTIONS: { value: CopilotSpeedPref; label: string; title: string }[] = [
  { value: "deep", label: "Depth", title: "Default models — strongest answers" },
  { value: "fast", label: "Speed", title: "Faster, cheaper models — lower latency" },
];

const PROVIDER_OPTIONS: { value: CopilotProviderPref; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "openai", label: "OpenAI" },
  { value: "gemini", label: "Gemini" },
  { value: "claude", label: "Claude" },
];

function newEntryId() {
  return `suggestion-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function CopilotPanel({ compact = false }: { compact?: boolean }) {
  const legacyMic = useSpeechRecognition();
  const live = useLiveMeetingTranscript();
  const hydrated = useStoreHydrated();
  const track = useInterviewStore((s) => s.latestTrack());
  const copilotContext = useInterviewStore((s) => s.copilotContext);
  const answerStyle = useInterviewStore((s) => s.answerStyle);
  const setAnswerStyle = useInterviewStore((s) => s.setAnswerStyle);
  const addHistoryEntry = useInterviewStore((s) => s.addCopilotHistoryEntry);
  const historyCount = useInterviewStore((s) => s.copilotHistory.length);
  const pinnedEntry = useInterviewStore((s) => s.copilotHistory.find((e) => e.pinned));
  const preferredSpeed = useInterviewStore((s) => s.preferredSpeed);
  const setPreferredSpeed = useInterviewStore((s) => s.setPreferredSpeed);
  const preferredProvider = useInterviewStore((s) => s.preferredProvider);
  const setPreferredProvider = useInterviewStore((s) => s.setPreferredProvider);

  const [answer, setAnswer] = useState("");
  const [source, setSource] = useState<PanelSource>("none");
  const [loading, setLoading] = useState(false);
  const [currentEntryId, setCurrentEntryId] = useState<string | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [askText, setAskText] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [recapOpen, setRecapOpen] = useState(false);
  const [recapLoading, setRecapLoading] = useState(false);
  const [recapText, setRecapText] = useState<string | null>(null);
  const [recapError, setRecapError] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSentRef = useRef("");
  const requestSeqRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);

  // Deepgram covers the whole meeting (mic + shared tab audio); the browser's
  // built-in Web Speech API is the mic-only fallback when it's not configured.
  const useLiveMode = live.configured === true;
  const transcript = useLiveMode ? live.fullTranscript : legacyMic.transcript;

  // Long meetings: older transcript gets folded into a running summary so we
  // stop resending the whole meeting on every request. UI box is unaffected.
  const windowed = useTranscriptWindow(transcript);
  const windowedRef = useRef(windowed);
  windowedRef.current = windowed;

  const detectedQuestion = useMemo(() => extractLastQuestion(transcript), [transcript]);

  const runSuggest = useCallback(
    async (sendTranscript: string, question: string | null, summary: string) => {
      const seq = ++requestSeqRef.current;
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      setLoading(true);
      try {
        const prefs = useInterviewStore.getState();
        const res = await fetch("/api/copilot/suggest", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            transcript: sendTranscript,
            transcriptSummary: summary,
            lastDetectedQuestion: question ?? "",
            resumeText: track?.resumeText ?? "",
            resumeSkills: track?.extractedResumeSkills ?? [],
            jobDescription: copilotContext.jobDescription,
            knowledgeBase: copilotContext.knowledgeBase,
            behaviorInstructions: copilotContext.behaviorInstructions,
            answerStyle,
            stream: true,
            preferredSpeed: prefs.preferredSpeed,
            preferredProvider: prefs.preferredProvider === "auto" ? undefined : prefs.preferredProvider,
          }),
        });

        let finalAnswer = "";
        let finalSource: PanelSource = "heuristic";
        const contentType = res.headers.get("content-type") ?? "";

        if (contentType.includes("application/json")) {
          // Heuristic / non-streaming fallback path.
          const data = await res.json();
          if (seq !== requestSeqRef.current) return;
          finalAnswer = data.answer ?? "";
          finalSource = data.source ?? "heuristic";
          setAnswer(finalAnswer);
          setSource(finalSource);
        } else {
          // Streaming path: render text incrementally; the "updating…"
          // indicator only covers the gap before the first token.
          finalSource = (res.headers.get("x-copilot-source") as PanelSource) ?? "heuristic";
          const reader = res.body?.getReader();
          if (!reader) return;
          const decoder = new TextDecoder();
          let acc = "";
          let firstToken = true;
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            if (seq !== requestSeqRef.current) {
              void reader.cancel();
              return;
            }
            acc += decoder.decode(value, { stream: true });
            if (firstToken) {
              setSource(finalSource);
              setLoading(false);
              firstToken = false;
            }
            setAnswer(acc);
          }
          finalAnswer = acc;
        }

        if (finalAnswer.trim() && seq === requestSeqRef.current && finalSource !== "none") {
          const id = newEntryId();
          addHistoryEntry({
            id,
            timestamp: Date.now(),
            triggerTranscriptSnippet: sendTranscript.slice(-200),
            answerStyle,
            answer: finalAnswer,
            source: finalSource,
            pinned: false,
          });
          setCurrentEntryId(id);
        }
      } catch {
        // silent — suggestions are best-effort (includes deliberate aborts)
      } finally {
        if (seq === requestSeqRef.current) setLoading(false);
      }
    },
    [track, copilotContext, answerStyle, addHistoryEntry]
  );

  useEffect(() => {
    // Key the dedupe on style + transcript so switching styles regenerates
    // the answer even when the transcript hasn't moved.
    const requestKey = `${answerStyle}|${transcript}`;
    if (!transcript.trim() || requestKey === lastSentRef.current) return;

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      lastSentRef.current = requestKey;
      const w = windowedRef.current;
      void runSuggest(w.recentTranscript, extractLastQuestion(transcript), w.runningSummary);
    }, 900);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [transcript, answerStyle, runSuggest]);

  const submitAsk = useCallback(() => {
    const text = askText.trim();
    if (!text || loading) return;
    setAskText("");
    const w = windowedRef.current;
    // The typed text joins the transcript as a "Them" turn so it benefits
    // from the same context and grounding rules as spoken questions.
    const sendTranscript = [w.recentTranscript.trim(), `Them: ${text}`].filter(Boolean).join("\n");
    void runSuggest(sendTranscript, text, w.runningSummary);
  }, [askText, loading, runSuggest]);

  const anyListening = useLiveMode ? live.micActive || live.tabAudioActive : legacyMic.listening;

  const endAndSummarize = useCallback(async () => {
    if (useLiveMode) live.stop();
    else legacyMic.stop();
    setRecapOpen(true);
    setRecapLoading(true);
    setRecapText(null);
    setRecapError(null);
    try {
      const history = useInterviewStore.getState().copilotHistory;
      const res = await fetch("/api/copilot/recap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript,
          history: history.map((h) => ({
            timestamp: h.timestamp,
            answerStyle: h.answerStyle,
            answer: h.answer,
          })),
        }),
      });
      const data = (await res.json()) as { recap?: string | null };
      if (data.recap) setRecapText(data.recap);
      else setRecapError("No AI provider is configured/reachable, so a recap couldn't be generated. You can still use \"Download session\" for the raw transcript and suggestions.");
    } catch {
      setRecapError("Recap generation failed — check your connection and try again.");
    } finally {
      setRecapLoading(false);
    }
  }, [useLiveMode, live, legacyMic, transcript]);

  const downloadSession = useCallback(() => {
    const now = new Date();
    const history = useInterviewStore.getState().copilotHistory;
    const lines: string[] = [`# Live Copilot session — ${now.toLocaleString()}`, "", "## Transcript", ""];
    if (useLiveMode && live.entries.length > 0) {
      for (const entry of live.entries.slice().sort((a, b) => a.updatedAt - b.updatedAt)) {
        const time = new Date(entry.updatedAt).toLocaleTimeString();
        lines.push(`- **[${time}] ${entry.speaker === "you" ? "You" : "Them"}:** ${entry.text}`);
      }
    } else {
      lines.push(transcript || "_(empty)_");
    }
    lines.push("", "## AI suggestions", "");
    if (history.length === 0) {
      lines.push("_(none this session)_");
    } else {
      for (const h of history.slice().sort((a, b) => a.timestamp - b.timestamp)) {
        lines.push(`### ${new Date(h.timestamp).toLocaleTimeString()} · ${h.answerStyle} · ${h.source}`, "", h.answer, "");
      }
    }
    downloadMarkdown(lines.join("\n"), `copilot-session-${now.toISOString().slice(0, 19).replace(/[T:]/g, "-")}.md`);
  }, [useLiveMode, live.entries, transcript]);

  return (
    <div className={cn("flex flex-col gap-3", compact ? "p-3" : "p-5")}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className={cn("font-medium", compact ? "text-xs" : "text-sm")}>
            {!hydrated ? "Loading…" : track ? "Personalized to your resume" : "No resume loaded"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {useLiveMode ? (
            <>
              <LevelMeter stream={live.micStream} />
              <Button
                size={compact ? "sm" : "default"}
                variant={live.micActive ? "danger" : "outline"}
                onClick={() => (live.micActive ? live.stop() : live.startMic())}
                disabled={!live.supported}
              >
                {live.micActive ? <MicOff className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                {!compact && (live.micActive ? "Stop mic" : "My mic")}
              </Button>
              <LevelMeter stream={live.tabStream} />
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
            </>
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
          {!compact && (
            <Button
              size="sm"
              variant="outline"
              title="Response settings"
              onClick={() => setSettingsOpen((v) => !v)}
              className={cn(settingsOpen && "bg-muted")}
            >
              <Settings className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {settingsOpen && !compact && (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-md border border-border bg-muted/30 px-3 py-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground">Response</span>
            <div className="flex overflow-hidden rounded-md border border-border" role="group" aria-label="Response speed vs. depth">
              {SPEED_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  title={option.title}
                  onClick={() => setPreferredSpeed(option.value)}
                  className={cn(
                    "px-2 py-1 text-xs font-medium transition-colors",
                    hydrated && preferredSpeed === option.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent text-muted-foreground hover:bg-muted"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-foreground">Provider</span>
            <div className="flex overflow-hidden rounded-md border border-border" role="group" aria-label="Preferred provider">
              {PROVIDER_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPreferredProvider(option.value)}
                  className={cn(
                    "px-2 py-1 text-xs font-medium transition-colors",
                    hydrated && preferredProvider === option.value
                      ? "bg-primary text-primary-foreground"
                      : "bg-transparent text-muted-foreground hover:bg-muted"
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <p className="w-full text-[10px] text-muted-foreground">
            Unavailable providers still fall back automatically — this only changes what gets tried first.
          </p>
        </div>
      )}

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

      <div>
        <button
          type="button"
          onClick={() => setAskOpen((v) => !v)}
          className={cn(
            "flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-foreground",
            compact ? "text-[10px]" : "text-xs"
          )}
        >
          <Keyboard className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
          Type instead
        </button>
        {askOpen && (
          <form
            className="mt-1.5 flex items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              submitAsk();
            }}
          >
            <Input
              value={askText}
              onChange={(e) => setAskText(e.target.value)}
              placeholder="Type a question or something from the chat/screen…"
              className={compact ? "h-8 text-xs" : "h-9 text-sm"}
              autoFocus
            />
            <Button type="submit" size="sm" variant="outline" disabled={!askText.trim() || loading}>
              <Send className="h-3.5 w-3.5" />
              {!compact && "Ask"}
            </Button>
          </form>
        )}
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

        {detectedQuestion && (
          <p className={cn("text-muted-foreground", compact ? "text-[10px]" : "text-xs")}>
            <span className="font-medium text-foreground/80">Detected question:</span> {detectedQuestion}
          </p>
        )}

        {pinnedEntry && (
          <div
            className={cn(
              "scrollbar-thin overflow-y-auto whitespace-pre-wrap rounded-md border border-warning/40 bg-warning/5 leading-relaxed",
              compact ? "max-h-40 p-2.5 text-xs" : "max-h-64 p-4 text-[15px]"
            )}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className={cn("font-medium text-warning", compact ? "text-[10px]" : "text-xs")}>Pinned</span>
              <PinButton entryId={pinnedEntry.id} pinned compact={compact} />
            </div>
            {pinnedEntry.answer}
          </div>
        )}

        {!answer ? (
          !pinnedEntry && (
            <p className="text-xs text-muted-foreground">
              A full, ready-to-say answer will appear here shortly after they start speaking.
            </p>
          )
        ) : pinnedEntry && pinnedEntry.answer === answer ? null : (
          <div
            className={cn(
              "scrollbar-thin overflow-y-auto whitespace-pre-wrap rounded-md border border-primary/20 bg-primary/5 leading-relaxed",
              compact ? "max-h-48 p-2.5 text-xs" : "max-h-80 p-4 text-[15px]"
            )}
          >
            {currentEntryId && !loading && (
              <div className="float-right ml-2">
                <PinButton entryId={currentEntryId} pinned={false} compact={compact} />
              </div>
            )}
            {answer}
          </div>
        )}

        <SuggestionHistory compact={compact} />
      </div>

      {!compact && (transcript.trim() || anyListening || historyCount > 0) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Button size="sm" variant="outline" onClick={() => void endAndSummarize()}>
            <FileText className="h-3.5 w-3.5" /> End &amp; summarize
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={downloadSession}
            disabled={!transcript.trim() && historyCount === 0}
          >
            <Download className="h-3.5 w-3.5" /> Download session
          </Button>
        </div>
      )}

      {recapOpen && (
        <RecapDialog
          recap={recapText}
          loading={recapLoading}
          error={recapError}
          onClose={() => setRecapOpen(false)}
        />
      )}
    </div>
  );
}
