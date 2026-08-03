"use client";

import { motion } from "framer-motion";
import { CheckCircle2 } from "lucide-react";
import { MEETING } from "@/lib/mock-data";
import { PageHeader } from "@/components/layout/PageHeader";

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

const votes = [
  { agent: "CEO", vote: "BUY" },
  { agent: "Research", vote: "BUY" },
  { agent: "News", vote: "WAIT" },
  { agent: "Risk", vote: "BUY" },
  { agent: "Strategy", vote: "BUY" },
  { agent: "Execution", vote: "BUY" },
  { agent: "Learning", vote: "BUY" },
  { agent: "Monitor", vote: "BUY" },
];

export default function MeetingPage() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      <div>
        <PageHeader title="AI Meeting Room" subtitle="Agents convene every 15 minutes to debate, vote, and reach an autonomous decision." />
        <div className="glass p-5">
          <div className="relative space-y-4 before:absolute before:left-[19px] before:top-2 before:h-[calc(100%-1rem)] before:w-px before:bg-white/10">
            {MEETING.messages.map((m, i) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="relative flex gap-4 pl-1"
              >
                <div className="z-10 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[11px] font-bold text-white" style={{ background: `linear-gradient(135deg, ${agentColor[m.agent]}, rgba(0,0,0,0.5))` }}>
                  {m.agent.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold" style={{ color: agentColor[m.agent] }}>
                      {m.agent} AI
                    </span>
                    <span className="font-mono text-[10px] text-muted">{m.time}</span>
                  </div>
                  <p className="mt-1 text-sm text-white/90">{m.text}</p>
                  {m.vote && <span className="mt-1 inline-block text-[11px] font-bold text-accent-green">Vote: {m.vote === "BUY_STRONG" ? "BUY (strong)" : m.vote}</span>}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <PageHeader title="Voting" />
        <div className="glass p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="panel-title">Live Tally</span>
            <span className="font-mono text-sm font-bold text-accent-green">8 / 8</span>
          </div>
          <div className="space-y-2">
            {votes.map((v, i) => (
              <motion.div key={v.agent} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.06 }} className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
                <span className="text-xs font-medium text-white">{v.agent} AI</span>
                <span className={`text-xs font-bold ${v.vote === "BUY" ? "text-accent-green" : v.vote === "SELL" ? "text-accent-red" : "text-brand"}`}>{v.vote}</span>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="glass border-accent-green/20 bg-accent-green/5 p-5 text-center">
          <CheckCircle2 className="mx-auto mb-2 h-8 w-8 text-accent-green" />
          <p className="text-xs uppercase tracking-wider text-muted">Final Decision</p>
          <p className="text-3xl font-black text-accent-green">BUY</p>
          <p className="mt-1 text-xs text-muted">Consensus confidence {MEETING.confidence}%</p>
        </div>
      </div>
    </div>
  );
}
