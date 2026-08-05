"use client";

import { motion } from "framer-motion";
import { Activity } from "lucide-react";

type Tone = "green" | "red" | "amber" | "cyan" | "muted";
type Metric = { label: string; value: string; tone?: Tone };
export type AgentLive = {
  id: string;
  name: string;
  role: string;
  status: string;
  metrics: Metric[];
  highlight: { label: string; value: string; tone?: Tone };
};

const TONE: Record<Tone, string> = {
  green: "#22c55e",
  red: "#ef4444",
  amber: "#f0b429",
  cyan: "#38bdf8",
  muted: "#8b90a0",
};

const ACCENT: Record<string, string> = {
  research: "#8b5cf6", macro: "#38bdf8", risk: "#ef4444", ceo: "#f0b429",
  cio: "#22c55e", execution: "#f97316", learning: "#a855f7", monitor: "#14b8a6",
};

const color = (t?: Tone) => TONE[t || "muted"];

export function AgentLiveCard({ agent, index }: { agent: AgentLive; index: number }) {
  const accent = ACCENT[agent.id] || "#8b5cf6";
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -3 }}
      className="glass-strong group relative overflow-hidden p-4"
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-20 blur-2xl transition-opacity group-hover:opacity-35"
        style={{ background: accent }}
      />

      {/* header */}
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white"
          style={{ background: `linear-gradient(135deg, ${accent}, rgba(0,0,0,0.5))`, boxShadow: `0 0 22px ${accent}55` }}
        >
          {agent.name.split(" ")[0].slice(0, 2).toUpperCase()}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-bold text-white">{agent.name}</p>
          <span
            className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold"
            style={{ background: `${accent}22`, color: accent }}
          >
            <Activity className="h-2.5 w-2.5" /> {agent.status}
          </span>
        </div>
        <div className="shrink-0 text-right">
          <div className="text-lg font-bold leading-none" style={{ color: color(agent.highlight.tone) }}>
            {agent.highlight.value}
          </div>
          <div className="mt-1 text-[9px] uppercase tracking-wider text-muted">{agent.highlight.label}</div>
        </div>
      </div>

      {/* metric grid */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {agent.metrics.map((m, i) => (
          <div key={i} className="rounded-lg border border-white/[0.06] bg-black/20 px-2.5 py-1.5">
            <div className="truncate text-[10px] text-muted" title={m.label}>{m.label}</div>
            <div className="truncate text-xs font-bold" style={{ color: color(m.tone) }} title={m.value}>
              {m.value}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
