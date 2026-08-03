"use client";

import { motion } from "framer-motion";
import { useTradingStore } from "@/store/useTradingStore";
import { cn } from "@/lib/utils";

function Waveform({ color }: { color: string }) {
  return (
    <div className="flex items-end gap-0.5">
      {[0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.45].map((h, i) => (
        <motion.span
          key={i}
          className="w-0.5 rounded-full"
          style={{ background: color }}
          animate={{ height: [`${h * 10}px`, `${h * 18}px`, `${h * 8}px`] }}
          transition={{ duration: 1, repeat: Infinity, delay: i * 0.09 }}
        />
      ))}
    </div>
  );
}

export function AgentRail() {
  const agents = useTradingStore((s) => s.agents);

  return (
    <div className="glass flex h-full flex-col p-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="panel-title">AI Agents</h3>
        <span className="chip border-accent-green/30 bg-accent-green/10 text-accent-green">8/8 Online</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto pr-0.5">
        {agents.map((a, i) => (
          <motion.button
            key={a.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="group relative flex items-center gap-3 rounded-xl border border-white/[0.05] bg-white/[0.015] p-2.5 text-left transition-all hover:border-white/10 hover:bg-white/[0.04]"
          >
            <div className="relative">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold text-white"
                style={{ background: `linear-gradient(135deg, ${a.accent}, rgba(0,0,0,0.4))`, boxShadow: `0 0 18px ${a.accent}44` }}
              >
                {a.name.split(" ")[0].slice(0, 2).toUpperCase()}
              </div>
              <span
                className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-bg-panel"
                style={{ background: a.accent }}
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-white">{a.name}</p>
              <p className="truncate text-[11px] text-muted">{a.title}</p>
              <p className="mt-0.5 text-[11px] font-medium" style={{ color: a.accent }}>
                {a.statusLabel}
                <span className="animate-pulse">…</span>
              </p>
            </div>
            <Waveform color={a.accent} />
          </motion.button>
        ))}
      </div>
    </div>
  );
}
