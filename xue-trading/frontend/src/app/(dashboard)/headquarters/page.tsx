"use client";

import { motion } from "framer-motion";
import { ArrowRight, Database, Bot } from "lucide-react";
import { useTradingStore } from "@/store/useTradingStore";
import { useLiveTicker } from "@/hooks/useLiveTicker";
import { AgentCard } from "@/components/agents/AgentCard";
import { PageHeader } from "@/components/layout/PageHeader";

const WORKFLOW = ["Market Data", "Research AI", "Strategy AI", "News AI", "Risk AI", "CEO AI", "Execution AI", "MT5"];

export default function HeadquartersPage() {
  useLiveTicker();
  const agents = useTradingStore((s) => s.agents);

  return (
    <div>
      <PageHeader
        title="AI Headquarters"
        subtitle="A fully autonomous AI trading company — 8 specialized agents, zero human confirmation required."
        action={
          <span className="chip border-accent-green/30 bg-accent-green/10 text-accent-green">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-green" /> Autonomous · Live
          </span>
        }
      />

      {/* Workflow pipeline */}
      <div className="glass mb-5 overflow-x-auto p-4">
        <h3 className="panel-title mb-3">Decision Pipeline</h3>
        <div className="flex min-w-max items-center gap-2">
          {WORKFLOW.map((step, i) => (
            <motion.div
              key={step}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.06 }}
              className="flex items-center gap-2"
            >
              <div className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.03] px-3 py-2">
                {i === 0 ? <Database className="h-4 w-4 text-accent-cyan" /> : i === WORKFLOW.length - 1 ? <Database className="h-4 w-4 text-brand" /> : <Bot className="h-4 w-4 text-accent-violet" />}
                <span className="whitespace-nowrap text-xs font-semibold text-white">{step}</span>
              </div>
              {i < WORKFLOW.length - 1 && <ArrowRight className="h-4 w-4 shrink-0 text-muted" />}
            </motion.div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-muted">
          Learning AI continuously evaluates every executed trade and updates each strategy&apos;s score, win-rate, profit factor and Sharpe ratio.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {agents.map((a, i) => (
          <AgentCard key={a.id} agent={a} index={i} />
        ))}
      </div>
    </div>
  );
}
