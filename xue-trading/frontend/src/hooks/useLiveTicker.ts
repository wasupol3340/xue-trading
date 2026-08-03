"use client";

import { useEffect } from "react";
import { useTradingStore } from "@/store/useTradingStore";

/**
 * Drives the realtime feel of the dashboard. In production this subscribes to
 * the FastAPI WebSocket at NEXT_PUBLIC_WS_URL; here it falls back to a local
 * interval so the UI is alive without the backend running.
 */
export function useLiveTicker() {
  const tick = useTradingStore((s) => s.tick);

  useEffect(() => {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL;
    let ws: WebSocket | null = null;
    let interval: ReturnType<typeof setInterval> | null = null;

    if (wsUrl) {
      try {
        ws = new WebSocket(`${wsUrl}/market`);
        ws.onmessage = () => tick();
        ws.onerror = () => {
          interval = setInterval(tick, 1500);
        };
      } catch {
        interval = setInterval(tick, 1500);
      }
    } else {
      interval = setInterval(tick, 1500);
    }

    return () => {
      ws?.close();
      if (interval) clearInterval(interval);
    };
  }, [tick]);
}
