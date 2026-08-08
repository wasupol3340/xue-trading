"use client";

import { useEffect, useState } from "react";
import { Wallet, PiggyBank, Gift, TrendingUp, CalendarDays, Bitcoin, Activity } from "lucide-react";
import { api } from "@/lib/api";
import { useAccountStore } from "@/store/useAccountStore";

// แผงสรุปบัญชี "ตามบัญชีที่เลือก" — รองรับทั้ง MT5 (ทอง) และ Binance (คริปโต)
// ใช้ร่วมกันทั้งหน้าศูนย์ประสบการณ์ + ประวัติการเทรด (กรองตามบัญชี ไม่ปนกัน)

const n2 = (v: any) =>
  v === null || v === undefined ? "—" : Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signed = (v: any) => (v === null || v === undefined ? "—" : `${Number(v) >= 0 ? "+" : ""}${n2(v)}`);

export function AccountSummaryMT5() {
  const { currentId, accounts, load } = useAccountStore();
  const [led, setLed] = useState<any>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        const r = await api.accountSummary(currentId || undefined);
        if (alive) { setLed(r || null); setErr(false); }
      } catch {
        if (alive) setErr(true);
      }
    };
    run();
    const iv = setInterval(run, 20000);
    return () => { alive = false; clearInterval(iv); };
  }, [currentId]);

  if (err || !led) return null;
  const acc = accounts.find((a) => a.id === currentId);

  // ----- Binance (คริปโต) -----
  if (led.kind === "binance") {
    if (!led.connected) {
      return (
        <div className="glass mb-5 p-4" style={{ borderColor: "#ef444433" }}>
          <p className="panel-title mb-1">สรุปบัญชี — {acc?.name || "คริปโต"}</p>
          <p className="text-sm text-accent-red">ยังเชื่อม Binance ไม่ได้ · {led.error || "ตรวจ API key"}</p>
        </div>
      );
    }
    const q = led.quote || "USDT";
    return (
      <div className="glass mb-5 p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="panel-title">สรุปบัญชี — {acc?.name || "คริปโต"} (Binance)</p>
          <span className="rounded bg-white/[0.05] px-2 py-0.5 text-[10px] text-muted">
            {led.testnet ? "🧪 Testnet · " : ""}สกุล {q}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Tile icon={<Bitcoin className="h-4 w-4" />} label={`ยอด (${q})`} value={n2(led.balance)} tone="text-white" />
          <Tile icon={<Wallet className="h-4 w-4" />} label={`มูลค่ารวม (${q})`} value={n2(led.equity)} tone="text-accent-cyan" />
          <Tile icon={<TrendingUp className="h-4 w-4" />} label="กำไรลอยตัว" value={signed(led.unrealized_pnl)}
            tone={(led.unrealized_pnl ?? 0) >= 0 ? "text-accent-green" : "text-accent-red"} />
          <Tile icon={<Activity className="h-4 w-4" />} label={`ราคา ${led.symbol}`} value={n2(led.price)} tone="text-accent-violet" />
        </div>
        <p className="mt-3 text-[11px] text-muted">
          long-only spot · โพซิชันเปิด {led.positions?.length || 0} รายการ
          {led.positions?.length ? ` (${led.positions.map((p: any) => p.side).join(", ")})` : ""}
        </p>
      </div>
    );
  }

  // ----- MT5 (ทอง) -----
  if (led.balance === null || led.balance === undefined) return null;
  const usd = (v: any) => (v === null || v === undefined ? "—" : `≈ $${(Number(v) / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
  return (
    <div className="glass mb-5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="panel-title">สรุปบัญชี — {acc?.name || "ทอง"} (ตรงกับ MT5)</p>
        <span className="rounded bg-white/[0.05] px-2 py-0.5 text-[10px] text-muted">บัญชีเซนต์ · ตัวเลขดิบเท่า MT5 (จริง = ÷100)</span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Tile icon={<Wallet className="h-4 w-4" />} label="ยอดเงินรวม" value={n2(led.balance)} sub={usd(led.balance)} tone="text-white" />
        <Tile icon={<PiggyBank className="h-4 w-4" />} label="เงินฝาก" value={n2(led.deposits)} sub={usd(led.deposits)} tone="text-accent-cyan" />
        <Tile icon={<Gift className="h-4 w-4" />} label="เครดิต/โบนัส" value={n2(led.credit_bonus)} sub={usd(led.credit_bonus)} tone="text-accent-violet" />
        <Tile icon={<TrendingUp className="h-4 w-4" />} label="กำไรเทรดจริง (สะสม)" value={signed(led.trade_realized)} sub={usd(led.trade_realized)}
          tone={(led.trade_realized ?? 0) >= 0 ? "text-accent-green" : "text-accent-red"} />
        <Tile icon={<CalendarDays className="h-4 w-4" />} label="กำไรวันนี้" value={signed(led.realized_today)} sub={usd(led.realized_today)}
          tone={(led.realized_today ?? 0) >= 0 ? "text-accent-green" : "text-accent-red"} />
      </div>
    </div>
  );
}

function Tile({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub?: string; tone: string }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-black/20 p-3">
      <div className="flex items-center gap-1.5 text-muted">{icon}<span className="text-[11px]">{label}</span></div>
      <p className={`mt-1 font-mono text-xl font-bold ${tone}`}>{value}</p>
      {sub && <p className="mt-0.5 text-[10px] text-muted">{sub}</p>}
    </div>
  );
}
