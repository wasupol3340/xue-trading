"use client";

import { useEffect } from "react";
import { useTradingStore } from "@/store/useTradingStore";
import { isBackendConfigured } from "@/lib/api";

/**
 * Keeps the dashboard feeling alive in DEMO mode (no backend) by nudging prices
 * and agent load on an interval. When a real backend is configured, this stands
 * down and useBackendSync drives the store from live data instead.
 */
export function useLiveTicker() {
  const tick = useTradingStore((s) => s.tick);

  useEffect(() => {
    if (isBackendConfigured()) return; // live mode handles updates
    const interval = setInterval(tick, 1500);
    return () => clearInterval(interval);
  }, [tick]);
}
