"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Play } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { PageHeader } from "@/components/layout/PageHeader";
import { STRATEGIES } from "@/lib/mock-data";

function buildEquity() {
  const data: { i: number; equity: number; drawdown: number }[] = [];
  let eq = 1000;
  let peak = 1000;
  for (let i = 0; i < 120; i++) {
    eq += (Math.random() - 0.42) * 26;
    eq = Math.max(600, eq);
    peak = Math.max(peak, eq);
    data.push({ i, equity: +eq.toFixed(2), drawdown: +(((eq - peak) / peak) * 100).toFixed(2) });
  }
  return data;
}

export default function BacktestPage() {
  const [strategy, setStrategy] = useState(STRATEGIES[0].id);
  const [running, setRunning] = useState(false);
  const data = useMemo(buildEquity, [strategy, running]);
  const final = data[data.length - 1].equity;
  const ret = (((final - 1000) / 1000) * 100).toFixed(1);
  const maxDd = Math.min(...data.map((d) => d.drawdown)).toFixed(1);

  return (
    <div>
      <PageHeader title="Backtesting" subtitle="Simulate any strategy over historical XAUUSD data before the AI deploys capital." />

      <div className="glass mb-5 flex flex-wrap items-end gap-4 p-4">
        <div>
          <label className="panel-title mb-1.5 block">Strategy</label>
          <select value={strategy} onChange={(e) => setStrategy(e.target.value)} className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white focus:outline-none">
            {STRATEGIES.map((s) => (
              <option key={s.id} value={s.id} className="bg-bg-panel">
                {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="panel-title mb-1.5 block">Timeframe</label>
          <select className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white focus:outline-none">
            {["M15", "H1", "H4", "D1"].map((t) => (
              <option key={t} className="bg-bg-panel">{t}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="panel-title mb-1.5 block">Period</label>
          <select className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white focus:outline-none">
            {["3 Months", "6 Months", "1 Year", "3 Years"].map((t) => (
              <option key={t} className="bg-bg-panel">{t}</option>
            ))}
          </select>
        </div>
        <button onClick={() => setRunning((r) => !r)} className="btn-primary ml-auto">
          <Play className="h-4 w-4" /> Run Backtest
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="glass p-4">
          <h3 className="panel-title mb-3">Equity Curve</h3>
          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={data}>
              <defs>
                <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.5} />
                  <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="i" tick={{ fill: "#5b6478", fontSize: 11 }} />
              <YAxis tick={{ fill: "#5b6478", fontSize: 11 }} domain={["dataMin - 50", "dataMax + 50"]} />
              <Tooltip contentStyle={{ background: "#0c111d", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#fff" }} />
              <Area type="monotone" dataKey="equity" stroke="#22d3ee" strokeWidth={2} fill="url(#eq)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="flex flex-col gap-4">
          <Metric label="Net Return" value={`${+ret >= 0 ? "+" : ""}${ret}%`} tone={+ret >= 0 ? "text-up" : "text-down"} />
          <Metric label="Final Equity" value={`$${final.toFixed(0)}`} tone="text-accent-cyan" />
          <Metric label="Max Drawdown" value={`${maxDd}%`} tone="text-down" />
          <Metric label="Profit Factor" value={STRATEGIES.find((s) => s.id === strategy)!.profitFactor.toFixed(2)} tone="text-white" />
          <Metric label="Sharpe Ratio" value={STRATEGIES.find((s) => s.id === strategy)!.sharpe.toFixed(2)} tone="text-brand" />
          <Metric label="Win Rate" value={`${STRATEGIES.find((s) => s.id === strategy)!.winRate}%`} tone="text-accent-violet" />
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="glass p-4">
      <p className="panel-title">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-bold ${tone}`}>{value}</p>
    </motion.div>
  );
}
