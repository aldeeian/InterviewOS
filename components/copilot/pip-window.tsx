"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

interface DocumentPictureInPicture {
  requestWindow(options?: { width?: number; height?: number }): Promise<Window>;
  window: Window | null;
}

declare global {
  interface Window {
    documentPictureInPicture?: DocumentPictureInPicture;
  }
}

export function usePiPSupported() {
  const [supported, setSupported] = useState(false);
  useEffect(() => {
    // Browser feature-detection can only run client-side, after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSupported(typeof window !== "undefined" && "documentPictureInPicture" in window);
  }, []);
  return supported;
}

/**
 * Renders `children` into a real always-on-top browser window via the
 * standard Document Picture-in-Picture API (the same mechanism Google Meet
 * uses for its floating call widget). This is a visible, user-initiated
 * browser window like any other — not a technique for hiding from screen
 * capture or other participants.
 */
export function PipWindow({
  open,
  onClose,
  width = 360,
  height = 420,
  children,
}: {
  open: boolean;
  onClose: () => void;
  width?: number;
  height?: number;
  children: ReactNode;
}) {
  const [pipWindow, setPipWindow] = useState<Window | null>(null);

  useEffect(() => {
    if (!open) {
      // Closing is a direct reaction to the `open` prop flipping false, not an
      // external-system callback — but it only ever fires on unmount/close.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPipWindow(null);
      return;
    }
    if (!window.documentPictureInPicture) return;

    let cancelled = false;
    let win: Window | null = null;

    async function openWindow() {
      win = await window.documentPictureInPicture!.requestWindow({ width, height });
      if (cancelled) {
        win.close();
        return;
      }

      [...document.styleSheets].forEach((sheet) => {
        try {
          const cssText = [...sheet.cssRules].map((rule) => rule.cssText).join("\n");
          const style = win!.document.createElement("style");
          style.textContent = cssText;
          win!.document.head.appendChild(style);
        } catch {
          if (sheet.href) {
            const link = win!.document.createElement("link");
            link.rel = "stylesheet";
            link.href = sheet.href;
            win!.document.head.appendChild(link);
          }
        }
      });

      if (document.documentElement.classList.contains("dark")) {
        win.document.documentElement.classList.add("dark");
      }
      win.document.body.style.margin = "0";
      win.document.title = "InterviewOS — Live Copilot";

      win.addEventListener("pagehide", () => onClose());
      setPipWindow(win);
    }

    void openWindow();

    return () => {
      cancelled = true;
      win?.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, width, height]);

  if (!open || !pipWindow) return null;
  return createPortal(children, pipWindow.document.body);
}
