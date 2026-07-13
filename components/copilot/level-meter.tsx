"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Tiny live audio level bar for an active MediaStream — visual confirmation
 * that audio is actually being captured, next to the mic/tab buttons.
 * Renders nothing when the stream is null.
 */
export function LevelMeter({ stream, className }: { stream: MediaStream | null; className?: string }) {
  const barRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (!stream || !barRef.current) return;
    const AudioContextCtor =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextCtor) return;

    const ctx = new AudioContextCtor();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;
    const source = ctx.createMediaStreamSource(stream);
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    let raf = 0;

    const tick = () => {
      analyser.getByteTimeDomainData(data);
      let sum = 0;
      for (let i = 0; i < data.length; i++) {
        const v = (data[i] - 128) / 128;
        sum += v * v;
      }
      const rms = Math.sqrt(sum / data.length);
      // Perceptual-ish scaling so quiet speech still visibly moves the bar.
      const level = Math.min(1, rms * 4);
      if (barRef.current) {
        barRef.current.style.transform = `scaleY(${Math.max(0.08, level)})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      source.disconnect();
      void ctx.close();
    };
  }, [stream]);

  if (!stream) return null;

  return (
    <span
      className={cn("inline-flex h-4 w-1.5 items-end overflow-hidden rounded-full bg-muted", className)}
      aria-hidden="true"
      title="Live audio level"
    >
      <span
        ref={barRef}
        className="block h-full w-full origin-bottom rounded-full bg-success transition-transform duration-75"
        style={{ transform: "scaleY(0.08)" }}
      />
    </span>
  );
}
