"use client";

import { motion } from "framer-motion";
import { PageHeader } from "@/components/layout/PageHeader";
import { fmtMoney, fmtNumber, timeAgo } from "@/lib/utils";
import { useTradingStore } from "@/store/useTradingStore";

export default function PortfolioPage() {
  // อ่านข้อมูลจริงจาก store ที่ useBackendSync เติมให้จากบัญชี MT5 จริงทุก 5 วินาที
  // (แทนที่การใช้เลขตัวอย่างที่ค้างไว้ตั้งแต่ตอนสร้างเว็บ)
  const p = useTradingStore((s) => s.portfolio);
  const positions = useTradingStore((s) => s.positions);
  return (
    <div>
      <PageHeader title="พอร์ตโฟลิโอ" subtitle="อิควิตี้บัญชีแบบสด ไม้ที่เปิด และความเสี่ยงที่รับอยู่" />

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="ยอดเงิน" value={fmtMoney(p.balance)} />
        <Stat label="อิควิตี้" value={fmtMoney(p.equity)} tone="text-accent-cyan" />
        <Stat label="กำไรรวม" value={`${p.totalProfit >= 0 ? "+" : ""}${fmtMoney(p.totalProfit)}`} tone={p.totalProfit >= 0 ? "text-up" : "text-down"} />
        <Stat label="วันนี้" value={`${p.todayProfit >= 0 ? "+" : ""}${fmtMoney(p.todayProfit)}`} tone={p.todayProfit >= 0 ? "text-up" : "text-down"} />
        <Stat label="อัตราชนะ" value={`${p.winRate}%`} tone="text-accent-violet" />
        <Stat label="Drawdown" value={`${p.drawdown}%`} tone="text-down" />
      </div>

      <div className="glass overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-muted">
              {["สัญลักษณ์", "ฝั่ง", "ล็อต", "ราคาเข้า", "ปัจจุบัน", "SL", "TP", "กำไร/ขาดทุน", "เปิดเมื่อ", "Magic"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {positions.map((pos, i) => (
              <motion.tr key={pos.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-semibold text-white">{pos.symbol}</td>
                <td className="px-4 py-3">
                  <span className={`chip text-[10px] font-bold ${pos.side === "BUY" ? "text-accent-green" : "text-accent-red"}`}>{pos.side}</span>
                </td>
                <td className="px-4 py-3 font-mono text-white">{pos.lots.toFixed(2)}</td>
                <td className="px-4 py-3 font-mono text-muted">{fmtNumber(pos.entry)}</td>
                <td className="px-4 py-3 font-mono text-white">{fmtNumber(pos.current)}</td>
                <td className="px-4 py-3 font-mono text-accent-red">{fmtNumber(pos.sl)}</td>
                <td className="px-4 py-3 font-mono text-accent-green">{fmtNumber(pos.tp)}</td>
                <td className={`px-4 py-3 font-mono font-bold ${pos.pnl >= 0 ? "text-up" : "text-down"}`}>{pos.pnl >= 0 ? "+" : ""}{fmtMoney(pos.pnl)}</td>
                <td className="px-4 py-3 text-muted">{timeAgo(pos.openedAt)}</td>
                <td className="px-4 py-3 font-mono text-muted">{pos.magic}</td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({ label, value, tone = "text-white" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="glass p-4">
      <p className="panel-title">{label}</p>
      <p className={`mt-1 font-mono text-lg font-bold ${tone}`}>{value}</p>
    </div>
  );
}
