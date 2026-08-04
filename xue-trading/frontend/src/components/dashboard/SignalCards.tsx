"use client";

import { TrendingUp, Activity, Zap, Gauge } from "lucide-react";
import { RadialProgress } from "@/components/ui/RadialProgress";
import { Panel } from "@/components/ui/Panel";

export function SignalCards() {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
      <Panel delay={0.05}>
        <span className="panel-title">สัญญาณ AI</span>
        <div className="mt-2 flex items-center gap-2">
          <p className="text-2xl font-bold text-accent-green">ซื้อ</p>
          <TrendingUp className="h-5 w-5 text-accent-green" />
        </div>
        <p className="mt-1 text-[11px] text-muted">สัญญาณซื้อแรง ↗</p>
      </Panel>

      <Panel delay={0.1}>
        <span className="panel-title">ความมั่นใจ</span>
        <div className="mt-1 flex items-center justify-center">
          <RadialProgress value={87} label="87%" size={72} stroke={6} color="#22c55e" />
        </div>
        <p className="text-center text-[11px] font-medium text-accent-green">ความมั่นใจสูง</p>
      </Panel>

      <Panel delay={0.15}>
        <span className="panel-title">เทรนด์</span>
        <div className="mt-2 flex items-center gap-2">
          <p className="text-2xl font-bold text-accent-cyan">ขาขึ้น</p>
        </div>
        <p className="mt-1 flex items-center gap-1 text-[11px] text-muted">
          <Activity className="h-3 w-3" /> เทรนด์ขาขึ้น ↗
        </p>
      </Panel>

      <Panel delay={0.2}>
        <span className="panel-title">ความผันผวน</span>
        <div className="mt-2 flex items-center gap-2">
          <p className="text-2xl font-bold text-brand">ปานกลาง</p>
          <Zap className="h-5 w-5 text-brand" />
        </div>
        <p className="mt-1 text-[11px] text-muted">ช่วงปกติ</p>
      </Panel>

      <Panel delay={0.25}>
        <span className="panel-title">คะแนน AI</span>
        <div className="mt-1 flex items-center justify-center">
          <RadialProgress value={87} label="8.7" sublabel="/10" size={72} stroke={6} color="#8b5cf6" />
        </div>
        <p className="flex items-center justify-center gap-1 text-center text-[11px] font-medium text-accent-violet">
          <Gauge className="h-3 w-3" /> ยอดเยี่ยม
        </p>
      </Panel>
    </div>
  );
}
