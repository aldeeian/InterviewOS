"use client";

import { motion } from "framer-motion";
import { Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Turn } from "@/lib/types";

export function ChatBubble({ turn }: { turn: Turn }) {
  const isInterviewer = turn.role === "interviewer";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      className={cn("flex items-start gap-3", !isInterviewer && "flex-row-reverse")}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isInterviewer ? "bg-primary/15 text-primary" : "bg-accent/15 text-accent"
        )}
      >
        {isInterviewer ? <Sparkles className="h-4 w-4" /> : <User className="h-4 w-4" />}
      </div>
      <div className={cn("flex max-w-[75%] flex-col gap-1.5", !isInterviewer && "items-end")}>
        <div
          className={cn(
            "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
            isInterviewer
              ? "rounded-tl-sm bg-muted text-foreground"
              : "rounded-tr-sm bg-primary text-primary-foreground"
          )}
        >
          {turn.content}
        </div>
        {turn.feedback && (
          <div className="rounded-md border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">Coaching note: </span>
            {turn.feedback}
          </div>
        )}
      </div>
    </motion.div>
  );
}
