"use client";

import { motion } from "framer-motion";
import { Cpu, MemoryStick, Activity } from "lucide-react";
import { Agent } from "@/types";
import { Meter } from "@/components/ui/Meter";
import { RadialProgress } from "@/components/ui/RadialProgress";

export function AgentCard({ agent, index }: { agent: Agent; index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4 }}
      className="glass-strong group relative overflow-hidden p-4"
    >
      <div
        className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-25 blur-2xl transition-opacity group-hover:opacity-40"
        style={{ background: agent.accent }}
      />
      <div className="flex items-start gap-3">
        <div className="relative">
          <div
            className="flex h-14 w-14 items-center justify-center rounded-xl text-lg font-black text-white"
            style={{ background: `linear-gradient(135deg, ${agent.accent}, rgba(0,0,0,0.5))`, boxShadow: `0 0 26px ${agent.accent}55` }}
          >
            {agent.name.split(" ")[0].slice(0, 2).toUpperCase()}
          </div>
          <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-bg-panel" style={{ background: agent.accent }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">{agent.name}</p>
          <p className="text-[11px] text-muted">{agent.title}</p>
          <span className="mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold" style={{ background: `${agent.accent}22`, color: agent.accent }}>
            <Activity className="h-2.5 w-2.5" /> {agent.statusLabel}
          </span>
        </div>
        <RadialProgress value={agent.confidence} label={`${agent.confidence}`} size={52} stroke={5} color={agent.accent} />
      </div>

      <p className="mt-3 line-clamp-2 rounded-lg border border-white/[0.05] bg-black/20 p-2 text-[11px] text-muted">
        <span className="font-semibold text-white/80">งาน: </span>
        {agent.currentTask}
      </p>

      <div className="mt-3 space-y-2">
        <ResourceRow icon={<Cpu className="h-3 w-3" />} label="CPU" value={agent.cpu} color={agent.accent} />
        <ResourceRow icon={<MemoryStick className="h-3 w-3" />} label="MEM" value={agent.memory} color={agent.accent} />
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
        <span className="text-[10px] uppercase tracking-wider text-muted">ประสิทธิภาพ</span>
        <span className="font-mono text-sm font-bold" style={{ color: agent.accent }}>
          {agent.performance}%
        </span>
      </div>
    </motion.div>
  );
}

function ResourceRow({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="flex w-10 items-center gap-1 text-[10px] font-medium text-muted">
        {icon} {label}
      </span>
      <div className="flex-1">
        <Meter value={value} color={color} height={5} />
      </div>
      <span className="w-9 text-right font-mono text-[10px] text-muted">{value}%</span>
    </div>
  );
}
