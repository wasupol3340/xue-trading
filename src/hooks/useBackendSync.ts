"use client";

import { useEffect } from "react";
import { api, isBackendConfigured, WS_URL, getToken } from "@/lib/api";
import { useTradingStore } from "@/store/useTradingStore";
import { Agent, Meeting, Portfolio, Position, Strategy, Vote } from "@/types";

const ACCENT: Record<string, string> = {
  CEO: "#f0b429", Research: "#3b82f6", News: "#22c55e", Risk: "#8b5cf6",
  Strategy: "#f6ad55", Execution: "#22d3ee", Learning: "#60a5fa", Monitor: "#2dd4bf",
};

const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

function mapAgents(rows: any[]): Agent[] {
  return rows.map((a) => ({
    id: a.id, name: a.name, role: a.role, title: a.title,
    status: a.status, statusLabel: cap(a.status),
    confidence: a.confidence, cpu: a.cpu, memory: a.memory,
    currentTask: a.current_task, performance: a.performance,
    accent: ACCENT[a.role] || "#3b82f6", online: a.online,
  }));
}

function mapStrategies(rows: any[]): Strategy[] {
  return rows.map((s) => ({
    id: s.key, name: s.name, category: s.category, score: s.score,
    confidence: s.confidence, winRate: s.win_rate, profitFactor: s.profit_factor,
    sharpe: s.sharpe, maxDrawdown: s.max_drawdown, trades: s.trades, enabled: s.enabled,
  }));
}

function mapPositions(rows: any[]): Position[] {
  return rows.map((p) => ({
    id: String(p.ticket ?? p.id ?? Math.random()),
    symbol: p.symbol, side: p.side, lots: p.lots, entry: p.entry,
    current: p.current, sl: p.sl, tp: p.tp, pnl: p.pnl, magic: p.magic,
    openedAt: p.opened_at ? new Date(p.opened_at * 1000).toISOString() : new Date().toISOString(),
  }));
}

function mapPortfolio(acct: any, status: any): Portfolio {
  const profit = acct.profit ?? acct.equity - acct.balance;
  return {
    balance: acct.balance, equity: acct.equity, profit,
    profitPct: acct.balance ? +((profit / acct.balance) * 100).toFixed(2) : 0,
    drawdown: acct.balance ? +Math.max(0, ((acct.balance - acct.equity) / acct.balance) * 100).toFixed(2) : 0,
    openPositions: status?.open_trades ?? 0,
    totalProfit: profit,
    todayProfit: status?.realized_pnl_today ?? 0,
    monthProfit: profit,
    winRate: 0,
    riskMeter: acct.balance ? +Math.max(0, ((acct.balance - acct.equity) / acct.balance) * 100).toFixed(2) : 0,
  };
}

function mapMeeting(dec: any): Meeting {
  const votes: Record<string, Vote> = dec.votes || {};
  const messages = Object.entries(votes).map(([role, vote], i) => ({
    id: `m${i}`,
    agent: role as any,
    time: new Date().toLocaleTimeString("en-GB"),
    text:
      role === "News" ? "กำลังวิเคราะห์อารมณ์ตลาดมหภาคของทองคำ"
      : role === "Risk" ? "กำลังตรวจสอบขีดจำกัดความเสี่ยงและ drawdown"
      : role === "Strategy" ? `แผนเทรดผ่าน ${dec.technique_name || "SMC"}`
      : `บันทึกโหวตของ ${role} แล้ว`,
    vote: vote as Vote,
  }));
  return {
    id: "live", startedAt: new Date().toISOString(), symbol: dec.symbol,
    messages, approved: dec.approved, total: dec.total,
    confidence: dec.confidence, decision: dec.decision,
  };
}

/**
 * Syncs the Zustand store from the live FastAPI backend when NEXT_PUBLIC_API_URL
 * is configured. Falls back silently to the built-in mock data otherwise, so the
 * dashboard always renders.
 */
export function useBackendSync() {
  const hydrate = useTradingStore((s) => s.hydrate);
  const pushLog = useTradingStore((s) => s.pushLog);

  useEffect(() => {
    if (!isBackendConfigured()) return;

    let alive = true;
    let ws: WebSocket | null = null;

    const poll = async () => {
      try {
        const [status, account, positions, agents, strategies, decision] = await Promise.all([
          api.status().catch(() => null),
          api.account().catch(() => null),
          api.positions().catch(() => []),
          api.agents().catch(() => []),
          api.strategies().catch(() => []),
          api.decision().catch(() => null),
        ]);
        if (!alive) return;

        const patch: any = { isLive: true };
        if (account) patch.portfolio = mapPortfolio(account, status);
        if (positions?.length !== undefined) patch.positions = mapPositions(positions);
        if (agents?.length) patch.agents = mapAgents(agents);
        if (strategies?.length) patch.strategies = mapStrategies(strategies);
        if (decision) {
          patch.meeting = mapMeeting(decision);
          patch.currentTechnique = decision.technique;
          patch.currentTechniqueName = decision.technique_name;
        }
        if (status) {
          patch.engineRunning = status.running;
          if (status.current_technique_name) patch.currentTechniqueName = status.current_technique_name;
          if (status.mt5)
            patch.connection = {
              mt5: status.mt5.connected,
              server: status.mt5.server,
              latency: 0,
            };
        }
        hydrate(patch);
      } catch {
        /* keep last known / mock */
      }
    };

    poll();
    const iv = setInterval(poll, 5000);

    // realtime stream
    if (WS_URL) {
      try {
        const token = getToken();
        ws = new WebSocket(`${WS_URL}/market${token ? `?token=${token}` : ""}`);
        ws.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.type === "tick") {
              hydrate({ price: +msg.price, isLive: true });
              if (msg.agents?.length) hydrate({ agents: mapAgents(msg.agents) });
            } else if (msg.type === "autotrader.meeting") {
              const dec = msg.data;
              hydrate({
                meeting: mapMeeting(dec),
                currentTechnique: dec.technique,
                currentTechniqueName: dec.technique_name,
              });
            } else if (msg.type === "autotrader.order") {
              const d = msg.data;
              pushLog({
                id: `o${Date.now()}`,
                time: new Date().toLocaleTimeString("en-GB"),
                level: "success",
                source: "Execution AI",
                message: `${d.side} ${d.lots} lot @ ${d.price} · ${d.technique || "technique"} (ticket ${d.ticket})`,
              });
            }
          } catch {
            /* ignore malformed frames */
          }
        };
      } catch {
        /* no realtime — polling still works */
      }
    }

    return () => {
      alive = false;
      clearInterval(iv);
      ws?.close();
    };
  }, [hydrate, pushLog]);
}
