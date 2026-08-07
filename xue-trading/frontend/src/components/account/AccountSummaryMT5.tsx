"use client";

import { useEffect, useState } from "react";
import { Wallet, PiggyBank, Gift, TrendingUp, CalendarDays } from "lucide-react";
import { api } from "@/lib/api";

// แผงสรุปบัญชี "ตรงกับ MT5" — ตัวเลขดิบจาก MT5 (บัญชีเซนต์) ใช้ร่วมกันทั้ง
// หน้าศูนย์ประสบการณ์ และ ประวัติการเทรด (DRY ที่เดียว แก้ที่เดียว)
type Ledger = {
  balance?: number | null;
  deposits?: number | null;
  withdrawals?: number | null;
  realized_all_time?: number | null;
  trade_realized?: number | null;
  credit_bonus?: number | null;
  realized_today?: number | null;
};

const n2 = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : v.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const signed = (v: number | null | undefined) =>
  v === null || v === undefined ? "—" : `${v >= 0 ? "+" : ""}${n2(v)}`;

export function AccountSummaryMT5() {
  const [led, setLed] = useState<Ledger | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const r = await api.accountSummary();
        if (!alive) return;
        setLed(r || null);
        setErr(false);
      } catch {
        if (alive) setErr(true);
      }
    };
    load();
    const iv = setInterval(load, 20000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, []);

  // ยังไม่มีข้อมูล (เช่น MT5 ไม่ได้เชื่อม) → ซ่อนแผงไปเลย ไม่รบกวนหน้าจอ
  if (err || !led || led.balance === null || led.balance === undefined) return null;

  const usd = (v: number | null | undefined) =>
    v === null || v === undefined ? "—" : `≈ $${(v / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="glass mb-5 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="panel-title">สรุปบัญชี (ตรงกับ MT5)</p>
        <span className="rounded bg-white/[0.05] px-2 py-0.5 text-[10px] text-muted">
          บัญชีเซนต์ · ตัวเลขดิบเท่า MT5 (จริง = ÷100)
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Tile icon={<Wallet className="h-4 w-4" />} label="ยอดเงินรวม" value={n2(led.balance)} sub={usd(led.balance)} tone="text-white" />
        <Tile icon={<PiggyBank className="h-4 w-4" />} label="เงินฝาก" value={n2(led.deposits)} sub={usd(led.deposits)} tone="text-accent-cyan" />
        <Tile icon={<Gift className="h-4 w-4" />} label="เครดิต/โบนัส" value={n2(led.credit_bonus)} sub={usd(led.credit_bonus)} tone="text-accent-violet" />
        <Tile
          icon={<TrendingUp className="h-4 w-4" />}
          label="กำไรเทรดจริง (สะสม)"
          value={signed(led.trade_realized)}
          sub={usd(led.trade_realized)}
          tone={(led.trade_realized ?? 0) >= 0 ? "text-accent-green" : "text-accent-red"}
        />
        <Tile
          icon={<CalendarDays className="h-4 w-4" />}
          label="กำไรวันนี้"
          value={signed(led.realized_today)}
          sub={usd(led.realized_today)}
          tone={(led.realized_today ?? 0) >= 0 ? "text-accent-green" : "text-accent-red"}
        />
      </div>
      <p className="mt-3 text-[11px] text-muted">
        “กำไรเทรดจริง” คือผลรวมทุกดีลใน MT5 (รวมค่าคอม/สวอป) — ตรงกับที่บันทึกในศูนย์ประสบการณ์ ·
        “เครดิต/โบนัส” ไม่ใช่กำไรจากการเทรด
      </p>
    </div>
  );
}

function Tile({ icon, label, value, sub, tone }: { icon: React.ReactNode; label: string; value: string; sub: string; tone: string }) {
  return (
    <div className="rounded-xl border border-white/[0.05] bg-black/20 p-3">
      <div className="flex items-center gap-1.5 text-muted">
        {icon}
        <span className="text-[11px]">{label}</span>
      </div>
      <p className={`mt-1 font-mono text-xl font-bold ${tone}`}>{value}</p>
      <p className="mt-0.5 text-[10px] text-muted">{sub}</p>
    </div>
  );
}
