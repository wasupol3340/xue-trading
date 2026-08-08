"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { GraduationCap, TrendingUp, TrendingDown, RefreshCw, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AccountSummaryMT5 } from "@/components/account/AccountSummaryMT5";
import { api } from "@/lib/api";
import { useAccountStore } from "@/store/useAccountStore";

type Trade = {
  ticket: number; market: string; side: string; technique: string; technique_name: string;
  entry: number; exit: number; sl: number; tp: number; lots: number;
  pnl: number; outcome: string; trend: string; session: string; vol: string;
  cmt_total: number | null; cmt_rec: string; ordered_by: string; why: string; closed_at: string;
};
type Stats = {
  trades: number; wins: number; win_rate: number; net_pnl: number;
  by_technique: Record<string, { n: number; wins: number; pnl: number }>;
  by_context: Record<string, { n: number; wins: number; pnl: number }>;
};

const money = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(2)}`;
const win = (o: string) => o === "win";

export default function ExperiencePage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const currentId = useAccountStore((s) => s.currentId);
  const loadAccounts = useAccountStore((s) => s.load);

  const load = async () => {
    try {
      const r = await api.experience(80, currentId || undefined);
      setTrades(r.trades || []);
      setStats(r.stats || null);
      setErr("");
    } catch (e: any) {
      setErr(e?.message || "โหลดข้อมูลไม่ได้");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => { setLoading(true); load(); /* eslint-disable-next-line */ }, [currentId]);

  return (
    <div>
      <PageHeader
        title="ศูนย์ประสบการณ์"
        subtitle="สมุดพกของบริษัท — จดทุกไม้ที่ปิดจริง: เข้าจุดไหน กำไรจริงเท่าไหร่ AI ตัวไหนสั่ง และทำไมถึงแพ้/ชนะ (สะสมถาวร)"
        action={
          <button onClick={load} className="chip border-white/10 bg-white/[0.03] text-muted hover:text-white">
            <RefreshCw className="h-3.5 w-3.5" /> รีเฟรช
          </button>
        }
      />

      {err && (
        <div className="glass mb-5 flex items-center gap-2 p-4 text-sm" style={{ borderColor: "#ef444433" }}>
          <AlertTriangle className="h-4 w-4 text-accent-red" />
          <span className="text-muted">{err}</span>
        </div>
      )}

      {/* สรุปบัญชีตรงกับ MT5 */}
      <AccountSummaryMT5 />

      {/* stats */}
      {stats && (
        <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="ไม้ที่จดแล้ว" value={String(stats.trades)} tone="text-accent-cyan" />
          <Stat label="อัตราชนะ" value={`${stats.win_rate}%`} tone="text-accent-violet" />
          <Stat label="ชนะ/แพ้" value={`${stats.wins}/${stats.trades - stats.wins}`} tone="text-white" />
          <Stat label="กำไรสุทธิ (จริง)" value={money(stats.net_pnl)} tone={stats.net_pnl >= 0 ? "text-accent-green" : "text-accent-red"} />
        </div>
      )}

      {loading && !trades.length && <div className="glass p-6 text-center text-muted">กำลังโหลดสมุดพก…</div>}

      {!loading && trades.length === 0 && !err && (
        <div className="glass p-8 text-center">
          <GraduationCap className="mx-auto mb-3 h-10 w-10 text-muted" />
          <p className="text-sm text-white">ยังไม่มีไม้ที่ปิด — สมุดพกจะเริ่มจดเมื่อบอทปิดออเดอร์แรก</p>
        </div>
      )}

      {/* ledger */}
      <div className="space-y-3">
        {trades.map((t, i) => (
          <motion.div
            key={t.ticket + "-" + i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.5) }}
            className="glass p-4"
            style={{ borderColor: win(t.outcome) ? "#22c55e33" : t.outcome === "loss" ? "#ef444433" : "#ffffff12" }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                style={{ background: win(t.outcome) ? "#22c55e22" : "#ef444422", color: win(t.outcome) ? "#22c55e" : "#ef4444" }}
              >
                {win(t.outcome) ? <TrendingUp className="h-4 w-4" /> : <TrendingDown className="h-4 w-4" />}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{t.technique_name || t.technique}</span>
                  <span className="text-[10px] font-semibold" style={{ color: t.side === "BUY" ? "#22c55e" : "#ef4444" }}>
                    {t.side}
                  </span>
                  <span className="rounded bg-white/[0.05] px-1.5 py-0.5 text-[10px] text-muted">{t.trend}/{t.session} · vol {t.vol}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-muted">{t.ordered_by}</p>
              </div>
              <div className="ml-auto text-right">
                <div className="font-mono text-lg font-bold" style={{ color: win(t.outcome) ? "#22c55e" : "#ef4444" }}>
                  {money(t.pnl)}
                </div>
                <div className="text-[10px] text-muted">เข้า {t.entry} → ออก {t.exit} · {t.lots} lot</div>
              </div>
            </div>
            <p className="mt-2 rounded-lg border border-white/[0.05] bg-black/20 p-2 text-[11px] text-white/80">
              <span className="font-semibold text-white/60">บทเรียน: </span>{t.why}
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="glass p-4">
      <p className="panel-title">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}
