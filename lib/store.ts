"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import type { InterviewSession, SessionSetup, Track } from "./types";
import type { AnswerStyle } from "./ai/copilot-prompt";

export interface CopilotContext {
  /** The job, work, or assignment the user needs help with. */
  jobDescription: string;
  /** Resume + anything else the AI should know (docs, notes, likely questions). */
  knowledgeBase: string;
  /** Standing instructions for how the AI should answer and behave. */
  behaviorInstructions: string;
}

export const EMPTY_COPILOT_CONTEXT: CopilotContext = {
  jobDescription: "",
  knowledgeBase: "",
  behaviorInstructions: "",
};

export type SuggestionSource = "openai" | "gemini" | "claude" | "heuristic";

export interface CopilotHistoryEntry {
  id: string;
  timestamp: number;
  /** Last ~200 chars of the transcript that triggered this suggestion. */
  triggerTranscriptSnippet: string;
  answerStyle: AnswerStyle;
  answer: string;
  source: SuggestionSource;
  pinned: boolean;
}

export interface CopilotProfile {
  id: string;
  name: string;
  context: CopilotContext;
}

export type CopilotProviderPref = "auto" | "openai" | "gemini" | "claude";
export type CopilotSpeedPref = "deep" | "fast";

interface InterviewStore {
  tracks: Track[];
  sessions: InterviewSession[];
  copilotContext: CopilotContext;
  setCopilotContext: (patch: Partial<CopilotContext>) => void;
  clearCopilotContext: () => void;
  answerStyle: AnswerStyle;
  setAnswerStyle: (style: AnswerStyle) => void;
  /** Session-scoped suggestion history — intentionally NOT persisted. */
  copilotHistory: CopilotHistoryEntry[];
  addCopilotHistoryEntry: (entry: CopilotHistoryEntry) => void;
  clearCopilotHistory: () => void;
  /** Pins one entry (unpinning any other); passing the pinned id unpins it. */
  toggleCopilotPin: (id: string) => void;
  /** Named saved sets of meeting context. `activeProfileId: null` = the unnamed default. */
  copilotProfiles: CopilotProfile[];
  activeProfileId: string | null;
  /** Stash for the unnamed default context while a named profile is active. */
  defaultProfileContext: CopilotContext;
  createProfile: (name: string) => void;
  switchProfile: (id: string | null) => void;
  renameProfile: (id: string, name: string) => void;
  deleteProfile: (id: string) => void;
  preferredProvider: CopilotProviderPref;
  setPreferredProvider: (p: CopilotProviderPref) => void;
  preferredSpeed: CopilotSpeedPref;
  setPreferredSpeed: (s: CopilotSpeedPref) => void;
  addTrack: (track: Track) => void;
  createSession: (setup: SessionSetup) => InterviewSession;
  getSession: (id: string) => InterviewSession | undefined;
  updateSession: (id: string, updater: (session: InterviewSession) => InterviewSession) => void;
  getTrack: (id: string | null) => Track | undefined;
  latestTrack: () => Track | undefined;
}

function newSessionId() {
  return `session-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useInterviewStore = create<InterviewStore>()(
  persist(
    (set, get) => ({
      tracks: [],
      sessions: [],
      copilotContext: EMPTY_COPILOT_CONTEXT,

      setCopilotContext: (patch) =>
        set((state) => {
          const copilotContext = { ...state.copilotContext, ...patch };
          // The working context is authoritative for the active profile — keep
          // the saved copy in sync so switching away and back never loses edits.
          const copilotProfiles = state.activeProfileId
            ? state.copilotProfiles.map((p) =>
                p.id === state.activeProfileId ? { ...p, context: copilotContext } : p
              )
            : state.copilotProfiles;
          return { copilotContext, copilotProfiles };
        }),

      clearCopilotContext: () =>
        set((state) => ({
          copilotContext: EMPTY_COPILOT_CONTEXT,
          copilotProfiles: state.activeProfileId
            ? state.copilotProfiles.map((p) =>
                p.id === state.activeProfileId ? { ...p, context: EMPTY_COPILOT_CONTEXT } : p
              )
            : state.copilotProfiles,
        })),

      answerStyle: "natural",
      setAnswerStyle: (style) => set({ answerStyle: style }),

      copilotHistory: [],
      addCopilotHistoryEntry: (entry) =>
        set((state) => ({ copilotHistory: [entry, ...state.copilotHistory] })),
      clearCopilotHistory: () => set({ copilotHistory: [] }),
      toggleCopilotPin: (id) =>
        set((state) => ({
          copilotHistory: state.copilotHistory.map((e) =>
            e.id === id ? { ...e, pinned: !e.pinned } : { ...e, pinned: false }
          ),
        })),

      copilotProfiles: [],
      activeProfileId: null,
      defaultProfileContext: EMPTY_COPILOT_CONTEXT,

      createProfile: (name) =>
        set((state) => {
          const profile: CopilotProfile = {
            id: `profile-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            name: name.trim() || "Untitled profile",
            context: state.copilotContext,
          };
          return {
            copilotProfiles: [...state.copilotProfiles, profile],
            activeProfileId: profile.id,
            // Entering a named profile from the default: stash the default so
            // switching back restores it.
            defaultProfileContext: state.activeProfileId
              ? state.defaultProfileContext
              : state.copilotContext,
          };
        }),

      switchProfile: (id) =>
        set((state) => {
          if (id === state.activeProfileId) return state;
          const target = id ? state.copilotProfiles.find((p) => p.id === id) : null;
          if (id && !target) return state;
          return {
            activeProfileId: id,
            copilotContext: id ? target!.context : state.defaultProfileContext,
            defaultProfileContext: state.activeProfileId
              ? state.defaultProfileContext
              : state.copilotContext,
          };
        }),

      renameProfile: (id, name) =>
        set((state) => ({
          copilotProfiles: state.copilotProfiles.map((p) =>
            p.id === id ? { ...p, name: name.trim() || p.name } : p
          ),
        })),

      deleteProfile: (id) =>
        set((state) => ({
          copilotProfiles: state.copilotProfiles.filter((p) => p.id !== id),
          ...(state.activeProfileId === id
            ? { activeProfileId: null, copilotContext: state.defaultProfileContext }
            : {}),
        })),

      preferredProvider: "auto",
      setPreferredProvider: (p) => set({ preferredProvider: p }),
      preferredSpeed: "deep",
      setPreferredSpeed: (s) => set({ preferredSpeed: s }),

      addTrack: (track) => set((state) => ({ tracks: [track, ...state.tracks] })),

      createSession: (setup) => {
        const session: InterviewSession = {
          id: newSessionId(),
          trackId: setup.trackId,
          category: setup.category,
          difficulty: setup.difficulty,
          mode: setup.mode,
          status: "in_progress",
          startedAt: Date.now(),
          endedAt: null,
          turns: [],
          overallScores: null,
          summaryFeedback: null,
          improvementPlan: null,
        };
        set((state) => ({ sessions: [session, ...state.sessions] }));
        return session;
      },

      getSession: (id) => get().sessions.find((s) => s.id === id),

      updateSession: (id, updater) =>
        set((state) => ({
          sessions: state.sessions.map((s) => (s.id === id ? updater(s) : s)),
        })),

      getTrack: (id) => (id ? get().tracks.find((t) => t.id === id) : undefined),

      latestTrack: () => get().tracks[0],
    }),
    {
      name: "interviewos-storage",
      // Suggestion history is session-scoped (may contain live meeting
      // content) — everything else persists exactly as before.
      partialize: (state) => {
        const { copilotHistory, ...rest } = state;
        void copilotHistory;
        return rest;
      },
    }
  )
);

export function useStoreHydrated() {
  // Always start `false` so the client's first render matches the server-rendered
  // HTML exactly (zustand's persist middleware can finish rehydrating from
  // localStorage synchronously on the client, before hydration completes, which
  // would otherwise make the client's first render disagree with the server's).
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydrated(useInterviewStore.persist?.hasHydrated() ?? true);
    const unsub = useInterviewStore.persist?.onFinishHydration(() => setHydrated(true));
    return unsub;
  }, []);

  return hydrated;
}
