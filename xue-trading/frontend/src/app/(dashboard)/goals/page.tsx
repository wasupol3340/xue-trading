"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Target, RefreshCw, AlertTriangle, ShieldCheck, TrendingUp, Eye, Gauge, CalendarDays,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api";

type Metrics = { trades: number; pf: number; net_pnl: number; win_rate: number; month_return: number; dd: number; balance: number };
type Goal = {
  title: string; target: string; month_return: number; dd: number; dd_ceiling: number;
  band_min: number; band_max: number; status: string;
};
type Status = {
  mode: "observing" | "active";
  activation_trades: number; trades_observed: number; remaining: number; progress_pct: number;
  metrics: Metrics; goal: Goal; headline: string; note: string; constitution: string;
};
type LogRow = { id: number; day: string; mode: string; month_return: number; dd: number; pf: number; note: string };

const GST: Record<string, { label: string; c: string }> = {
  on_track: { label: "ตามเป้า", c: "#22c55e" },
  behind: { label: "ต่ำกว่าเป้า", c: "#f0b429" },
  negative: { label: "เดือนนี้ติดลบ", c: "#ef4444" },
  breach: { label: "เกินเพดานเสี่ยง", c: "#ef4444" },
  observing: { label: "กำลังสังเกต", c: "#38bdf8" },
};

export default function GoalsPage() {
  const [s, setS] = useState<Status | null>(null);
  const [log, setLog] = useState<LogRow[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { const r = await api.goals(); setS(r.status); setLog(r.log || []); setErr(""); }
    catch (e: any) { setErr(e?.message || "โหลดข้อมูลไม่ได้"); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(); const iv = setInterval(load, 15000); return () => clearInterval(iv); }, []);

  const observing = s?.mode === "observing";
  const gs = s ? GST[s.goal.status] || GST.observing : GST.observing;

  // month return position inside the target band (for a simple gauge)
  const bandPos = s ? Math.max(0, Math.min(100, (s.goal.month_return / (s.goal.band_max || 20)) * 100)) : 0;
  const ddPos = s ? Math.max(0, Math.min(100, (s.goal.dd / (s.goal.dd_ceiling || 20)) * 100)) : 0;

  return (
    <div>
      <PageHeader
        title="เป้าหมายบริษัท"
        subtitle="เป้าเดียวที่ทั้งบริษัทเล็งไปด้วยกัน — โตอย่างมีวินัยภายในเพดานความเสี่ยง (เพดานเสี่ยงมาก่อนเป้าเสมอ)"
        action={
          <button onClick={load} className="chip border-white/10 bg-white/[0.03] text-muted hover:text-white">
            <RefreshCw className="h-3.5 w-3.5" /> รีเฟรช
          </button>
        }
      />

      {err && (
        <div className="glass mb-5 flex items-center gap-2 p-4 text-sm" style={{ borderColor: "#ef444433" }}>
          <AlertTriangle className="h-4 w-4 text-accent-red" /><span className="text-muted">{err}</span>
        </div>
      )}
      {loading && !s && <div className="glass p-6 text-center text-muted">กำลังโหลด…</div>}

      {s && (
        <>
          {/* observing banner */}
          {observing && (
            <div className="glass mb-5 flex flex-wrap items-center gap-3 p-3.5" style={{ borderColor: "#38bdf833" }}>
              <Eye className="h-4 w-4 shrink-0 text-[#38bdf8]" />
              <span className="text-[13px] text-white/85">
                <b className="text-[#38bdf8]">โหมดสังเกตเงียบ</b> — Goal Engine ยังไม่ผลักดันบริษัท (เก็บข้อมูล{" "}
                <span className="font-mono">{s.trades_observed}/{s.activation_trades}</span> ไม้) · อีก {s.remaining} ไม้จะเริ่มปฏิบัติการ
              </span>
            </div>
          )}

          {/* the goal card */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="glass p-5" style={{ borderColor: `${gs.c}33` }}>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: `${gs.c}1a`, border: `1px solid ${gs.c}44` }}>
                <Target className="h-6 w-6" style={{ color: gs.c }} />
              </div>
              <div className="min-w-[200px] flex-1">
                <p className="text-base font-bold text-white">{s.goal.title}</p>
                <p className="text-[12px] text-muted">{s.goal.target}</p>
              </div>
              <span className="rounded-lg px-2.5 py-1 text-[12px] font-bold" style={{ background: `${gs.c}18`, color: gs.c }}>{gs.label}</span>
            </div>

            {/* month return gauge within band */}
            <div className="mb-4">
              <div className="mb-1 flex items-center justify-between text-[12px]">
                <span className="text-muted">กำไรเดือนนี้ (เทียบเป้า {s.goal.band_min}–{s.goal.band_max}%)</span>
                <span className="font-mono font-bold" style={{ color: s.goal.month_return >= 0 ? "#22c55e" : "#ef4444" }}>
                  {s.goal.month_return >= 0 ? "+" : ""}{s.goal.month_return}%
                </span>
              </div>
              <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div className="absolute inset-y-0 rounded-full" style={{ left: 0, width: `${bandPos}%`, background: s.goal.month_return >= 0 ? "#22c55e" : "#ef4444" }} />
                {/* band floor marker */}
                <div className="absolute inset-y-0 w-0.5 bg-white/40" style={{ left: `${(s.goal.band_min / (s.goal.band_max || 20)) * 100}%` }} />
              </div>
              <p className="mt-1 text-[10px] text-muted">เส้นขาว = ขั้นต่ำของเป้า ({s.goal.band_min}%/เดือน)</p>
            </div>

            {/* DD usage */}
            <div>
              <div className="mb-1 flex items-center justify-between text-[12px]">
                <span className="flex items-center gap-1 text-muted"><Gauge className="h-3.5 w-3.5" /> ความเสี่ยงที่ใช้ (DD ปัจจุบัน / เพดาน {s.goal.dd_ceiling}%)</span>
                <span className="font-mono font-bold" style={{ color: ddPos > 80 ? "#ef4444" : ddPos > 50 ? "#f0b429" : "#22c55e" }}>{s.goal.dd}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full" style={{ width: `${Math.max(2, ddPos)}%`, background: ddPos > 80 ? "#ef4444" : ddPos > 50 ? "#f0b429" : "#22c55e" }} />
              </div>
            </div>

            <p className="mt-4 text-[13px] leading-relaxed text-white/70">{s.note}</p>
            <div className="mt-3 flex items-start gap-2 rounded-lg border border-brand/20 bg-brand/[0.06] px-3 py-2">
              <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
              <span className="text-[12px] text-white/80">{s.constitution}</span>
            </div>
          </motion.div>

          {/* live metrics */}
          <div className="mt-5 grid grid-cols-2 gap-3 md:grid-cols-4">
            {[
              { label: "Profit Factor", value: s.metrics.pf, hint: ">1 = กำไร" },
              { label: "กำไรสะสม (USD)", value: `${s.metrics.net_pnl >= 0 ? "+" : ""}${s.metrics.net_pnl}` },
              { label: "อัตราชนะ", value: `${s.metrics.win_rate}%` },
              { label: "ไม้ที่สังเกต", value: `${s.metrics.trades}/${s.activation_trades}` },
            ].map((t, i) => (
              <motion.div key={t.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass p-4">
                <p className="text-[11px] text-muted">{t.label}</p>
                <p className="mt-1 font-mono text-xl font-black text-white">{t.value}</p>
                {t.hint && <p className="text-[10px] text-muted">{t.hint}</p>}
              </motion.div>
            ))}
          </div>

          {/* history */}
          {log.length > 1 && (
            <div className="glass mt-5 p-4">
              <h3 className="panel-title mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-brand" /> บันทึกความคืบหน้า</h3>
              <div className="space-y-1.5">
                {log.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-1.5 text-[12px]">
                    <span className="inline-flex items-center gap-1 font-mono text-white/70"><CalendarDays className="h-3 w-3" /> {r.day}</span>
                    <span className="text-muted">{r.note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
