"use client";

import Link from "next/link";
import { useState } from "react";
import { ExternalLink, Info, PictureInPicture2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ContextPanel } from "@/components/copilot/context-panel";
import { CopilotPanel } from "@/components/copilot/copilot-panel";
import { FloatCard } from "@/components/copilot/float-card";
import { PipWindow, usePiPSupported } from "@/components/copilot/pip-window";
import { useInterviewStore, useStoreHydrated } from "@/lib/store";

export default function LiveCopilotPage() {
  const hydrated = useStoreHydrated();
  const track = useInterviewStore((s) => s.latestTrack());
  const [floatOpen, setFloatOpen] = useState(false);
  const [pipOpen, setPipOpen] = useState(false);
  const pipSupported = usePiPSupported();

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Live Meeting Copilot</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Listens to your mic and/or your Zoom/Google Meet tab during a meeting you&apos;re in,
            and shows you suggested talking points personalized to your resume — visible only on
            your own screen, same as any notes app.
          </p>
        </div>

        <div className="flex items-start gap-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            This is a personal aid for your own meetings — not disguised, and not meant to be
            hidden from anyone you&apos;re on the call with. Sharing tab audio surfaces a visible,
            un-hideable browser recording indicator for as long as it&apos;s on. Only use it in
            meetings where doing so is appropriate and, where required, disclosed to other
            participants.
          </span>
        </div>

        {hydrated && !track && (
          <div className="rounded-md border border-warning/30 bg-warning/10 px-3 py-2 text-sm">
            No resume on file yet —{" "}
            <Link href="/intake" className="font-medium text-primary hover:underline">
              analyze one on the Analyze page
            </Link>{" "}
            to get personalized suggestions instead of generic ones.
          </div>
        )}

        <ContextPanel />

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base font-semibold text-foreground">Docked view</CardTitle>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => setFloatOpen((v) => !v)}>
                {floatOpen ? "Hide float card" : "Show float card"}
              </Button>
              {pipSupported && (
                <Button size="sm" variant="outline" onClick={() => setPipOpen(true)}>
                  <PictureInPicture2 className="h-3.5 w-3.5" /> Pop out
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <CopilotPanel />
          </CardContent>
        </Card>

        {!pipSupported && (
          <p className="text-xs text-muted-foreground">
            <ExternalLink className="mr-1 inline h-3 w-3" />
            &quot;Pop out&quot; uses the standard browser Picture-in-Picture window API and is
            currently only available in Chromium-based browsers.
          </p>
        )}
      </div>

      {floatOpen && !pipOpen && (
        <FloatCard>
          <CopilotPanel compact />
        </FloatCard>
      )}

      <PipWindow open={pipOpen} onClose={() => setPipOpen(false)}>
        <div className="dark min-h-screen bg-background text-foreground">
          <CopilotPanel compact />
        </div>
      </PipWindow>
    </AppShell>
  );
}
