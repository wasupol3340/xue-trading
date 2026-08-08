"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Brain, Target, Sparkles, AlertTriangle, CheckCircle2, Activity } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api";
import { useAccountStore } from "@/store/useAccountStore";

// ---- types (โครงหลวมๆ ตรงกับ /api/agents/brains) ----
type KPI = Record<string, string | number>;
type Learning = { active: boolean; status: string };
type Review = {
  key: string; name: string; status: string; verdict: string; reason: string;
  streak: number; recent_win_rate: number;
};
type Brain = {
  id: string; name: string; role: string; job: string;
  kpi: KPI; accuracy: number | null; memory: string;
  strengths: string[]; weaknesses: string[]; learning: Learning;
  reviews?: Review[];
};

const accColor = (a: number | null) =>
  a == null ? "#8b90a0" : a >= 60 ? "#22c55e" : a >= 45 ? "#f0b429" : "#ef4444";

const REVIEW_STYLE: Record<string, { c: string; bg: string; label: string }> = {
  ok:     { c: "#22c55e", bg: "#22c55e18", label: "ใช้ต่อ" },
  refine: { c: "#f0b429", bg: "#f0b42918", label: "ปรับให้ดีขึ้น" },
  watch:  { c: "#38bdf8", bg: "#38bdf818", label: "เฝ้าดู" },
  bench:  { c: "#ef4444", bg: "#ef444418", label: "พักการใช้งาน" },
};

export default function HeadquartersPage() {
  const [brains, setBrains] = useState<Brain[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const currentId = useAccountStore((s) => s.currentId);
  const accounts = useAccountStore((s) => s.accounts);
  const loadAccounts = useAccountStore((s) => s.load);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const [b, r] = await Promise.all([api.brains(currentId || undefined), api.reviews(currentId || undefined)]);
        if (!alive) return;
        setBrains(b as Brain[]);
        setReviews(r as Review[]);
        setErr("");
      } catch (e: any) {
        if (alive) setErr(e?.message || "โหลดข้อมูลไม่ได้");
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 10000);
    return () => { alive = false; clearInterval(id); };
  }, [currentId]);

  const acc = accounts.find((a) => a.id === currentId);
  const assetLabel = acc ? (acc.asset === "crypto" ? "คริปโต" : acc.asset === "gold" ? "ทอง" : acc.asset) : "";

  const measurable = brains.filter((b) => b.accuracy != null);

  return (
    <div>
      <PageHeader
        title={`สำนักงานใหญ่ AI${assetLabel ? ` · ทีม${assetLabel}` : ""}`}
        subtitle={`พนักงาน AI 8 ตัวของบัญชี "${acc?.name || "ที่เลือก"}" — แต่ละทีม (ทอง/คริปโต) มีสมอง/ความจำ/KPI ของตัวเอง แยกกัน ไม่ปนกัน`}
        action={
          <span className="chip border-accent-green/30 bg-accent-green/10 text-accent-green">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-green" /> วัดผลจริง · อัปเดตทุก 10 วิ
          </span>
        }
      />

      {err && (
        <div className="glass mb-5 flex items-center gap-2 p-4 text-sm" style={{ borderColor: "#ef444433" }}>
          <AlertTriangle className="h-4 w-4 text-accent-red" />
          <span className="text-muted">เชื่อมต่อ backend ไม่ได้: {err}</span>
        </div>
      )}
      {loading && !brains.length && <div className="glass p-6 text-center text-muted">กำลังโหลดโปรไฟล์พนักงาน AI…</div>}

      {/* เปรียบเทียบความแม่นยำ */}
      {measurable.length > 0 && (
        <div className="glass mb-5 p-4">
          <h3 className="panel-title mb-3 flex items-center gap-2"><Target className="h-4 w-4 text-brand" /> เปรียบเทียบความแม่นยำ (วัดจากผลจริง)</h3>
          <div className="space-y-2.5">
            {measurable.map((b) => (
              <div key={b.id} className="flex items-center gap-3">
                <span className="w-28 shrink-0 text-xs font-semibold text-white">{b.name}</span>
                <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-white/[0.05]">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(3, Math.min(100, b.accuracy as number))}%` }}
                    transition={{ duration: 0.6 }}
                    className="h-full rounded-full"
                    style={{ background: accColor(b.accuracy) }}
                  />
                </div>
                <span className="w-12 shrink-0 text-right text-xs font-bold" style={{ color: accColor(b.accuracy) }}>
                  {b.accuracy}%
                </span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted">
            บางตัว (Risk) ไม่มีความแม่นยำแบบชนะ/แพ้ เพราะหน้าที่คือ “รักษาทุน” ไม่ใช่ทำนายทิศทาง — จึงไม่แสดงในกราฟนี้
          </p>
        </div>
      )}

      {/* การ์ดพนักงาน AI */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-2">
        {brains.map((b, i) => (
          <motion.div
            key={b.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="glass flex flex-col p-4"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Brain className="h-4 w-4 text-accent-violet" />
                  <span className="text-sm font-bold text-white">{b.name}</span>
                </div>
                <p className="mt-1 text-[11px] leading-snug text-muted">{b.job}</p>
              </div>
              <div className="shrink-0 text-right">
                <div className="text-lg font-bold" style={{ color: accColor(b.accuracy) }}>
                  {b.accuracy == null ? "—" : `${b.accuracy}%`}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted">ความแม่นยำ</div>
              </div>
            </div>

            {/* KPI */}
            <div className="mb-3 grid grid-cols-2 gap-2">
              {Object.entries(b.kpi).map(([k, v]) => (
                <div key={k} className="rounded-lg border border-white/[0.06] bg-white/[0.02] px-2.5 py-1.5">
                  <div className="text-[10px] text-muted">{k}</div>
                  <div className="truncate text-xs font-semibold text-white" title={String(v)}>{String(v)}</div>
                </div>
              ))}
            </div>

            {/* จุดแข็ง / จุดอ่อน */}
            <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              <div>
                <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-accent-green">
                  <CheckCircle2 className="h-3 w-3" /> จุดแข็ง
                </div>
                <ul className="space-y-0.5">
                  {b.strengths.map((s, j) => (
                    <li key={j} className="text-[11px] leading-snug text-white/80">• {s}</li>
                  ))}
                </ul>
              </div>
              <div>
                <div className="mb-1 flex items-center gap-1 text-[11px] font-semibold text-accent-red">
                  <AlertTriangle className="h-3 w-3" /> จุดอ่อน
                </div>
                <ul className="space-y-0.5">
                  {b.weaknesses.map((s, j) => (
                    <li key={j} className="text-[11px] leading-snug text-white/70">• {s}</li>
                  ))}
                </ul>
              </div>
            </div>

            {/* วงจรเรียนรู้ */}
            <div
              className="mt-auto flex items-start gap-2 rounded-lg px-2.5 py-2"
              style={{
                background: b.learning.active ? "#22c55e12" : "#8b90a010",
                border: `1px solid ${b.learning.active ? "#22c55e33" : "#ffffff10"}`,
              }}
            >
              <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: b.learning.active ? "#22c55e" : "#8b90a0" }} />
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: b.learning.active ? "#22c55e" : "#8b90a0" }}>
                  {b.learning.active ? "กำลังเรียนรู้" : "ยังไม่ activate"}
                </div>
                <div className="text-[11px] leading-snug text-white/80">{b.learning.status}</div>
              </div>
            </div>
            <p className="mt-2 text-[10px] text-muted">ความจำ: {b.memory}</p>
          </motion.div>
        ))}
      </div>

      {/* การประชุมทบทวนเทคนิค */}
      <div className="glass mt-5 p-4">
        <h3 className="panel-title mb-1 flex items-center gap-2"><Activity className="h-4 w-4 text-brand" /> การประชุมทบทวนเทคนิค</h3>
        <p className="mb-3 text-[11px] text-muted">
          เมื่อเทคนิคไหนแพ้ติดกัน องค์กรลงมติว่าใช้ต่อไหม — <b>ขนาดไม้คงที่เสมอ</b> ปรับที่ “การเลือกเทคนิค” ไม่ใช่ลดขนาดไม้
        </p>
        {reviews.length === 0 ? (
          <div className="py-4 text-center text-sm text-muted">ยังไม่มีเทคนิคที่มีผลเทรดพอให้ทบทวน</div>
        ) : (
          <div className="space-y-2">
            {reviews.map((r) => {
              const st = REVIEW_STYLE[r.status] || REVIEW_STYLE.ok;
              return (
                <div key={r.key} className="flex flex-wrap items-center gap-3 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2">
                  <span className="w-40 shrink-0 text-xs font-semibold text-white">{r.name}</span>
                  <span
                    className="shrink-0 rounded-md px-2 py-0.5 text-[11px] font-bold"
                    style={{ color: st.c, background: st.bg }}
                  >
                    {st.label}
                  </span>
                  <span className="min-w-[120px] flex-1 text-[11px] leading-snug text-white/75">{r.reason}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
