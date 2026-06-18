"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useEffect, useState } from "react";
import type { InterviewSession, SessionSetup, Track } from "./types";

interface InterviewStore {
  tracks: Track[];
  sessions: InterviewSession[];
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
    { name: "interviewos-storage" }
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
