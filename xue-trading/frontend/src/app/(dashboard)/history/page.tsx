"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { api, isBackendConfigured } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountSummaryMT5 } from "@/components/account/AccountSummaryMT5";
import { fmtNumber } from "@/lib/utils";
import { useAccountStore } from "@/store/useAccountStore";

// บัญชีเซนต์: โชว์ตัวเลขดิบเท่า MT5 (ไม่ใส่ $ ไม่แปลงหน่วย)
const cents = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;

type Trade = {
  id: string;
  symbol: string;
  side: string;
  lots: number;
  entry: number;
  exit: number;
  pnl: number;
  technique: string;
  result: string;
  closed_at: number;
};
type Stats = { total: number; win_rate: number; net_pnl: number; best_technique: string };

export default function HistoryPage() {
  // ประวัติจริงจาก MT5 (ราคาเข้า/ออก/กำไร จริง) — ดึงตอนเปิดหน้า + รีเฟรชทุก 15 วิ
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, win_rate: 0, net_pnl: 0, best_technique: "—" });
  const [loaded, setLoaded] = useState(false);
  const currentId = useAccountStore((s) => s.currentId);
  const loadAccounts = useAccountStore((s) => s.load);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);

  useEffect(() => {
    if (!isBackendConfigured()) {
      setLoaded(true);
      return;
    }
    let alive = true;
    const load = async () => {
      try {
        const res = await api.history(currentId || undefined);
        if (!alive) return;
        setTrades(res.trades || []);
        setStats(res.stats || { total: 0, win_rate: 0, net_pnl: 0, best_technique: "—" });
      } catch {
        /* keep last */
      } finally {
        if (alive) setLoaded(true);
      }
    };
    load();
    const iv = setInterval(load, 15000);
    return () => {
      alive = false;
      clearInterval(iv);
    };
  }, [currentId]);

  return (
    <div>
      <PageHeader title="ประวัติการเทรด" subtitle="ทุกไม้ที่ทีม AI ปิดจริงจาก MT5 พร้อมราคาเข้า/ออกและกลยุทธ์ที่ใช้" />

      {/* สรุปบัญชีตรงกับ MT5 */}
      <AccountSummaryMT5 />

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="ไม้ทั้งหมด" value={`${stats.total}`} />
        <Stat label="อัตราชนะ" value={`${stats.win_rate}%`} tone="text-accent-cyan" />
        <Stat label="กำไร/ขาดทุนสุทธิ" value={cents(stats.net_pnl)} tone={stats.net_pnl >= 0 ? "text-up" : "text-down"} />
        <Stat label="กลยุทธ์ดีที่สุด" value={stats.best_technique} tone="text-brand" />
      </div>

      <div className="glass overflow-x-auto p-0">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-muted">
              {["สัญลักษณ์", "ฝั่ง", "ล็อต", "ราคาเข้า", "ราคาออก", "กำไร/ขาดทุน", "กลยุทธ์", "ผล", "ปิดเมื่อ"].map((h) => (
                <th key={h} className="px-4 py-3 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trades.map((t, i) => (
              <motion.tr key={t.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.03 }} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                <td className="px-4 py-3 font-semibold text-white">{t.symbol}</td>
                <td className="px-4 py-3">
                  <span className={`chip text-[10px] font-bold ${t.side === "BUY" ? "text-accent-green" : "text-accent-red"}`}>{t.side}</span>
                </td>
                <td className="px-4 py-3 font-mono text-white">{t.lots.toFixed(2)}</td>
                <td className="px-4 py-3 font-mono text-muted">{fmtNumber(t.entry)}</td>
                <td className="px-4 py-3 font-mono text-muted">{fmtNumber(t.exit)}</td>
                <td className={`px-4 py-3 font-mono font-bold ${t.pnl >= 0 ? "text-up" : "text-down"}`}>{cents(t.pnl)}</td>
                <td className="px-4 py-3 text-muted">{t.technique}</td>
                <td className="px-4 py-3">
                  <span className={`chip text-[10px] font-bold uppercase ${t.result === "win" ? "border-accent-green/30 bg-accent-green/10 text-accent-green" : "border-accent-red/30 bg-accent-red/10 text-accent-red"}`}>{t.result === "win" ? "ชนะ" : "แพ้"}</span>
                </td>
                <td className="px-4 py-3 text-muted">{t.closed_at ? new Date(t.closed_at * 1000).toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "UTC" }) : "—"}</td>
              </motion.tr>
            ))}
            {loaded && trades.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted">
                  ยังไม่มีไม้ที่ปิดในช่วง 30 วันที่ผ่านมา
                </td>
              </tr>
            )}
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
