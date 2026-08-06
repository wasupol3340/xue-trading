"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Crown, RefreshCw, AlertTriangle, Target, TrendingUp, TrendingDown, Minus,
  Gavel, BookText, Award, CalendarDays,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api";

type Row = {
  id: number; day: string; net_pnl: number; win_rate: string;
  trend: "up" | "flat" | "down"; flagged: number; stance: string; outlook: "up" | "flat" | "down";
};
type Status = {
  market: string;
  latest: Row | null;
  scorecard: { decisions: number; graded: number; correct: number; accuracy: number | null; status: string };
  journal: Row[];
};

const TREND: Record<string, { label: string; c: string; icon: any }> = {
  up: { label: "ดีขึ้น", c: "#22c55e", icon: TrendingUp },
  flat: { label: "ทรงตัว", c: "#8b90a0", icon: Minus },
  down: { label: "แผ่วลง", c: "#ef4444", icon: TrendingDown },
};
const OUTLOOK: Record<string, string> = { up: "คาดว่าดีขึ้นต่อ", flat: "คาดว่าทรงตัว", down: "เสี่ยงแผ่วต่อ" };

export default function CeoBrainPage() {
  const [s, setS] = useState<Status | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setS(await api.ceoBrain());
      setErr("");
    } catch (e: any) {
      setErr(e?.message || "โหลดข้อมูลไม่ได้");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
    const iv = setInterval(load, 15000);
    return () => clearInterval(iv);
  }, []);

  const acc = s?.scorecard?.accuracy ?? null;
  const accColor = acc == null ? "#8b90a0" : acc >= 60 ? "#22c55e" : acc >= 45 ? "#f0b429" : "#ef4444";

  return (
    <div>
      <PageHeader
        title="สมอง CEO"
        subtitle="สมองระดับผู้บริหาร — จำการตัดสินใจของตัวเอง, อ่านทิศทางบริษัท และให้คะแนนตัวเองว่าอ่านสถานการณ์แม่นแค่ไหน (โตขึ้นทุกวัน)"
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
      {loading && !s && <div className="glass p-6 text-center text-muted">กำลังโหลด…</div>}

      {s && (
        <>
          {/* latest executive stance + scorecard */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* stance (2 cols) */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="glass p-5 lg:col-span-2" style={{ borderColor: "#f0b42933" }}
            >
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl" style={{ background: "#f0b4291a", border: "1px solid #f0b42944" }}>
                  <Crown className="h-6 w-6" style={{ color: "#f0b429" }} />
                </div>
                <div>
                  <p className="text-sm font-bold text-white">ท่าทีผู้บริหารล่าสุด</p>
                  <p className="text-[11px] text-muted">{s.latest?.day || "ยังไม่มีบันทึก"}</p>
                </div>
              </div>
              {s.latest ? (
                <>
                  <div className="flex items-start gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                    <Gavel className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
                    <p className="text-[14px] leading-relaxed text-white/90">{s.latest.stance}</p>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-[12px]">
                    {(() => {
                      const t = TREND[s.latest.trend] || TREND.flat;
                      const Icon = t.icon;
                      return (
                        <span className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1" style={{ background: `${t.c}18`, color: t.c }}>
                          <Icon className="h-3.5 w-3.5" /> ทิศทางบริษัท: {t.label}
                        </span>
                      );
                    })()}
                    <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1 text-muted">
                      <Target className="h-3.5 w-3.5" /> คาดการณ์: {OUTLOOK[s.latest.outlook] || "—"}
                    </span>
                    <span className="text-muted">
                      สุทธิสะสม{" "}
                      <b style={{ color: s.latest.net_pnl >= 0 ? "#22c55e" : "#ef4444" }}>
                        {s.latest.net_pnl >= 0 ? "+" : ""}{s.latest.net_pnl.toFixed(2)}
                      </b>{" "}· ชนะ {s.latest.win_rate}%
                    </span>
                  </div>
                </>
              ) : (
                <p className="py-4 text-center text-sm text-muted">
                  CEO ยังไม่ได้เขียนบันทึกผู้บริหาร — จะเขียนเองทุกคืนตอนสรุป (หรือกดสั่งได้ที่ /agents/ceo-brain/reflect)
                </p>
              )}
            </motion.div>

            {/* scorecard */}
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              className="glass flex flex-col p-5" style={{ borderColor: `${accColor}33` }}
            >
              <div className="mb-2 flex items-center gap-2">
                <Award className="h-4 w-4" style={{ color: accColor }} />
                <p className="text-sm font-bold text-white">คะแนนการอ่านสถานการณ์</p>
              </div>
              <div className="flex flex-1 flex-col items-center justify-center py-2">
                <p className="font-mono text-4xl font-black" style={{ color: accColor }}>
                  {acc == null ? "—" : `${acc}%`}
                </p>
                <p className="mt-1 text-center text-[11px] leading-relaxed text-muted">{s.scorecard.status}</p>
              </div>
              <p className="mt-2 text-center text-[11px] text-muted">
                ตัดสินใจแล้ว {s.scorecard.decisions} วัน · ให้คะแนนได้ {s.scorecard.graded} ครั้ง
              </p>
            </motion.div>
          </div>

          {/* executive journal */}
          <div className="glass mt-5 p-4">
            <h3 className="panel-title mb-1 flex items-center gap-2">
              <BookText className="h-4 w-4 text-brand" /> สมุดบันทึกผู้บริหาร (ของ CEO เอง)
            </h3>
            <p className="mb-3 text-[11px] text-muted">
              ทุกคืน CEO เขียนการตัดสินใจ + การอ่านทิศทางลงสมองตัวเอง (เก็บถาวร ไม่ลบ) — ยิ่งนานยิ่งวัดได้ว่ามันเป็นผู้ตัดสินที่ดีขึ้นไหม
            </p>
            {s.journal.length === 0 ? (
              <div className="py-4 text-center text-sm text-muted">ยังไม่มีบันทึก</div>
            ) : (
              <div className="space-y-2">
                {s.journal.map((r) => {
                  const t = TREND[r.trend] || TREND.flat;
                  const TIcon = t.icon;
                  return (
                    <div key={r.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-white/70">
                          <CalendarDays className="h-3 w-3" /> {r.day}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold" style={{ background: `${t.c}18`, color: t.c }}>
                          <TIcon className="h-3 w-3" /> {t.label}
                        </span>
                        <span className="rounded px-1.5 py-0.5 text-[10px] text-muted" style={{ background: "#ffffff08" }}>
                          คาด: {OUTLOOK[r.outlook] || "—"}
                        </span>
                        <span className="ml-auto font-mono text-[11px]" style={{ color: r.net_pnl >= 0 ? "#22c55e" : "#ef4444" }}>
                          {r.net_pnl >= 0 ? "+" : ""}{r.net_pnl.toFixed(2)}
                        </span>
                      </div>
                      <p className="text-[12.5px] leading-relaxed text-white/85">{r.stance}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
