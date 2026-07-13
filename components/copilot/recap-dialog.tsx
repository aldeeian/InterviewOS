"use client";

import { useState } from "react";
import { Check, Copy, Download, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadMarkdown } from "@/lib/download";

/**
 * Dismissible overlay showing the AI-generated session recap, with copy and
 * download-as-markdown actions. Non-destructive — closing it changes nothing.
 */
export function RecapDialog({
  recap,
  loading,
  error,
  onClose,
}: {
  recap: string | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="flex max-h-[80vh] w-full max-w-xl flex-col rounded-xl border border-border bg-card shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label="Session recap"
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Session recap</h2>
          <div className="flex items-center gap-1.5">
            {recap && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard.writeText(recap).then(() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 1500);
                    });
                  }}
                >
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => downloadMarkdown(recap, `meeting-recap-${new Date().toISOString().slice(0, 10)}.md`)}
                >
                  <Download className="h-3.5 w-3.5" /> Download .md
                </Button>
              </>
            )}
            <Button size="sm" variant="outline" onClick={onClose}>
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div className="scrollbar-thin overflow-y-auto p-4">
          {loading && <p className="text-sm text-muted-foreground">Generating recap…</p>}
          {!loading && error && (
            <p className="rounded-md border border-danger/30 bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
          )}
          {!loading && recap && (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{recap}</div>
          )}
        </div>
      </div>
    </div>
  );
}
