"use client";

import { motion } from "framer-motion";
import { Brain, Radio, Cpu } from "lucide-react";
import { useTradingStore } from "@/store/useTradingStore";

export function LiveTechniqueBar() {
  const { isLive, engineRunning, currentTechniqueName, currentTechnique } = useTradingStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass flex flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3"
    >
      <div className="flex items-center gap-2">
        <span
          className={`relative flex h-2.5 w-2.5 ${engineRunning ? "" : "opacity-50"}`}
        >
          {engineRunning && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-green opacity-60" />}
          <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${engineRunning ? "bg-accent-green" : "bg-muted"}`} />
        </span>
        <span className="text-xs font-semibold text-white">
          {engineRunning ? "AI Trading Live" : isLive ? "Engine Idle" : "Demo Mode"}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Brain className="h-4 w-4 text-accent-violet" />
        <span className="panel-title !tracking-normal">Active Technique</span>
        <span className="text-sm font-bold text-gradient-gold">
          {currentTechniqueName || "—"}
        </span>
        {currentTechnique && (
          <span className="chip border-accent-violet/30 bg-accent-violet/10 text-[10px] text-accent-violet">
            learning
          </span>
        )}
      </div>

      <div className="ml-auto flex items-center gap-4 text-[11px] text-muted">
        <span className="flex items-center gap-1.5">
          <Radio className="h-3.5 w-3.5 text-accent-cyan" /> {isLive ? "Realtime feed" : "Sample data"}
        </span>
        <span className="flex items-center gap-1.5">
          <Cpu className="h-3.5 w-3.5" /> 8 agents
        </span>
      </div>
    </motion.div>
  );
}
