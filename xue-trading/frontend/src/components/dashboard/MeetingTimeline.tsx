"use client";

import { motion } from "framer-motion";
import { CheckCircle2, Radio } from "lucide-react";
import { useTradingStore } from "@/store/useTradingStore";
import { Vote } from "@/types";

const voteStyle: Record<string, string> = {
  BUY: "text-accent-green",
  BUY_STRONG: "text-accent-green",
  SELL: "text-accent-red",
  WAIT: "text-brand",
};

const agentColor: Record<string, string> = {
  CEO: "#f0b429",
  Research: "#3b82f6",
  News: "#22c55e",
  Risk: "#8b5cf6",
  Strategy: "#f6ad55",
  Execution: "#22d3ee",
  Learning: "#60a5fa",
  Monitor: "#2dd4bf",
};

export function MeetingTimeline() {
  const meeting = useTradingStore((s) => s.meeting);

  return (
    <div className="glass p-4">
      <div className="mb-4 flex items-center gap-2">
        <Radio className="h-4 w-4 text-accent-cyan" />
        <h3 className="text-sm font-semibold text-white">AI Meeting Room</h3>
        <span className="chip border-accent-green/30 bg-accent-green/10 text-accent-green">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-green" /> Live Discussion
        </span>
        <span className="ml-auto text-[11px] text-muted">Every 15 min · cycle {meeting.id}</span>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2">
        {meeting.messages.map((m, i) => (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.08 }}
            className="relative min-w-[160px] flex-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3"
            style={{ borderTopColor: agentColor[m.agent], borderTopWidth: 2 }}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-bold" style={{ color: agentColor[m.agent] }}>
                {m.agent} AI
              </span>
              <span className="font-mono text-[10px] text-muted">{m.time}</span>
            </div>
            <p className="text-[11px] leading-snug text-muted">{m.text}</p>
            {m.vote && (
              <span className={`mt-2 inline-block text-[11px] font-bold ${voteStyle[m.vote]}`}>
                {m.vote === "BUY_STRONG" ? "BUY ✓" : m.vote}
              </span>
            )}
          </motion.div>
        ))}

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: meeting.messages.length * 0.08 }}
          className="flex min-w-[130px] flex-col items-center justify-center rounded-xl border border-brand/30 bg-brand/5 p-3"
        >
          <div className="relative">
            <svg width={56} height={56} className="-rotate-90">
              <circle cx={28} cy={28} r={24} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={5} />
              <circle cx={28} cy={28} r={24} fill="none" stroke="#8b5cf6" strokeWidth={5} strokeLinecap="round" strokeDasharray={2 * Math.PI * 24} strokeDashoffset={0} />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center font-mono text-sm font-bold text-white">{meeting.approved}/{meeting.total}</span>
          </div>
          <span className="mt-1 text-[10px] uppercase tracking-wider text-muted">Approved</span>
        </motion.div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-3 flex items-center justify-center gap-2 rounded-xl border border-accent-green/20 bg-accent-green/5 py-2.5"
      >
        <CheckCircle2 className="h-4 w-4 text-accent-green" />
        <span className="text-sm font-semibold text-white">All agents agreed to execute trade</span>
        <span className="text-sm font-bold text-accent-green">· Confidence {meeting.confidence}%</span>
      </motion.div>
    </div>
  );
}
