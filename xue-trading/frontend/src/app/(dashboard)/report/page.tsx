"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ClipboardList, Lightbulb, CheckCircle2, XCircle, TrendingUp, BookMarked, RefreshCw, AlertTriangle, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { BrainModeBanner } from "@/components/brain/BrainModeBanner";
import { api } from "@/lib/api";

type Report = {
  day?: string; message?: string;
  learned?: string; confirmed_txt?: string; rejected_txt?: string;
  agents_txt?: string; standards_txt?: string; net_pnl?: number; trades?: number;
};
type Std = { id: number; rule: string; evidence_wr: number; evidence_n: number; status: string; created_at: string; confidence?: number };

const confColor = (c: number) => (c >= 70 ? "#22c55e" : c >= 40 ? "#f0b429" : "#8b90a0");

const Q = [
  { key: "learned", n: 1, label: "เราเรียนรู้อะไรใหม่?", icon: Lightbulb, c: "#38bdf8" },
  { key: "confirmed_txt", n: 2, label: "สมมติฐานไหนถูกยืนยัน?", icon: CheckCircle2, c: "#22c55e" },
  { key: "rejected_txt", n: 3, label: "สมมติฐานไหนถูกหักล้าง?", icon: XCircle, c: "#ef4444" },
  { key: "agents_txt", n: 4, label: "พนักงาน AI คนไหนพัฒนาขึ้น?", icon: TrendingUp, c: "#a855f7" },
  { key: "standards_txt", n: 5, label: "ความรู้ไหนควรเป็นมาตรฐาน?", icon: BookMarked, c: "#f0b429" },
] as const;

export default function ReportPage() {
  const [latest, setLatest] = useState<Report | null>(null);
  const [history, setHistory] = useState<Report[]>([]);
  const [playbook, setPlaybook] = useState<Std[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await api.report();
      setLatest(r.latest || null);
      setHistory(r.history || []);
      setPlaybook(r.playbook || []);
      setErr("");
    } catch (e: any) {
      setErr(e?.message || "โหลดข้อมูลไม่ได้");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const has = latest && latest.day;

  return (
    <div>
      <PageHeader
        title="รายงานสมองประจำวัน"
        subtitle="ทุกคืนบริษัทตอบ 5 คำถาม — ไม่ใช่แค่ 'วันนี้กำไรไหม' แต่ 'เราเก่งขึ้นตรงไหน' แล้วเก็บถาวรเพื่อดูพัฒนาการสะสม"
        action={
          <button onClick={load} className="chip border-white/10 bg-white/[0.03] text-muted hover:text-white">
            <RefreshCw className="h-3.5 w-3.5" /> รีเฟรช
          </button>
        }
      />

      <BrainModeBanner />

      {err && (
        <div className="glass mb-5 flex items-center gap-2 p-4 text-sm" style={{ borderColor: "#ef444433" }}>
          <AlertTriangle className="h-4 w-4 text-accent-red" />
          <span className="text-muted">{err}</span>
        </div>
      )}
      {loading && !latest && <div className="glass p-6 text-center text-muted">กำลังโหลด…</div>}

      {!loading && !has && !err && (
        <div className="glass p-8 text-center">
          <ClipboardList className="mx-auto mb-3 h-10 w-10 text-muted" />
          <p className="text-sm text-white">ยังไม่มีรายงาน — จะสร้างอัตโนมัติทุกคืนตอนประชุม 4 ทุ่ม</p>
        </div>
      )}

      {has && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <span className="chip border-white/10 bg-white/[0.03] text-white"><CalendarDays className="h-3.5 w-3.5" /> {latest!.day}</span>
            <span className="text-sm text-muted">ปิด {latest!.trades ?? 0} ไม้ · สุทธิ{" "}
              <b style={{ color: (latest!.net_pnl ?? 0) >= 0 ? "#22c55e" : "#ef4444" }}>
                {(latest!.net_pnl ?? 0) >= 0 ? "+" : ""}{(latest!.net_pnl ?? 0).toFixed(2)} USD
              </b>
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            {Q.map((q, i) => {
              const Icon = q.icon;
              return (
                <motion.div
                  key={q.key}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="glass p-4"
                  style={{ borderColor: `${q.c}22` }}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-black" style={{ background: `${q.c}22`, color: q.c }}>{q.n}</span>
                    <Icon className="h-4 w-4" style={{ color: q.c }} />
                    <span className="text-sm font-bold text-white">{q.label}</span>
                  </div>
                  <p className="whitespace-pre-line text-[13px] leading-relaxed text-white/85">
                    {(latest as any)[q.key] || "—"}
                  </p>
                </motion.div>
              );
            })}
          </div>

          {/* Company Playbook */}
          <div className="glass mt-5 p-4">
            <h3 className="panel-title mb-1 flex items-center gap-2"><BookMarked className="h-4 w-4 text-brand" /> Playbook — มาตรฐานบริษัท</h3>
            <p className="mb-3 text-[11px] text-muted">
              ความรู้ที่ยืนยันด้วยข้อมูลจนแน่นพอ (≥15 ไม้/บริบท) จะ "เลื่อนขั้น" มาที่นี่ — สถานะ "รออนุมัติ" จนคุณกดรับเป็นมาตรฐาน (ระบบไม่ตั้งกฎเทรดเอง)
            </p>
            {playbook.length === 0 ? (
              <div className="py-3 text-center text-sm text-muted">ยังไม่มีมาตรฐาน — สะสมความรู้ที่พิสูจน์แล้วก่อน</div>
            ) : (
              <div className="space-y-2">
                {playbook.map((s) => (
                  <div key={s.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                    <span
                      className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold"
                      style={{ color: s.status === "active" ? "#22c55e" : "#f0b429", background: s.status === "active" ? "#22c55e18" : "#f0b42918" }}
                    >
                      {s.status === "active" ? "มาตรฐานแล้ว" : "รออนุมัติ"}
                    </span>
                    <span className="min-w-[160px] flex-1 text-[13px] text-white/90">{s.rule}</span>
                    <span className="shrink-0 font-mono text-[11px] text-muted">{s.evidence_wr}% · {s.evidence_n} ไม้</span>
                    {s.confidence != null && (
                      <span
                        className="shrink-0 rounded-md px-2 py-0.5 font-mono text-[10px] font-bold"
                        style={{ color: confColor(s.confidence), background: `${confColor(s.confidence)}18` }}
                        title="ความมั่นใจว่าเป็นของจริง ไม่ใช่ฟลุค"
                      >
                        มั่นใจ {s.confidence}%
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* history */}
          {history.length > 1 && (
            <div className="glass mt-5 p-4">
              <h3 className="panel-title mb-3">พัฒนาการย้อนหลัง</h3>
              <div className="space-y-1.5">
                {history.map((h) => (
                  <div key={h.day} className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-1.5">
                    <span className="text-xs text-white">{h.day}</span>
                    <span className="text-xs text-muted">ปิด {h.trades ?? 0} ไม้</span>
                    <span className="font-mono text-xs" style={{ color: (h.net_pnl ?? 0) >= 0 ? "#22c55e" : "#ef4444" }}>
                      {(h.net_pnl ?? 0) >= 0 ? "+" : ""}{(h.net_pnl ?? 0).toFixed(2)}
                    </span>
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
