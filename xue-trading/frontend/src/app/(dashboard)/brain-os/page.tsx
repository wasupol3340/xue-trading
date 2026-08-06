"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Brain, Eye, RefreshCw, AlertTriangle, Bot, Sparkles, Layers,
  BookX, Target, Lock, Unlock, CheckCircle2, NotebookText,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api";

type Agent = { id: string; name: string; observed: number };
type Status = {
  mode: "observing" | "advising";
  activation_trades: number;
  trades_observed: number;
  remaining: number;
  progress_pct: number;
  wins: number; losses: number; net_pnl: number; win_rate: number;
  watching: {
    agents: Agent[]; agents_active: number;
    hypotheses_forming: number; contexts_seen: number; failures_noted: number;
  };
  unlocks: string[];
  headline: string;
  note: string;
  recent_memory?: { id: number; day: string; mode: string; note: string }[];
};

export default function BrainOsPage() {
  const [s, setS] = useState<Status | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setS(await api.brainOs());
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

  const observing = s?.mode === "observing";
  const c = observing ? "#38bdf8" : "#22c55e";

  const watchTiles = s
    ? [
        { icon: Eye, label: "ไม้ที่สังเกตการณ์", value: s.trades_observed, c: "#38bdf8" },
        { icon: Bot, label: "แผนก AI ที่จับตา", value: `${s.watching.agents_active}/${s.watching.agents.length}`, c: "#a855f7" },
        { icon: Sparkles, label: "สมมติฐานกำลังก่อตัว", value: s.watching.hypotheses_forming, c: "#f0b429" },
        { icon: Layers, label: "บริบทตลาดที่เห็นแล้ว", value: s.watching.contexts_seen, c: "#2dd4bf" },
        { icon: BookX, label: "บทเรียน/ความล้มเหลวที่จด", value: s.watching.failures_noted, c: "#ef4444" },
      ]
    : [];

  return (
    <div>
      <PageHeader
        title="Brain OS"
        subtitle="มันสมองขององค์กร — ตอนนี้เป็น 'ผู้สังเกตการณ์เงียบ' เฝ้าดูและจดทุกอย่าง ยังไม่ออกความเห็นจนกว่าจะเรียนรู้จากไม้จริงมากพอ"
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
          {/* MODE + progress */}
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="glass p-6" style={{ borderColor: `${c}33` }}
          >
            <div className="flex flex-wrap items-center gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl"
                style={{ background: `${c}1a`, border: `1px solid ${c}44` }}
              >
                {observing ? <Eye className="h-8 w-8" style={{ color: c }} /> : <Brain className="h-8 w-8" style={{ color: c }} />}
              </div>
              <div className="min-w-[220px] flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded-md px-2 py-0.5 text-[11px] font-black uppercase tracking-wide"
                        style={{ background: `${c}1f`, color: c }}>
                    {observing ? "โหมดศึกษาเงียบ" : "โหมดที่ปรึกษา"}
                  </span>
                </div>
                <p className="mt-1.5 text-base font-bold text-white">{s.headline}</p>
              </div>
            </div>

            {/* progress bar to wake-up */}
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-[12px]">
                <span className="text-muted">ความคืบหน้าสู่การ “ตื่น”</span>
                <span className="font-mono font-bold text-white">
                  {s.trades_observed} / {s.activation_trades} ไม้
                  {s.remaining > 0 && <span className="ml-2 text-muted">(เหลือ {s.remaining})</span>}
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <motion.div
                  initial={{ width: 0 }} animate={{ width: `${Math.max(2, s.progress_pct)}%` }}
                  transition={{ duration: 0.6 }}
                  className="h-full rounded-full"
                  style={{ background: `linear-gradient(90deg, ${c}, ${c}aa)` }}
                />
              </div>
            </div>

            <p className="mt-4 text-[13px] leading-relaxed text-white/70">{s.note}</p>
          </motion.div>

          {/* what it's quietly watching */}
          <h3 className="panel-title mb-3 mt-6 flex items-center gap-2">
            <Eye className="h-4 w-4 text-brand" /> กำลังเฝ้าดูอะไรอยู่ (เงียบๆ)
          </h3>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
            {watchTiles.map((t, i) => {
              const Icon = t.icon;
              return (
                <motion.div
                  key={t.label} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }} className="glass p-4" style={{ borderColor: `${t.c}22` }}
                >
                  <Icon className="h-5 w-5" style={{ color: t.c }} />
                  <p className="mt-2 font-mono text-2xl font-black text-white">{t.value}</p>
                  <p className="text-[11px] leading-tight text-muted">{t.label}</p>
                </motion.div>
              );
            })}
          </div>

          {/* per-agent observation */}
          <div className="glass mt-6 p-4">
            <h3 className="panel-title mb-3 flex items-center gap-2"><Bot className="h-4 w-4 text-brand" /> จับตาแต่ละแผนก AI</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {s.watching.agents.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                  <span className="flex items-center gap-2 text-sm text-white/90">
                    <Target className="h-3.5 w-3.5 text-muted" /> {a.name}
                  </span>
                  <span className="font-mono text-xs" style={{ color: a.observed > 0 ? "#22c55e" : "#8b90a0" }}>
                    {a.observed > 0 ? `สังเกตแล้ว ${a.observed} ครั้ง` : "รอข้อมูล"}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[11px] text-muted">
              บันทึกสะสม: ปิดแล้ว {s.trades_observed} ไม้ · ชนะ {s.wins} · แพ้ {s.losses} · สุทธิ{" "}
              <b style={{ color: s.net_pnl >= 0 ? "#22c55e" : "#ef4444" }}>
                {s.net_pnl >= 0 ? "+" : ""}{s.net_pnl.toFixed(2)} USD
              </b>{" "}· อัตราชนะ {s.win_rate}%
            </p>
          </div>

          {/* Brain OS's own brain — its growth diary */}
          <div className="glass mt-6 p-4">
            <h3 className="panel-title mb-1 flex items-center gap-2">
              <NotebookText className="h-4 w-4 text-brand" /> สมองของ Brain OS เอง — บันทึกการเติบโต
            </h3>
            <p className="mb-3 text-[11px] text-muted">
              ทุกคืน Brain OS เขียนสิ่งที่มันสังเกตเกี่ยวกับบริษัทลง “ความจำของตัวเอง” (เก็บถาวร ไม่ลบ) — สมองที่โตขึ้นพร้อมบริษัท
            </p>
            {!s.recent_memory || s.recent_memory.length === 0 ? (
              <div className="py-3 text-center text-sm text-muted">
                ยังไม่มีบันทึก — Brain OS จะเริ่มเขียนคืนแรกที่มีการประชุม/สรุปประจำวัน
              </div>
            ) : (
              <div className="space-y-2">
                {s.recent_memory.map((m) => (
                  <div key={m.id} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                    <div className="mb-0.5 flex items-center gap-2">
                      <span className="font-mono text-[11px] text-white/70">{m.day}</span>
                      <span className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                            style={{ background: m.mode === "observing" ? "#38bdf822" : "#22c55e22",
                                     color: m.mode === "observing" ? "#38bdf8" : "#22c55e" }}>
                        {m.mode === "observing" ? "ศึกษาเงียบ" : "ที่ปรึกษา"}
                      </span>
                    </div>
                    <p className="text-[12.5px] leading-relaxed text-white/85">{m.note}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* what unlocks on wake-up */}
          <div className="glass mt-6 p-4">
            <h3 className="panel-title mb-3 flex items-center gap-2">
              {observing ? <Lock className="h-4 w-4 text-muted" /> : <Unlock className="h-4 w-4 text-accent-green" />}
              {observing ? `จะปลดล็อกเมื่อครบ ${s.activation_trades} ไม้` : "ปลดล็อกแล้ว"}
            </h3>
            <div className="space-y-2">
              {s.unlocks.map((u) => (
                <div key={u} className="flex items-center gap-2 text-[13px]">
                  {observing
                    ? <Lock className="h-3.5 w-3.5 shrink-0 text-muted" />
                    : <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-accent-green" />}
                  <span className={observing ? "text-muted" : "text-white/90"}>{u}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
