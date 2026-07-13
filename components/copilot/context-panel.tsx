"use client";

import { useEffect, useState } from "react";
import { BookOpenText, Check, ChevronDown, ChevronUp, Pencil, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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

/** Save/switch named sets of meeting context (e.g. "Acme SWE interview") without retyping. */
function ProfileSwitcher() {
  const hydrated = useStoreHydrated();
  const profiles = useInterviewStore((s) => s.copilotProfiles);
  const activeProfileId = useInterviewStore((s) => s.activeProfileId);
  const createProfile = useInterviewStore((s) => s.createProfile);
  const switchProfile = useInterviewStore((s) => s.switchProfile);
  const renameProfile = useInterviewStore((s) => s.renameProfile);
  const deleteProfile = useInterviewStore((s) => s.deleteProfile);

  const [mode, setMode] = useState<"idle" | "creating" | "renaming">("idle");
  const [nameDraft, setNameDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!confirmDelete) return;
    const timer = setTimeout(() => setConfirmDelete(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmDelete]);

  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  const commitName = () => {
    const name = nameDraft.trim();
    if (name) {
      if (mode === "creating") createProfile(name);
      else if (mode === "renaming" && activeProfileId) renameProfile(activeProfileId, name);
    }
    setMode("idle");
    setNameDraft("");
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label htmlFor="copilot-profile" className="text-sm font-medium text-foreground">
        Profile
      </label>
      <select
        id="copilot-profile"
        value={hydrated ? activeProfileId ?? "" : ""}
        onChange={(e) => switchProfile(e.target.value || null)}
        disabled={!hydrated}
        className="h-8 rounded-md border border-border bg-card px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
      >
        <option value="">Default</option>
        {hydrated &&
          profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
      </select>

      {mode !== "idle" ? (
        <form
          className="flex items-center gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            commitName();
          }}
        >
          <Input
            value={nameDraft}
            onChange={(e) => setNameDraft(e.target.value)}
            placeholder={mode === "creating" ? "Profile name, e.g. Acme SWE interview" : "New name"}
            className="h-8 w-56 text-sm"
            autoFocus
          />
          <Button type="submit" size="sm" variant="outline" disabled={!nameDraft.trim()}>
            <Check className="h-3.5 w-3.5" /> Save
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setMode("idle")}>
            Cancel
          </Button>
        </form>
      ) : (
        <>
          <Button
            size="sm"
            variant="outline"
            disabled={!hydrated}
            onClick={() => {
              setNameDraft("");
              setMode("creating");
            }}
          >
            <Plus className="h-3.5 w-3.5" /> Save as new profile
          </Button>
          {activeProfile && (
            <>
              <Button
                size="sm"
                variant="outline"
                title="Rename this profile"
                onClick={() => {
                  setNameDraft(activeProfile.name);
                  setMode("renaming");
                }}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="sm"
                variant={confirmDelete ? "danger" : "outline"}
                title="Delete this profile (context returns to Default)"
                onClick={() => {
                  if (confirmDelete) {
                    deleteProfile(activeProfile.id);
                    setConfirmDelete(false);
                  } else {
                    setConfirmDelete(true);
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {confirmDelete && "Really delete?"}
              </Button>
            </>
          )}
        </>
      )}
    </div>
  );
}

export function ContextPanel() {
  const hydrated = useStoreHydrated();
  const context = useInterviewStore((s) => s.copilotContext);
  const setContext = useInterviewStore((s) => s.setCopilotContext);
  const clearContext = useInterviewStore((s) => s.clearCopilotContext);
  const [open, setOpen] = useState(true);
  const [confirmClear, setConfirmClear] = useState(false);

  useEffect(() => {
    if (!confirmClear) return;
    const timer = setTimeout(() => setConfirmClear(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmClear]);

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
            next time you open this page — stored unencrypted in this browser&apos;s localStorage,
            so use &quot;Clear meeting context&quot; below when you&apos;re done on a shared machine.
          </p>
          <ProfileSwitcher />
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
          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <p className="text-[10px] text-muted-foreground">
              Clears all three fields of the current profile from this device. Can include
              resume/personal details — clear it if this isn&apos;t your own computer.
            </p>
            <Button
              size="sm"
              variant={confirmClear ? "danger" : "outline"}
              disabled={!hydrated || (filledCount === 0 && !confirmClear)}
              onClick={() => {
                if (confirmClear) {
                  clearContext();
                  setConfirmClear(false);
                } else {
                  setConfirmClear(true);
                }
              }}
              className={cn("shrink-0")}
            >
              <Trash2 className="h-3.5 w-3.5" />
              {confirmClear ? "Really clear?" : "Clear meeting context"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
