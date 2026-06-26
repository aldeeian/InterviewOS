"use client";

import { useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export function FloatCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const [pos, setPos] = useState({ x: 24, y: 96 });
  const dragState = useRef<{ dragging: boolean; offsetX: number; offsetY: number }>({
    dragging: false,
    offsetX: 0,
    offsetY: 0,
  });

  function onPointerDown(e: React.PointerEvent) {
    dragState.current = {
      dragging: true,
      offsetX: e.clientX - pos.x,
      offsetY: e.clientY - pos.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragState.current.dragging) return;
    setPos({
      x: Math.max(0, e.clientX - dragState.current.offsetX),
      y: Math.max(0, e.clientY - dragState.current.offsetY),
    });
  }

  function onPointerUp() {
    dragState.current.dragging = false;
  }

  return (
    <div
      className={cn(
        "fixed z-50 w-80 rounded-xl border border-border/60 bg-card/85 shadow-2xl backdrop-blur-md",
        className
      )}
      style={{ left: pos.x, top: pos.y }}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        className="flex cursor-grab items-center justify-between rounded-t-xl border-b border-border/60 bg-muted/60 px-3 py-1.5 text-xs font-medium text-muted-foreground active:cursor-grabbing"
      >
        <span>Live Copilot</span>
        <span className="text-[10px] opacity-60">drag to move</span>
      </div>
      {children}
    </div>
  );
}
