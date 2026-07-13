"use client";

import { useEffect, useRef, useState } from "react";

const QUESTION_OPENERS =
  /^(what|why|how|when|where|which|who|whose|can|could|would|will|do|does|did|are|is|was|were|have|has|should|shall|tell me|tell us|walk me|walk us|talk me|describe|explain|give me|give us|share)\b/i;

/**
 * Lightweight heuristic pass over the tail of a speaker-labeled transcript:
 * finds the most recent thing "Them" said that looks like a question — either
 * ending in "?" or opening with a question-shaped clause. Returns null when
 * nothing question-like is found (unlabeled legacy-mic transcripts included).
 */
export function extractLastQuestion(transcript: string): string | null {
  const lines = transcript.split("\n");
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (!line.toLowerCase().startsWith("them:")) continue;
    const said = line.slice(5).trim();
    if (!said) continue;
    // Split the turn into sentences and take the last question-shaped one.
    const sentences = said.match(/[^.?!]+[.?!]?/g) ?? [said];
    for (let j = sentences.length - 1; j >= 0; j--) {
      const sentence = sentences[j].trim();
      if (!sentence) continue;
      if (sentence.endsWith("?") || QUESTION_OPENERS.test(sentence)) {
        return sentence;
      }
    }
    // Only inspect the most recent "Them" turn — an older question was
    // presumably already answered.
    return null;
  }
  return null;
}

/** Once the transcript passes this many words, older content gets summarized… */
const SUMMARIZE_THRESHOLD_WORDS = 1500;
/** …keeping this many recent words raw. */
const RECENT_WINDOW_WORDS = 500;
/** Re-summarize only after this many new words have aged out of the window. */
const RESUMMARIZE_STEP_WORDS = 300;

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

export interface TranscriptWindow {
  /** What to send to the answer endpoint — the full transcript until a summary exists. */
  recentTranscript: string;
  /** Running summary of the aged-out portion; empty until the first summarization succeeds. */
  runningSummary: string;
}

/**
 * Keeps long meetings from resending the entire transcript on every
 * suggestion request: once past ~1500 words, the portion older than the most
 * recent ~500 words is folded into a short running summary via a cheap
 * background call. The UI transcript box is unaffected — this only shapes
 * what goes to /api/copilot/suggest. If summarization is unavailable, the
 * full raw transcript keeps being sent, exactly as before.
 */
export function useTranscriptWindow(fullTranscript: string): TranscriptWindow {
  const [runningSummary, setRunningSummary] = useState("");
  // Index of the first line NOT yet folded into the summary.
  const [summarizedLineCount, setSummarizedLineCount] = useState(0);
  const inFlightRef = useRef(false);

  // Reset when the transcript restarts (new session / cleared).
  const lengthRef = useRef(fullTranscript.length);
  useEffect(() => {
    if (fullTranscript.length < lengthRef.current) {
      setRunningSummary("");
      setSummarizedLineCount(0);
    }
    lengthRef.current = fullTranscript.length;
  }, [fullTranscript]);

  const lines = fullTranscript.split("\n");
  // Walk back from the end to find where the recent raw window starts.
  let recentWords = 0;
  let windowStart = lines.length;
  while (windowStart > 0 && recentWords < RECENT_WINDOW_WORDS) {
    windowStart--;
    recentWords += countWords(lines[windowStart]);
  }
  const totalWords = countWords(fullTranscript);

  useEffect(() => {
    if (totalWords <= SUMMARIZE_THRESHOLD_WORDS || inFlightRef.current) return;
    const newAgedLines = lines.slice(summarizedLineCount, windowStart);
    const newAgedWords = countWords(newAgedLines.join("\n"));
    const firstRun = summarizedLineCount === 0;
    if (windowStart <= summarizedLineCount || (!firstRun && newAgedWords < RESUMMARIZE_STEP_WORDS)) return;

    inFlightRef.current = true;
    const chunk = newAgedLines.join("\n");
    fetch("/api/copilot/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ previousSummary: runningSummary, text: chunk }),
    })
      .then((res) => res.json())
      .then((data: { summary?: string | null }) => {
        if (data.summary) {
          setRunningSummary(data.summary);
          setSummarizedLineCount(windowStart);
        }
      })
      .catch(() => {
        // Summarization is best-effort — keep sending the full transcript.
      })
      .finally(() => {
        inFlightRef.current = false;
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalWords, windowStart, summarizedLineCount, runningSummary]);

  // Only switch to windowed mode once a summary actually exists, so nothing
  // is silently dropped while (or if) summarization never succeeds. Lines
  // that have aged out of the window but aren't summarized yet still go raw.
  if (!runningSummary) {
    return { recentTranscript: fullTranscript, runningSummary: "" };
  }
  return {
    recentTranscript: lines.slice(summarizedLineCount).join("\n"),
    runningSummary,
  };
}
