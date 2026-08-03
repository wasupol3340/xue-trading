"use client";

import { motion } from "framer-motion";
import { TRADES } from "@/lib/mock-data";
import { PageHeader } from "@/components/layout/PageHeader";
import { fmtMoney, fmtNumber } from "@/lib/utils";

export default function HistoryPage() {
  const wins = TRADES.filter((t) => t.result === "win").length;
  const total = TRADES.reduce((a, b) => a + b.pnl, 0);

  return (
    <div>
      <PageHeader title="Trading History" subtitle="Every autonomous trade executed by the AI company, with attributed strategy." />
      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total Trades" value={`${TRADES.length}`} />
        <Stat label="Win Rate" value={`${Math.round((wins / TRADES.length) * 100)}%`} tone="text-accent-cyan" />
        <Stat label="Net P/L" value={`${total >= 0 ? "+" : ""}${fmtMoney(total)}`} tone={total >= 0 ? "text-up" : "text-down"} />
        <Stat label="Best Strategy" value="SMC" tone="text-brand" />
      </div>

      <div className="glass overflow-x-auto p-0">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-muted">
              {["Symbol", "Side", "Lots", "Entry", "Exit", "P/L", "Strategy", "Result", "Closed"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {TRADES.map((t, i) => (
              <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-semibold text-white">{t.symbol}</td>
                <td className="px-4 py-3">
                  <span className={`chip text-[10px] font-bold ${t.side === "BUY" ? "text-accent-green" : "text-accent-red"}`}>{t.side}</span>
                </td>
                <td className="px-4 py-3 font-mono text-white">{t.lots.toFixed(2)}</td>
                <td className="px-4 py-3 font-mono text-muted">{fmtNumber(t.entry)}</td>
                <td className="px-4 py-3 font-mono text-muted">{fmtNumber(t.exit)}</td>
                <td className={`px-4 py-3 font-mono font-bold ${t.pnl >= 0 ? "text-up" : "text-down"}`}>{t.pnl >= 0 ? "+" : ""}{fmtMoney(t.pnl)}</td>
                <td className="px-4 py-3 text-muted">{t.strategy}</td>
                <td className="px-4 py-3">
                  <span className={`chip text-[10px] font-bold uppercase ${t.result === "win" ? "border-accent-green/30 bg-accent-green/10 text-accent-green" : "border-accent-red/30 bg-accent-red/10 text-accent-red"}`}>{t.result}</span>
                </td>
                <td className="px-4 py-3 text-muted">{new Date(t.closedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
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
      <p className={`mt-1 font-mono text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}
