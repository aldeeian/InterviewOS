"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type TranscriptSpeaker = "you" | "them";

export interface TranscriptEntry {
  id: string;
  speaker: TranscriptSpeaker;
  text: string;
  isFinal: boolean;
  updatedAt: number;
}

interface DeepgramMessage {
  channel?: { alternatives?: { transcript?: string }[] };
  is_final?: boolean;
}

const DEEPGRAM_LIVE_URL =
  "wss://api.deepgram.com/v1/listen?model=nova-2&smart_format=true&interim_results=true&punctuate=true&endpointing=300";

async function fetchTempKey(): Promise<string | null> {
  try {
    const res = await fetch("/api/copilot/deepgram-token");
    if (!res.ok) return null;
    const data = (await res.json()) as { key?: string };
    return data.key ?? null;
  } catch {
    return null;
  }
}

function openDeepgramSocket(key: string, onTranscript: (text: string, isFinal: boolean) => void): WebSocket {
  const socket = new WebSocket(DEEPGRAM_LIVE_URL, ["token", key]);
  socket.onmessage = (event) => {
    try {
      const msg = JSON.parse(event.data as string) as DeepgramMessage;
      const transcript = msg.channel?.alternatives?.[0]?.transcript;
      if (transcript) onTranscript(transcript, !!msg.is_final);
    } catch {
      // ignore malformed frames
    }
  };
  return socket;
}

function streamRecorderToSocket(stream: MediaStream, socket: WebSocket): MediaRecorder {
  const recorder = new MediaRecorder(stream, { mimeType: "audio/webm;codecs=opus" });
  recorder.ondataavailable = async (event) => {
    if (event.data.size === 0 || socket.readyState !== WebSocket.OPEN) return;
    socket.send(await event.data.arrayBuffer());
  };
  recorder.start(250);
  return recorder;
}

interface UseLiveMeetingTranscriptResult {
  supported: boolean;
  configured: boolean | null;
  micActive: boolean;
  tabAudioActive: boolean;
  entries: TranscriptEntry[];
  fullTranscript: string;
  error: string | null;
  startMic: () => Promise<void>;
  startTabAudio: () => Promise<void>;
  stop: () => void;
  reset: () => void;
}

export function useLiveMeetingTranscript(): UseLiveMeetingTranscriptResult {
  const [micActive, setMicActive] = useState(false);
  const [tabAudioActive, setTabAudioActive] = useState(false);
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [supported, setSupported] = useState(false);

  const micStreamRef = useRef<MediaStream | null>(null);
  const tabStreamRef = useRef<MediaStream | null>(null);
  const micSocketRef = useRef<WebSocket | null>(null);
  const tabSocketRef = useRef<WebSocket | null>(null);
  const micRecorderRef = useRef<MediaRecorder | null>(null);
  const tabRecorderRef = useRef<MediaRecorder | null>(null);
  const activeEntryIdRef = useRef<{ you: string | null; them: string | null }>({ you: null, them: null });

  useEffect(() => {
    // Browser feature-detection can only run client-side, after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(
      typeof window !== "undefined" &&
        !!navigator.mediaDevices?.getUserMedia &&
        typeof MediaRecorder !== "undefined" &&
        typeof WebSocket !== "undefined"
    );
    fetch("/api/copilot/deepgram-status")
      .then((r) => r.json())
      .then((d: { configured?: boolean }) => setConfigured(!!d.configured))
      .catch(() => setConfigured(false));
  }, []);

  const upsertEntry = useCallback((speaker: TranscriptSpeaker, text: string, isFinal: boolean) => {
    setEntries((prev) => {
      const activeId = activeEntryIdRef.current[speaker];
      const idx = activeId ? prev.findIndex((e) => e.id === activeId) : -1;
      const next = [...prev];
      if (idx >= 0) {
        next[idx] = { ...next[idx], text, isFinal, updatedAt: Date.now() };
      } else {
        const id = `${speaker}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        activeEntryIdRef.current[speaker] = id;
        next.push({ id, speaker, text, isFinal, updatedAt: Date.now() });
      }
      if (isFinal) activeEntryIdRef.current[speaker] = null;
      return next;
    });
  }, []);

  const stopMic = useCallback(() => {
    micRecorderRef.current?.stop();
    micSocketRef.current?.close();
    micStreamRef.current?.getTracks().forEach((t) => t.stop());
    micRecorderRef.current = null;
    micSocketRef.current = null;
    micStreamRef.current = null;
    setMicActive(false);
  }, []);

  const stopTabAudio = useCallback(() => {
    tabRecorderRef.current?.stop();
    tabSocketRef.current?.close();
    tabStreamRef.current?.getTracks().forEach((t) => t.stop());
    tabRecorderRef.current = null;
    tabSocketRef.current = null;
    tabStreamRef.current = null;
    setTabAudioActive(false);
  }, []);

  const stop = useCallback(() => {
    stopMic();
    stopTabAudio();
  }, [stopMic, stopTabAudio]);

  const reset = useCallback(() => {
    setEntries([]);
    activeEntryIdRef.current = { you: null, them: null };
  }, []);

  const startMic = useCallback(async () => {
    setError(null);
    const key = await fetchTempKey();
    if (!key) {
      setError("Deepgram isn't configured on the server (missing DEEPGRAM_API_KEY).");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;
      const socket = openDeepgramSocket(key, (text, isFinal) => upsertEntry("you", text, isFinal));
      micSocketRef.current = socket;
      socket.onopen = () => {
        micRecorderRef.current = streamRecorderToSocket(stream, socket);
      };
      setMicActive(true);
    } catch {
      setError("Microphone permission was denied or unavailable.");
    }
  }, [upsertEntry]);

  const startTabAudio = useCallback(async () => {
    setError(null);
    const key = await fetchTempKey();
    if (!key) {
      setError("Deepgram isn't configured on the server (missing DEEPGRAM_API_KEY).");
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      const audioTracks = display.getAudioTracks();
      display.getVideoTracks().forEach((t) => t.stop());
      if (audioTracks.length === 0) {
        setError('No tab/system audio was shared — re-share and check "Share tab audio".');
        return;
      }
      const stream = new MediaStream(audioTracks);
      tabStreamRef.current = stream;
      const socket = openDeepgramSocket(key, (text, isFinal) => upsertEntry("them", text, isFinal));
      tabSocketRef.current = socket;
      socket.onopen = () => {
        tabRecorderRef.current = streamRecorderToSocket(stream, socket);
      };
      audioTracks[0].addEventListener("ended", stopTabAudio);
      setTabAudioActive(true);
    } catch {
      setError("Tab/screen share was cancelled or denied.");
    }
  }, [upsertEntry, stopTabAudio]);

  useEffect(() => stop, [stop]);

  const fullTranscript = entries
    .slice()
    .sort((a, b) => a.updatedAt - b.updatedAt)
    .map((e) => `${e.speaker === "you" ? "You" : "Them"}: ${e.text}`)
    .join("\n");

  return {
    supported,
    configured,
    micActive,
    tabAudioActive,
    entries,
    fullTranscript,
    error,
    startMic,
    startTabAudio,
    stop,
    reset,
  };
}
