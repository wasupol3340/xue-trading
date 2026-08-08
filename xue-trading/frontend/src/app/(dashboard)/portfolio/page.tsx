"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { fmtMoney, fmtNumber, timeAgo } from "@/lib/utils";
import { useTradingStore } from "@/store/useTradingStore";
import { useAccountStore } from "@/store/useAccountStore";
import { api } from "@/lib/api";

const n2 = (v: any) => (v === null || v === undefined ? "—" : Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

export default function PortfolioPage() {
  // อ่านตามบัญชีที่เลือก — ทอง(MT5) หรือ คริปโต(Binance) ไม่ปนกัน
  const currentId = useAccountStore((s) => s.currentId);
  const accounts = useAccountStore((s) => s.accounts);
  const loadAccounts = useAccountStore((s) => s.load);
  const goldPositions = useTradingStore((s) => s.positions); // MT5 live positions (ทองเท่านั้น)
  const [sum, setSum] = useState<any>(null);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try { const r = await api.accountSummary(currentId || undefined); if (alive) setSum(r); } catch { /* keep */ }
    };
    run();
    const iv = setInterval(run, 15000);
    return () => { alive = false; clearInterval(iv); };
  }, [currentId]);

  const acc = accounts.find((a) => a.id === currentId);
  const isCrypto = sum?.kind === "binance";
  const q = isCrypto ? (sum?.quote || "USDT") : "";

  return (
    <div>
      <PageHeader
        title="พอร์ตโฟลิโอ"
        subtitle={`อิควิตี้ + ไม้ที่เปิดของบัญชี "${acc?.name || "ที่เลือก"}" (แยกตามบัญชี ไม่ปนกัน)`}
      />

      {/* stats — ตามชนิดบัญชี */}
      {isCrypto ? (
        <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label={`ยอด (${q})`} value={n2(sum?.balance)} />
          <Stat label={`มูลค่ารวม (${q})`} value={n2(sum?.equity)} tone="text-accent-cyan" />
          <Stat label="กำไรลอยตัว" value={`${(sum?.unrealized_pnl ?? 0) >= 0 ? "+" : ""}${n2(sum?.unrealized_pnl)}`} tone={(sum?.unrealized_pnl ?? 0) >= 0 ? "text-up" : "text-down"} />
          <Stat label={`ราคา ${sum?.symbol || ""}`} value={n2(sum?.price)} tone="text-accent-violet" />
        </div>
      ) : (
        <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="ยอดเงิน" value={n2(sum?.balance)} />
          <Stat label="กำไรเทรดจริง (สะสม)" value={`${(sum?.trade_realized ?? 0) >= 0 ? "+" : ""}${n2(sum?.trade_realized)}`} tone={(sum?.trade_realized ?? 0) >= 0 ? "text-up" : "text-down"} />
          <Stat label="วันนี้" value={`${(sum?.realized_today ?? 0) >= 0 ? "+" : ""}${n2(sum?.realized_today)}`} tone={(sum?.realized_today ?? 0) >= 0 ? "text-up" : "text-down"} />
          <Stat label="เครดิต/โบนัส" value={n2(sum?.credit_bonus)} tone="text-muted" />
        </div>
      )}

      {/* open positions */}
      <div className="glass overflow-x-auto p-0">
        {isCrypto ? (
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-muted">
                {["สัญลักษณ์", "ฝั่ง", "จำนวน", "ราคาเข้า", "กำไรลอยตัว"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(sum?.positions || []).map((pos: any, i: number) => (
                <tr key={i} className="border-b border-white/[0.04]">
                  <td className="px-4 py-3 font-semibold text-white">{pos.symbol}</td>
                  <td className="px-4 py-3"><span className="chip text-[10px] font-bold text-accent-green">{pos.side}</span></td>
                  <td className="px-4 py-3 font-mono text-white">{pos.amt}</td>
                  <td className="px-4 py-3 font-mono text-muted">{pos.entry ? n2(pos.entry) : "—"}</td>
                  <td className={`px-4 py-3 font-mono ${(pos.pnl ?? 0) >= 0 ? "text-up" : "text-down"}`}>{pos.pnl === null || pos.pnl === undefined ? "—" : n2(pos.pnl)}</td>
                </tr>
              ))}
              {(!sum?.positions || sum.positions.length === 0) && (
                <tr><td colSpan={5} className="px-4 py-10 text-center text-muted">ยังไม่มีโพซิชันเปิดในบัญชีนี้</td></tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-muted">
                {["สัญลักษณ์", "ฝั่ง", "ล็อต", "ราคาเข้า", "ปัจจุบัน", "SL", "TP", "กำไร/ขาดทุน", "เปิดเมื่อ", "Magic"].map((h) => (
                  <th key={h} className="px-4 py-3 font-semibold">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {goldPositions.map((pos, i) => (
                <motion.tr key={pos.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-semibold text-white">{pos.symbol}</td>
                  <td className="px-4 py-3"><span className={`chip text-[10px] font-bold ${pos.side === "BUY" ? "text-accent-green" : "text-accent-red"}`}>{pos.side}</span></td>
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
              {goldPositions.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-10 text-center text-muted">ยังไม่มีไม้เปิดในบัญชีนี้</td></tr>
              )}
            </tbody>
          </table>
        )}
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
