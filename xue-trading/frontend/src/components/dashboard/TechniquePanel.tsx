"use client";

import { motion } from "framer-motion";
import { Brain, TrendingUp } from "lucide-react";
import { useTradingStore } from "@/store/useTradingStore";
import { Meter } from "@/components/ui/Meter";

const catColor: Record<string, string> = {
  SMC: "#3b82f6",
  ICT: "#8b5cf6",
  Indicator: "#f6ad55",
  Volume: "#22d3ee",
};

function scoreColor(s: number) {
  if (s >= 80) return "#22c55e";
  if (s >= 65) return "#f0b429";
  return "#f97316";
}

export function TechniquePanel() {
  const strategies = useTradingStore((s) => s.strategies);
  const currentTechnique = useTradingStore((s) => s.currentTechnique);
  const currentTechniqueName = useTradingStore((s) => s.currentTechniqueName);
  const engineRunning = useTradingStore((s) => s.engineRunning);

  const sorted = [...strategies].sort((a, b) => b.score - a.score);
  const active = strategies.find((s) => s.id === currentTechnique);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass p-4">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent-violet to-accent-cyan">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">AI Technique Learning</h2>
            <p className="text-[11px] text-muted">Techniques scored live from real trade results · self-selecting</p>
          </div>
        </div>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
            engineRunning ? "border border-accent-green/30 bg-accent-green/10 text-accent-green" : "border border-white/10 text-muted"
          }`}
        >
          {engineRunning && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-green" />}
          {engineRunning ? "Learning Live" : "Idle"}
        </span>
      </div>

      {/* Active technique highlight */}
      <div className="mb-4 flex items-center justify-between rounded-xl border border-accent-violet/20 bg-gradient-to-r from-accent-violet/15 to-transparent px-4 py-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted">Trading Now With</p>
          <p className="text-xl font-bold text-gradient-gold">{currentTechniqueName || active?.name || "—"}</p>
        </div>
        {active && (
          <div className="text-right">
            <p className="text-[10px] uppercase tracking-wider text-muted">Score</p>
            <p className="font-mono text-2xl font-bold" style={{ color: scoreColor(active.score) }}>
              {active.score}
            </p>
          </div>
        )}
      </div>

      {/* Leaderboard */}
      <div className="space-y-1.5">
        <div className="grid grid-cols-[24px_1fr_120px_70px_60px] items-center gap-3 px-2 pb-1 text-[10px] font-semibold uppercase tracking-wider text-muted">
          <span>#</span>
          <span>Technique</span>
          <span>Score</span>
          <span className="text-right">Win</span>
          <span className="text-right">Trades</span>
        </div>
        {sorted.map((s, i) => {
          const isActive = s.id === currentTechnique;
          return (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`grid grid-cols-[24px_1fr_120px_70px_60px] items-center gap-3 rounded-lg px-2 py-2 transition ${
                isActive ? "border border-accent-green/30 bg-accent-green/[0.06]" : "hover:bg-white/[0.02]"
              }`}
            >
              <span className="font-mono text-xs text-muted">{i + 1}</span>
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: catColor[s.category] || "#888" }} />
                <span className="truncate text-[13px] font-medium text-white">{s.name}</span>
                {isActive && (
                  <span className="shrink-0 rounded-full border border-accent-green/40 bg-accent-green/10 px-1.5 py-0.5 text-[8px] font-bold text-accent-green">
                    ● NOW
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="w-7 font-mono text-xs font-bold" style={{ color: scoreColor(s.score) }}>
                  {s.score}
                </span>
                <div className="flex-1">
                  <Meter value={s.score} color={scoreColor(s.score)} height={5} />
                </div>
              </div>
              <span className="text-right font-mono text-xs text-accent-cyan">{s.winRate}%</span>
              <span className="flex items-center justify-end gap-1 text-right font-mono text-xs text-muted">
                {s.trades > 0 && <TrendingUp className="h-3 w-3 text-accent-green" />}
                {s.trades}
              </span>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
}
