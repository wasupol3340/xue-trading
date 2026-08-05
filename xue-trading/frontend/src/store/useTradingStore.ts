"use client";

import { create } from "zustand";
import { Agent, Meeting, Portfolio, Position, LogEntry, Strategy, NewsItem } from "@/types";
import { AGENTS, MEETING, PORTFOLIO, POSITIONS, LOGS, STRATEGIES, NEWS } from "@/lib/mock-data";

interface TradingState {
  symbol: string;
  price: number;
  change: number;
  changePct: number;
  timeframe: string;
  autoTrading: boolean;
  lotSize: number;
  riskLevel: number;
  tp: number;
  sl: number;

  agents: Agent[];
  meeting: Meeting;
  portfolio: Portfolio;
  positions: Position[];
  strategies: Strategy[];
  news: NewsItem[];
  scorecard: any;
  lastAction: string;
  lastActionAt: string;
  logs: LogEntry[];
  connection: { mt5: boolean; server: string; latency: number };

  // live-backend state
  isLive: boolean;
  engineRunning: boolean;
  currentTechnique: string;
  currentTechniqueName: string;

  setTimeframe: (tf: string) => void;
  toggleAuto: () => void;
  setLotSize: (v: number) => void;
  setRiskLevel: (v: number) => void;
  setTp: (v: number) => void;
  setSl: (v: number) => void;
  tick: () => void;
  pushLog: (log: LogEntry) => void;
  hydrate: (partial: Partial<TradingState>) => void;
}

export const useTradingStore = create<TradingState>((set, get) => ({
  symbol: "XAUUSD",
  price: 2345.68,
  change: 18.47,
  changePct: 0.79,
  timeframe: "M15",
  autoTrading: true,
  lotSize: 0.1,
  riskLevel: 5,
  tp: 2370.0,
  sl: 2320.0,

  agents: AGENTS,
  meeting: MEETING,
  portfolio: PORTFOLIO,
  positions: POSITIONS,
  strategies: STRATEGIES,
  news: NEWS,
  scorecard: {},
  lastAction: "",
  lastActionAt: "",
  logs: LOGS,
  connection: { mt5: true, server: "MetaQuotes-Demo", latency: 41 },

  isLive: false,
  engineRunning: false,
  currentTechnique: "",
  currentTechniqueName: "",

  setTimeframe: (tf) => set({ timeframe: tf }),
  toggleAuto: () => set((s) => ({ autoTrading: !s.autoTrading })),
  setLotSize: (v) => set({ lotSize: Math.max(0.01, +v.toFixed(2)) }),
  setRiskLevel: (v) => set({ riskLevel: Math.min(100, Math.max(0, v)) }),
  setTp: (v) => set({ tp: v }),
  setSl: (v) => set({ sl: v }),

  tick: () =>
    set((s) => {
      const delta = (Math.random() - 0.5) * 1.6;
      const price = +(s.price + delta).toFixed(2);
      const change = +(s.change + delta).toFixed(2);
      const changePct = +((change / (price - change)) * 100).toFixed(2);
      const agents = s.agents.map((a) => ({
        ...a,
        cpu: Math.min(98, Math.max(8, a.cpu + Math.round((Math.random() - 0.5) * 8))),
        memory: Math.min(96, Math.max(20, a.memory + Math.round((Math.random() - 0.5) * 5))),
      }));
      return { price, change, changePct, agents };
    }),

  pushLog: (log) => set((s) => ({ logs: [log, ...s.logs].slice(0, 60) })),

  hydrate: (partial) => set(partial),
}));
