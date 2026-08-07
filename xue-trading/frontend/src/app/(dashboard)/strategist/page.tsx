"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Telescope, RefreshCw, AlertTriangle, TrendingUp, TrendingDown, Compass,
  Layers, PieChart, Clock, ListChecks, Info, Check,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api";

type Ctx = { technique: string; context: string; n: number; net: number; win_rate: number };
type AgendaItem = { priority: "high" | "medium" | "low"; category: string; akey: string; title: string; rationale: string; status: string };
type Analysis = {
  total_trades: number; early: boolean; data_note: string;
  opportunity_map: { profitable: Ctx[]; draining: Ctx[] };
  gaps: { thin_contexts: Ctx[]; thin_count: number };
  untried: { technique: string; key: string }[];
  concentration: { top_technique: string; share_pct: number; warn: boolean };
  time_allocation: { waste_pct: number; losing_trades: number; total: number };
  agenda: AgendaItem[];
};

const PRI: Record<string, { label: string; c: string }> = {
  high: { label: "สำคัญสูง", c: "#ef4444" },
  medium: { label: "ปานกลาง", c: "#f0b429" },
  low: { label: "รอง", c: "#38bdf8" },
};

export default function StrategistPage() {
  const [a, setA] = useState<Analysis | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { setA(await api.strategist()); setErr(""); }
    catch (e: any) { setErr(e?.message || "โหลดข้อมูลไม่ได้"); }
    finally { setLoading(false); }
  };
  const approve = async (akey: string) => { try { await api.strategistApprove(akey); await load(); } catch { /* ignore */ } };
  const unapprove = async (akey: string) => { try { await api.strategistUnapprove(akey); await load(); } catch { /* ignore */ } };

  useEffect(() => { load(); const iv = setInterval(load, 20000); return () => clearInterval(iv); }, []);

  return (
    <div>
      <PageHeader
        title="Chief Strategist"
        subtitle="นักคิดอนาคตของบริษัท — ไม่เทรด แต่หาโอกาส จุดบอด และเสนอว่าควรลงแรงวิจัยกับอะไรต่อ (คิดจากข้อมูลจริง ทุกข้อรออนุมัติ)"
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
      {loading && !a && <div className="glass p-6 text-center text-muted">กำลังวิเคราะห์…</div>}

      {a && (
        <>
          {a.early && (
            <div className="glass mb-5 flex flex-wrap items-center gap-2 p-3.5 text-[13px]" style={{ borderColor: "#38bdf833" }}>
              <Info className="h-4 w-4 shrink-0 text-[#38bdf8]" />
              <span className="text-white/85">{a.data_note}</span>
            </div>
          )}

          {/* research agenda — the main output */}
          <div className="glass p-4">
            <h3 className="panel-title mb-1 flex items-center gap-2"><ListChecks className="h-4 w-4 text-brand" /> วาระวิจัย (เรียงความสำคัญ) — รออนุมัติ</h3>
            <p className="mb-3 text-[11px] text-muted">Chief Strategist เสนอ · Constitution: ระบบไม่สร้างเทคนิค/แผนกใหม่เอง คุณเป็นคนอนุมัติ</p>
            {a.agenda.length === 0 ? (
              <div className="py-3 text-center text-sm text-muted">ยังไม่มีวาระเด่น</div>
            ) : (
              <div className="space-y-2">
                {a.agenda.map((it, i) => {
                  const p = PRI[it.priority] || PRI.low;
                  return (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                      className="rounded-lg border bg-white/[0.02] p-3" style={{ borderColor: `${p.c}33` }}>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: `${p.c}18`, color: p.c }}>{p.label}</span>
                        <span className="rounded px-1.5 py-0.5 text-[10px] text-muted" style={{ background: "#ffffff08" }}>{it.category}</span>
                        <span className="text-[13px] font-bold text-white">{it.title}</span>
                        {it.status === "approved" ? (
                          <button onClick={() => unapprove(it.akey)}
                            className="ml-auto inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold"
                            style={{ background: "#22c55e18", color: "#22c55e" }} title="กดเพื่อยกเลิกการอนุมัติ">
                            <Check className="h-3 w-3" /> อนุมัติแล้ว
                          </button>
                        ) : (
                          <button onClick={() => approve(it.akey)}
                            className="ml-auto rounded-md border border-brand/40 bg-brand/10 px-2.5 py-0.5 text-[10px] font-bold text-brand hover:bg-brand/20">
                            อนุมัติ
                          </button>
                        )}
                      </div>
                      <p className="text-[12px] text-white/70">{it.rationale}</p>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* opportunity map */}
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div className="glass p-4">
              <h3 className="panel-title mb-3 flex items-center gap-2"><TrendingUp className="h-4 w-4 text-accent-green" /> จุดแข็ง — ควรต่อยอด</h3>
              {a.opportunity_map.profitable.length === 0 ? <div className="py-2 text-center text-[12px] text-muted">ยังไม่พบจุดแข็งที่ข้อมูลพอ</div> : (
                <div className="space-y-1.5">
                  {a.opportunity_map.profitable.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[12px]">
                      <span className="flex-1 text-white/85">{c.technique} · <span className="text-muted">{c.context}</span></span>
                      <span className="font-mono text-accent-green">+{c.net}</span>
                      <span className="font-mono text-muted">{c.win_rate}% · {c.n}ไม้</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="glass p-4">
              <h3 className="panel-title mb-3 flex items-center gap-2"><TrendingDown className="h-4 w-4 text-accent-red" /> จุดรั่ว — ควรตัด/ทบทวน</h3>
              {a.opportunity_map.draining.length === 0 ? <div className="py-2 text-center text-[12px] text-muted">ยังไม่พบจุดรั่วที่ข้อมูลพอ</div> : (
                <div className="space-y-1.5">
                  {a.opportunity_map.draining.map((c, i) => (
                    <div key={i} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[12px]">
                      <span className="flex-1 text-white/85">{c.technique} · <span className="text-muted">{c.context}</span></span>
                      <span className="font-mono text-accent-red">{c.net}</span>
                      <span className="font-mono text-muted">{c.win_rate}% · {c.n}ไม้</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* summary tiles */}
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="glass p-4">
              <Layers className="h-5 w-5 text-[#2dd4bf]" />
              <p className="mt-2 font-mono text-2xl font-black text-white">{a.gaps.thin_count}</p>
              <p className="text-[11px] text-muted">จุดบอด (สภาพตลาดข้อมูลยังบาง)</p>
            </div>
            <div className="glass p-4">
              <PieChart className="h-5 w-5" style={{ color: a.concentration.warn ? "#ef4444" : "#a855f7" }} />
              <p className="mt-2 font-mono text-2xl font-black text-white">{a.concentration.share_pct}%</p>
              <p className="text-[11px] text-muted">พึ่งเทคนิคเดียว: {a.concentration.top_technique}{a.concentration.warn ? " ⚠️" : ""}</p>
            </div>
            <div className="glass p-4">
              <Clock className="h-5 w-5" style={{ color: a.time_allocation.waste_pct >= 40 ? "#f0b429" : "#8b90a0" }} />
              <p className="mt-2 font-mono text-2xl font-black text-white">{a.time_allocation.waste_pct}%</p>
              <p className="text-[11px] text-muted">ไม้ที่ไปกับเทคนิคขาดทุน</p>
            </div>
          </div>

          {/* untried */}
          {a.untried.length > 0 && (
            <div className="glass mt-5 p-4">
              <h3 className="panel-title mb-2 flex items-center gap-2"><Compass className="h-4 w-4 text-brand" /> เทคนิคที่ยังไม่เคยลอง ({a.untried.length})</h3>
              <div className="flex flex-wrap gap-2">
                {a.untried.map((u) => (
                  <span key={u.key} className="rounded-lg border border-white/[0.08] bg-white/[0.02] px-2.5 py-1 text-[12px] text-white/80">{u.technique}</span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
