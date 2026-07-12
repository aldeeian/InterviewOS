"use client";

import { useState } from "react";
import { BookOpenText, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useInterviewStore, useStoreHydrated, type CopilotContext } from "@/lib/store";

interface FieldSpec {
  key: keyof CopilotContext;
  label: string;
  placeholder: string;
  rows: number;
}

const FIELDS: FieldSpec[] = [
  {
    key: "jobDescription",
    label: "What you need help with",
    placeholder:
      "Paste the job posting, work description, or assignment you want help with during the meeting…",
    rows: 5,
  },
  {
    key: "knowledgeBase",
    label: "Resume & background the AI should know",
    placeholder:
      "Paste your resume, project notes, docs, likely questions and your prepared answers — anything the AI should draw on. Long pastes are fine (tens of thousands of words).",
    rows: 8,
  },
  {
    key: "behaviorInstructions",
    label: "How the AI should answer",
    placeholder:
      'Standing instructions the AI will always follow, e.g. "keep answers STAR-format", "always mention my FastAPI experience when backend comes up", "if asked about availability, say I can start in two weeks"…',
    rows: 5,
  },
];

function formatCount(text: string): string {
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return `${words.toLocaleString()} word${words === 1 ? "" : "s"}`;
}

export function ContextPanel() {
  const hydrated = useStoreHydrated();
  const context = useInterviewStore((s) => s.copilotContext);
  const setContext = useInterviewStore((s) => s.setCopilotContext);
  const [open, setOpen] = useState(true);

  const filledCount = FIELDS.filter((f) => context[f.key].trim()).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div className="flex items-center gap-2">
          <BookOpenText className="h-4 w-4 text-primary" />
          <CardTitle className="text-base font-semibold text-foreground">Meeting context</CardTitle>
          {hydrated && filledCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <Check className="h-3 w-3" /> {filledCount}/{FIELDS.length} filled · saved on this device
            </span>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
          {open ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          {open ? "Collapse" : "Expand"}
        </Button>
      </CardHeader>
      {open && (
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Everything here is sent with each suggestion request so answers stay grounded in your
            job, your background, and your preferences. It saves automatically and is remembered
            next time you open this page.
          </p>
          {FIELDS.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor={`context-${field.key}`} className="text-sm font-medium text-foreground">
                  {field.label}
                </label>
                {hydrated && (
                  <span className="text-xs text-muted-foreground">{formatCount(context[field.key])}</span>
                )}
              </div>
              <Textarea
                id={`context-${field.key}`}
                rows={field.rows}
                placeholder={field.placeholder}
                value={hydrated ? context[field.key] : ""}
                onChange={(e) => setContext({ [field.key]: e.target.value })}
                disabled={!hydrated}
                className="max-h-72 resize-y"
              />
            </div>
          ))}
        </CardContent>
      )}
    </Card>
  );
}
