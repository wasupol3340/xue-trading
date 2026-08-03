"use client";

import { useTradingStore } from "@/store/useTradingStore";
import { useLiveTicker } from "@/hooks/useLiveTicker";
import { AgentCard } from "@/components/agents/AgentCard";
import { PageHeader } from "@/components/layout/PageHeader";

export default function AgentsPage() {
  useLiveTicker();
  const agents = useTradingStore((s) => s.agents);
  const avgCpu = Math.round(agents.reduce((a, b) => a + b.cpu, 0) / agents.length);
  const avgConf = Math.round(agents.reduce((a, b) => a + b.confidence, 0) / agents.length);

  return (
    <div>
      <PageHeader title="AI Agents" subtitle="Monitor & configure each specialized trading agent in real time." />
      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Agents Online" value="8 / 8" tone="text-accent-green" />
        <Stat label="Avg Confidence" value={`${avgConf}%`} tone="text-accent-cyan" />
        <Stat label="Avg CPU Load" value={`${avgCpu}%`} tone="text-brand" />
        <Stat label="System Health" value="99.9%" tone="text-accent-violet" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {agents.map((a, i) => (
          <AgentCard key={a.id} agent={a} index={i} />
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="glass p-4">
      <p className="panel-title">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}
