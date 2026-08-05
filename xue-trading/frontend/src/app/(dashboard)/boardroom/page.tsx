"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Landmark, Play, RefreshCw, Loader2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api";

type Turn = { id: string; text: string };
type Meeting = {
  held?: boolean;
  message?: string;
  symbol?: string;
  realized?: number;
  messages?: number;
  spent_usd?: number;
  transcript?: Turn[];
  summary?: string;
};

const NAME: Record<string, string> = {
  ceo: "CEO", research: "Research", risk: "Risk", cio: "CIO", macro: "Macro",
  execution: "Execution", learning: "Learning", monitor: "Monitor", advisor: "ที่ปรึกษา AI",
};
const COLOR: Record<string, string> = {
  ceo: "#f0b429", research: "#3b82f6", risk: "#8b5cf6", cio: "#22c55e", macro: "#38bdf8",
  execution: "#f97316", learning: "#a855f7", monitor: "#14b8a6", advisor: "#f43f5e",
};

export default function BoardroomPage() {
  const [mtg, setMtg] = useState<Meeting | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    try {
      const m = (await api.boardroom()) as Meeting;
      setMtg(m);
      setErr("");
    } catch (e: any) {
      setErr(e?.message || "โหลดข้อมูลไม่ได้");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const runNow = async () => {
    setRunning(true);
    setErr("");
    try {
      const m = (await api.boardroomRun()) as Meeting;
      setMtg(m);
    } catch (e: any) {
      setErr(e?.message || "จัดประชุมไม่สำเร็จ");
    } finally {
      setRunning(false);
    }
  };

  const held = mtg?.held && (mtg?.transcript?.length || 0) > 0;

  return (
    <div>
      <PageHeader
        title="ประชุมใหญ่ 4 ทุ่ม"
        subtitle="ทีม AI ประชุมกันจริงทุกวันทำการ 22:00 น. — CEO สรุปผล ทุกฝ่ายออกความเห็น ที่ปรึกษา AI ร่วมสอนงาน (เป็นคำแนะนำ ไม่เปลี่ยนการเทรดอัตโนมัติ)"
        action={
          <div className="flex gap-2">
            <button
              onClick={load}
              className="chip border-white/10 bg-white/[0.03] text-muted hover:text-white"
              title="รีเฟรช"
            >
              <RefreshCw className="h-3.5 w-3.5" /> รีเฟรช
            </button>
            <button
              onClick={runNow}
              disabled={running}
              className="chip border-brand/30 bg-brand/10 text-brand hover:bg-brand/20 disabled:opacity-50"
            >
              {running ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
              {running ? "กำลังประชุม…" : "จัดประชุมทดสอบตอนนี้"}
            </button>
          </div>
        }
      />

      {err && (
        <div className="glass mb-5 flex items-center gap-2 p-4 text-sm" style={{ borderColor: "#ef444433" }}>
          <AlertTriangle className="h-4 w-4 text-accent-red" />
          <span className="text-muted">{err}</span>
        </div>
      )}
      {loading && !mtg && <div className="glass p-6 text-center text-muted">กำลังโหลด…</div>}

      {mtg && !held && (
        <div className="glass p-8 text-center">
          <Landmark className="mx-auto mb-3 h-10 w-10 text-muted" />
          <p className="text-sm text-white">{mtg.message || "ยังไม่มีการประชุม"}</p>
          <p className="mt-1 text-xs text-muted">
            ประชุมอัตโนมัติทุกวันทำการ 22:00 น. หรือกด “จัดประชุมทดสอบตอนนี้” ด้านบนเพื่อลองเลย
          </p>
        </div>
      )}

      {held && (
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* transcript */}
          <div className="glass p-5">
            <div className="mb-4 flex items-center gap-2">
              <Landmark className="h-4 w-4 text-brand" />
              <h3 className="panel-title">บทประชุม</h3>
              <span className="ml-auto text-[11px] text-muted">{mtg.messages} ข้อความ</span>
            </div>
            <div className="space-y-3">
              {mtg.transcript!.map((t, i) => {
                const c = COLOR[t.id] || "#8b90a0";
                return (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.05, 0.6) }}
                    className="flex gap-3"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[10px] font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${c}, rgba(0,0,0,0.5))` }}
                    >
                      {(NAME[t.id] || t.id).slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                      <span className="text-xs font-bold" style={{ color: c }}>{NAME[t.id] || t.id}</span>
                      <p className="mt-1 whitespace-pre-line text-sm text-white/90">{t.text}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>

          {/* summary side */}
          <div className="flex flex-col gap-4">
            <div className="glass p-4">
              <p className="panel-title mb-2">ผลวันนี้</p>
              <p
                className="font-mono text-3xl font-black"
                style={{ color: (mtg.realized || 0) >= 0 ? "#22c55e" : "#ef4444" }}
              >
                {(mtg.realized || 0) >= 0 ? "+" : ""}{(mtg.realized || 0).toFixed(2)}
                <span className="ml-1 text-sm text-muted">USD</span>
              </p>
              {typeof mtg.spent_usd === "number" && (
                <p className="mt-2 text-[11px] text-muted">ค่าประชุมวันนี้: ${mtg.spent_usd.toFixed(4)}</p>
              )}
            </div>

            <div className="glass border-brand/20 bg-brand/5 p-4">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-bold text-brand">
                <span className="flex h-5 w-5 items-center justify-center rounded bg-brand/20 text-[10px]">CE</span>
                สรุปจาก CEO
              </p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-white/90">{mtg.summary}</p>
            </div>

            <p className="px-1 text-[11px] leading-snug text-muted">
              หมายเหตุ: ทุกความเห็นในที่ประชุมเป็น “คำแนะนำ” เท่านั้น ข้อเสนอที่จะเปลี่ยนการเทรดจริงต้องให้คุณอนุมัติก่อน — ระบบไม่เปลี่ยนการเทรดเองจากบทสนทนานี้
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
