"use client";

import { useEffect, useState } from "react";
import { Briefcase, TrendingUp } from "lucide-react";
import { useTradingStore } from "@/store/useTradingStore";
import { useAccountStore } from "@/store/useAccountStore";
import { api } from "@/lib/api";
import { RadialProgress } from "@/components/ui/RadialProgress";
import { RiskMeter } from "@/components/ui/Meter";
import { fmtMoney, fmtPct, fmtSignedMoney, signCls } from "@/lib/utils";
import { Panel } from "@/components/ui/Panel";

export function PortfolioPanel() {
  const p = useTradingStore((s) => s.portfolio);

  // แยกตามบัญชี: คริปโต(Binance) → ดึงยอด/ไม้เปิดจริงของบอทมาโชว์แทนข้อมูลทอง
  const currentId = useAccountStore((s) => s.currentId);
  const accounts = useAccountStore((s) => s.accounts);
  const loadAccounts = useAccountStore((s) => s.load);
  const acc = accounts.find((a) => a.id === currentId);
  const isCrypto = !!acc && (acc.asset === "crypto" || String(acc.broker || "").startsWith("binance"));
  const [c, setC] = useState<any>(null);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => {
    if (!isCrypto) { setC(null); return; }
    let alive = true;
    const load = async () => {
      try { const r = await api.accountSummary(currentId || undefined); if (alive) setC(r); } catch { /* keep */ }
    };
    load();
    const iv = setInterval(load, 15000);
    return () => { alive = false; clearInterval(iv); };
  }, [currentId, isCrypto]);

  // ตัวจัดรูปเงินตามสกุลของบัญชี (คริปโต=บาท/USDT, ทอง=USD)
  const q = c?.quote || "THB";
  const money = (v: any) => {
    if (v === null || v === undefined) return "—";
    try { return new Intl.NumberFormat("en-US", { style: "currency", currency: q }).format(Number(v)); }
    catch { return Number(v).toLocaleString("en-US", { maximumFractionDigits: 2 }) + " " + q; }
  };
  const signedMoney = (v: any) => (Number(v) >= 0 ? "+" : "") + money(v);

  // ค่าที่จะแสดง — เลือกตามบัญชี
  const balance = isCrypto ? Number(c?.balance ?? 0) : p.balance;
  const equity = isCrypto ? Number(c?.equity ?? 0) : p.equity;
  const floating = isCrypto ? Number(c?.floating_pnl ?? c?.unrealized_pnl ?? 0) : p.profit;
  const openCount = isCrypto ? Number(c?.open_count ?? 0) : p.openPositions;
  const winRate = isCrypto ? Number(c?.win_rate ?? 0) : p.winRate;
  const todayProfit = isCrypto ? Number(c?.realized_today ?? 0) : p.todayProfit;
  const profitPct = isCrypto ? (balance ? Number((((equity - balance) / balance) * 100).toFixed(2)) : 0) : p.profitPct;
  const drawdown = isCrypto ? (balance ? Math.max(0, Number((((balance - equity) / balance) * 100).toFixed(2))) : 0) : p.drawdown;
  const riskMeter = isCrypto ? Math.min(100, Math.abs(profitPct)) : p.riskMeter;

  const M = isCrypto ? money : (v: number) => fmtMoney(v);
  const SM = isCrypto ? signedMoney : (v: number) => fmtSignedMoney(v);

  return (
    <div className="flex flex-col gap-4">
      <Panel title={`ภาพรวมพอร์ตโฟลิโอ${acc ? ` · ${acc.name}` : ""}`} delay={0.1}>
        <div className="flex items-center gap-4">
          <RadialProgress value={profitPct} label={`${profitPct}%`} sublabel="อิควิตี้" color="#3b82f6" size={104} />
          <div className="flex-1 space-y-2.5">
            <Row label="ยอดเงิน" value={M(balance)} />
            <Row label="อิควิตี้" value={M(equity)} />
            <Row label="กำไรลอย (ไม้เปิด)" value={`${SM(floating)} (${fmtPct(profitPct)})`} className={signCls(floating)} />
            <Row label="Drawdown" value={fmtPct(-drawdown)} className="text-down" />
          </div>
        </div>
      </Panel>

      <div className="grid grid-cols-2 gap-4">
        <Panel delay={0.15}>
          <div className="flex items-center gap-2 text-muted">
            <Briefcase className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">ไม้ที่เปิด</span>
          </div>
          <p className="mt-2 stat-value">{openCount}</p>
        </Panel>
        <Panel delay={0.2}>
          <div className="flex items-center gap-2 text-muted">
            <TrendingUp className="h-4 w-4" />
            <span className="text-[11px] font-semibold uppercase tracking-wider">กำไรลอยตอนนี้</span>
          </div>
          <p className={`mt-2 stat-value ${signCls(floating)}`}>{SM(floating)}</p>
        </Panel>
      </div>

      <Panel delay={0.25}>
        <div className="mb-2 flex items-center justify-between">
          <span className="panel-title">มิเตอร์ความเสี่ยง</span>
          <span className="font-mono text-sm font-semibold text-brand">{riskMeter.toFixed(2)}%</span>
        </div>
        <RiskMeter value={riskMeter} />
      </Panel>

      <div className="grid grid-cols-2 gap-4">
        <Panel delay={0.3}>
          <span className="panel-title">อัตราชนะ</span>
          <p className="mt-2 stat-value text-accent-cyan">{winRate}%</p>
        </Panel>
        <Panel delay={0.35}>
          <span className="panel-title">กำไรปิดแล้ววันนี้</span>
          <p className={`mt-2 stat-value ${signCls(todayProfit)}`}>{SM(todayProfit)}</p>
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
