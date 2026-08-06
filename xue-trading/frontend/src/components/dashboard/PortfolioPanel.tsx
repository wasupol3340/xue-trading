"use client";

import { Briefcase, TrendingUp } from "lucide-react";
import { useTradingStore } from "@/store/useTradingStore";
import { RadialProgress } from "@/components/ui/RadialProgress";
import { RiskMeter } from "@/components/ui/Meter";
import { fmtMoney, fmtPct, fmtSignedMoney, signCls } from "@/lib/utils";
import { Panel } from "@/components/ui/Panel";

export function PortfolioPanel() {
  const p = useTradingStore((s) => s.portfolio);

  return (
    <div className="flex flex-col gap-4">
      <Panel title="ภาพรวมพอร์ตโฟลิโอ" delay={0.1}>
        <div className="flex items-center gap-4">
          <RadialProgress value={p.profitPct} label={`${p.profitPct}%`} sublabel="อิควิตี้" color="#3b82f6" size={104} />
          <div className="flex-1 space-y-2.5">
            <Row label="ยอดเงิน" value={fmtMoney(p.balance)} />
            <Row label="อิควิตี้" value={fmtMoney(p.equity)} />
            <Row label="กำไรลอย (ไม้เปิด)" value={`${fmtSignedMoney(p.profit)} (${fmtPct(p.profitPct)})`} className={signCls(p.profit)} />
            <Row label="Drawdown" value={fmtPct(-p.drawdown)} className="text-down" />
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-4">
        <Panel delay={0.15}>
          <div className="flex items-center gap-2 text-muted">
            <Briefcase className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">ไม้ที่เปิด</span>
          </div>
          <p className="mt-2 stat-value">{p.openPositions}</p>
        </Panel>
        <Panel delay={0.2}>
          <div className="flex items-center gap-2 text-muted">
            <TrendingUp className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">กำไรลอยตอนนี้</span>
          </div>
          <p className={`mt-2 stat-value ${signCls(p.totalProfit)}`}>{fmtSignedMoney(p.totalProfit)}</p>
        </Panel>
      </div>

      <Panel delay={0.25}>
        <div className="mb-2 flex items-center justify-between">
          <span className="panel-title">มิเตอร์ความเสี่ยง</span>
          <span className="font-mono text-sm font-semibold text-brand">{p.riskMeter.toFixed(2)}%</span>
        </div>
        <RiskMeter value={p.riskMeter} />
      </Panel>

      <div className="grid grid-cols-2 gap-4">
        <Panel delay={0.3}>
          <span className="panel-title">อัตราชนะ</span>
          <p className="mt-2 stat-value text-accent-cyan">{p.winRate}%</p>
        </Panel>
        <Panel delay={0.35}>
          <span className="panel-title">กำไรปิดแล้ววันนี้</span>
          <p className={`mt-2 stat-value ${signCls(p.todayProfit)}`}>{fmtSignedMoney(p.todayProfit)}</p>
        </Panel>
      </div>
    </div>
  );
}

function Row({ label, value, className }: { label: string; value: string; className?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[11px] uppercase tracking-wider text-muted">{label}</span>
      <span className={`font-mono text-sm font-semibold text-white ${className || ""}`}>{value}</span>
    </div>
  );
}
