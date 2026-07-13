"use client";

import { useState } from "react";
import { Check, ChevronDown, ChevronRight, Copy, Pin, PinOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useInterviewStore, type CopilotHistoryEntry } from "@/lib/store";

function formatTime(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

const SOURCE_LABELS: Record<CopilotHistoryEntry["source"], string> = {
  openai: "OpenAI",
  gemini: "Gemini",
  claude: "Claude",
  heuristic: "Offline",
};

function CopyButton({ text, compact }: { text: string; compact: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      title="Copy answer"
      onClick={() => {
        void navigator.clipboard.writeText(text).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        });
      }}
      className="rounded p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {copied ? (
        <Check className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      ) : (
        <Copy className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      )}
    </button>
  );
}

export function PinButton({
  entryId,
  pinned,
  compact = false,
}: {
  entryId: string;
  pinned: boolean;
  compact?: boolean;
}) {
  const togglePin = useInterviewStore((s) => s.toggleCopilotPin);
  return (
    <button
      type="button"
      title={pinned ? "Unpin — go back to live answers" : "Pin — keep this answer on top"}
      onClick={() => togglePin(entryId)}
      className={cn(
        "rounded p-1 transition-colors hover:bg-muted",
        pinned ? "text-warning" : "text-muted-foreground hover:text-foreground"
      )}
    >
      {pinned ? (
        <PinOff className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      ) : (
        <Pin className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
      )}
    </button>
  );
}

/**
 * Collapsible list of every suggestion generated this session, newest first.
 * Session-scoped — cleared when the Live Copilot page mounts.
 */
export function SuggestionHistory({ compact = false }: { compact?: boolean }) {
  const history = useInterviewStore((s) => s.copilotHistory);
  const [open, setOpen] = useState(false);

  if (history.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex items-center gap-1 font-medium text-muted-foreground transition-colors hover:text-foreground",
          compact ? "text-[10px]" : "text-xs"
        )}
      >
        {open ? (
          <ChevronDown className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        ) : (
          <ChevronRight className={compact ? "h-3 w-3" : "h-3.5 w-3.5"} />
        )}
        History ({history.length})
      </button>
      {open && (
        <div className={cn("scrollbar-thin space-y-2 overflow-y-auto", compact ? "max-h-40" : "max-h-72")}>
          {history.map((entry) => (
            <div
              key={entry.id}
              className={cn(
                "rounded-md border bg-muted/20",
                entry.pinned ? "border-warning/40" : "border-border",
                compact ? "p-2" : "p-2.5"
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className={cn("shrink-0 text-muted-foreground", compact ? "text-[9px]" : "text-[10px]")}>
                    {formatTime(entry.timestamp)}
                  </span>
                  <Badge variant="secondary" className="shrink-0 text-[9px] capitalize">
                    {entry.answerStyle}
                  </Badge>
                  {!compact && (
                    <Badge variant="secondary" className="shrink-0 text-[9px]">
                      {SOURCE_LABELS[entry.source]}
                    </Badge>
                  )}
                </div>
                <div className="flex shrink-0 items-center">
                  <CopyButton text={entry.answer} compact={compact} />
                  <PinButton entryId={entry.id} pinned={entry.pinned} compact={compact} />
                </div>
              </div>
              {!compact && entry.triggerTranscriptSnippet && (
                <p className="mt-1 truncate text-[10px] italic text-muted-foreground">
                  …{entry.triggerTranscriptSnippet}
                </p>
              )}
              <p
                className={cn(
                  "mt-1 whitespace-pre-wrap leading-relaxed text-foreground/90",
                  compact ? "line-clamp-3 text-[10px]" : "text-xs"
                )}
              >
                {entry.answer}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
