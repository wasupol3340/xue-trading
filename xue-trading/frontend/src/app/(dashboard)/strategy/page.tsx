"use client";

import { motion } from "framer-motion";
import { useTradingStore } from "@/store/useTradingStore";
import { PageHeader } from "@/components/layout/PageHeader";
import { Meter } from "@/components/ui/Meter";

const catColor: Record<string, string> = {
  SMC: "#3b82f6",
  ICT: "#8b5cf6",
  Indicator: "#f6ad55",
  Volume: "#22d3ee",
};

function scoreColor(s: number) {
  if (s >= 85) return "#22c55e";
  if (s >= 75) return "#f0b429";
  return "#f97316";
}

export default function StrategyPage() {
  const strategies = useTradingStore((s) => s.strategies);
  const currentTechnique = useTradingStore((s) => s.currentTechnique);
  const sorted = [...strategies].sort((a, b) => b.score - a.score);

  return (
    <div>
      <PageHeader
        title="Strategy Center"
        subtitle="Self-learning engine — Learning AI updates each strategy's score, win-rate, profit factor, Sharpe & drawdown automatically."
        action={<span className="chip border-accent-violet/30 bg-accent-violet/10 text-accent-violet">Reinforcement Learning · Live</span>}
      />

      <div className="glass overflow-x-auto p-0">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-muted">
              <th className="px-4 py-3 font-semibold">Strategy</th>
              <th className="px-4 py-3 font-semibold">Score</th>
              <th className="px-4 py-3 font-semibold">Confidence</th>
              <th className="px-4 py-3 font-semibold">Win Rate</th>
              <th className="px-4 py-3 font-semibold">Profit Factor</th>
              <th className="px-4 py-3 font-semibold">Sharpe</th>
              <th className="px-4 py-3 font-semibold">Max DD</th>
              <th className="px-4 py-3 font-semibold">Trades</th>
              <th className="px-4 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => (
              <motion.tr
                key={s.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: catColor[s.category] }} />
                    <span className="font-medium text-white">{s.name}</span>
                    <span className="chip text-[10px]" style={{ color: catColor[s.category] }}>
                      {s.category}
                    </span>
                    {s.id === currentTechnique && (
                      <span className="chip border-accent-green/40 bg-accent-green/10 text-[9px] font-bold text-accent-green">
                        ● TRADING NOW
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 font-mono font-bold" style={{ color: scoreColor(s.score) }}>
                      {s.score}
                    </span>
                    <div className="w-20">
                      <Meter value={s.score} color={scoreColor(s.score)} />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-muted">{s.confidence}%</td>
                <td className="px-4 py-3 font-mono text-accent-cyan">{s.winRate}%</td>
                <td className="px-4 py-3 font-mono text-white">{s.profitFactor.toFixed(2)}</td>
                <td className="px-4 py-3 font-mono text-white">{s.sharpe.toFixed(2)}</td>
                <td className="px-4 py-3 font-mono text-accent-red">{s.maxDrawdown}%</td>
                <td className="px-4 py-3 font-mono text-muted">{s.trades}</td>
                <td className="px-4 py-3">
                  <span className={`chip text-[10px] ${s.enabled ? "border-accent-green/30 bg-accent-green/10 text-accent-green" : "text-muted"}`}>
                    {s.enabled ? "Active" : "Paused"}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
