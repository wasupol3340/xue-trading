"use client";

import { TrendingUp, Activity, Zap, Gauge } from "lucide-react";
import { RadialProgress } from "@/components/ui/RadialProgress";
import { Panel } from "@/components/ui/Panel";

export function SignalCards() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      <Panel delay={0.05}>
        <span className="panel-title">AI Signal</span>
        <div className="mt-2 flex items-center gap-2">
          <p className="text-2xl font-bold text-accent-green">BUY</p>
          <TrendingUp className="h-5 w-5 text-accent-green" />
        </div>
        <p className="mt-1 text-[11px] text-muted">Strong Buy ↗</p>
      </Panel>

      <Panel delay={0.1}>
        <span className="panel-title">Confidence</span>
        <div className="mt-1 flex items-center justify-center">
          <RadialProgress value={87} label="87%" size={72} stroke={6} color="#22c55e" />
        </div>
        <p className="text-center text-[11px] font-medium text-accent-green">High Confidence</p>
      </Panel>

      <Panel delay={0.15}>
        <span className="panel-title">Trend</span>
        <div className="mt-2 flex items-center gap-2">
          <p className="text-2xl font-bold text-accent-cyan">BULLISH</p>
        </div>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted">
          <Activity className="h-3 w-3" /> Up Trend ↗
        </p>
      </Panel>

      <Panel delay={0.2}>
        <span className="panel-title">Volatility</span>
        <div className="mt-2 flex items-center gap-2">
          <p className="text-2xl font-bold text-brand">MEDIUM</p>
          <Zap className="h-5 w-5 text-brand" />
        </div>
        <p className="mt-1 text-[11px] text-muted">Normal Range</p>
      </Panel>

      <Panel delay={0.25}>
        <span className="panel-title">AI Score</span>
        <div className="mt-1 flex items-center justify-center">
          <RadialProgress value={87} label="8.7" sublabel="/10" size={72} stroke={6} color="#8b5cf6" />
        </div>
        <p className="flex items-center justify-center gap-1 text-center text-[11px] font-medium text-accent-violet">
          <Gauge className="h-3 w-3" /> Excellent
        </p>
      </Panel>
    </div>
  );
}
