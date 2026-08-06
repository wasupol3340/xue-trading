"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { NotebookPen, CheckCircle2, Clock, Sparkles, XCircle, ShieldCheck, RefreshCw, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { BrainModeBanner } from "@/components/brain/BrainModeBanner";
import { api } from "@/lib/api";

type Entry = {
  id: number; source: string; subject: string; statement: string; kind: string;
  status: string; baseline_wr: number; baseline_n: number; cur_wr: number; cur_n: number;
  confidence?: number;
};
type Trust = Record<string, { confirmed: number; rejected: number; open: number; trust: number | null }>;

// สีความมั่นใจ: ยิ่งข้อมูลเยอะ+ห่างจากเหรียญ 50% ยิ่งมั่นใจ
const confColor = (c: number) => (c >= 70 ? "#22c55e" : c >= 40 ? "#f0b429" : "#8b90a0");
const confLabel = (c: number) => (c >= 70 ? "มั่นใจสูง" : c >= 40 ? "มั่นใจปานกลาง" : "ยังไม่ชัวร์");

function ConfidenceMeter({ value }: { value: number }) {
  const c = confColor(value);
  return (
    <div className="shrink-0" style={{ minWidth: 108 }} title={`ความมั่นใจว่าเป็นของจริง ไม่ใช่ฟลุค — ${value}% (${confLabel(value)})`}>
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] text-muted">ความมั่นใจ</span>
        <span className="font-mono text-[11px] font-bold" style={{ color: c }}>{value}%</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07]">
        <div className="h-full rounded-full" style={{ width: `${Math.max(3, value)}%`, background: c }} />
      </div>
    </div>
  );
}

const STATUS: Record<string, { label: string; c: string; icon: any }> = {
  confirmed: { label: "ยืนยันแล้ว", c: "#22c55e", icon: CheckCircle2 },
  watching: { label: "กำลังพิสูจน์", c: "#f0b429", icon: Clock },
  proposed: { label: "ตั้งสมมติฐาน", c: "#38bdf8", icon: Sparkles },
  rejected: { label: "ตกไป (ข้อมูลหักล้าง)", c: "#8b90a0", icon: XCircle },
};
const ORDER = ["confirmed", "watching", "proposed", "rejected"];

export default function JournalPage() {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [trust, setTrust] = useState<Trust>({});
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const r = await api.journal();
      setEntries(r.entries || []);
      setTrust(r.trust || {});
      setErr("");
    } catch (e: any) {
      setErr(e?.message || "โหลดข้อมูลไม่ได้");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => { load(); }, []);

  const grouped = ORDER.map((s) => ({ status: s, items: entries.filter((e) => e.status === s) })).filter((g) => g.items.length);

  return (
    <div>
      <PageHeader
        title="สมุดบันทึกสมอง"
        subtitle="บทเรียน/สมมติฐานของบริษัท — จดถาวร แล้วให้ 'ข้อมูลจริง' เป็นคนพิสูจน์ว่าจริงไหม (ตั้ง → เฝ้าดู → ยืนยัน/ตกไป)"
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

      {/* Trust panel */}
      {Object.keys(trust).length > 0 && (
        <div className="glass mb-5 p-4">
          <h3 className="panel-title mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-brand" /> ความน่าเชื่อถือของแหล่งความคิด (Trust)</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(trust).map(([src, t]) => (
              <div key={src} className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-white capitalize">{src}</span>
                  <span className="font-mono text-lg font-bold" style={{ color: t.trust == null ? "#8b90a0" : t.trust >= 60 ? "#22c55e" : t.trust >= 40 ? "#f0b429" : "#ef4444" }}>
                    {t.trust == null ? "—" : `${t.trust}%`}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted">ยืนยัน {t.confirmed} · ตกไป {t.rejected} · กำลังพิสูจน์ {t.open}</p>
              </div>
            ))}
          </div>
          <p className="mt-3 text-[11px] text-muted">
            Trust = สัดส่วนสมมติฐานที่ "ยืนยันได้ด้วยข้อมูล" เทียบกับที่ "ตกไป" — ยิ่งสูง แหล่งนั้นยิ่งเชื่อถือได้
          </p>
        </div>
      )}

      {loading && !entries.length && <div className="glass p-6 text-center text-muted">กำลังโหลดสมุดบันทึก…</div>}

      {!loading && entries.length === 0 && !err && (
        <div className="glass p-8 text-center">
          <NotebookPen className="mx-auto mb-3 h-10 w-10 text-muted" />
          <p className="text-sm text-white">ยังไม่มีสมมติฐาน — จะเริ่มจดเมื่อมีผลเทรดต่อบริบทมากพอ (≥5 ไม้/สภาพตลาด)</p>
        </div>
      )}

      {/* Confidence Engine explainer */}
      {entries.length > 0 && (
        <div className="glass mb-5 flex flex-wrap items-center gap-x-4 gap-y-1 p-3 text-[11px] text-muted">
          <span className="font-bold text-white/80">แถบ “ความมั่นใจ” = โอกาสที่บทเรียนนี้เป็นของจริง ไม่ใช่ฟลุค</span>
          <span>คิดจาก “ข้อมูลมากพอไหม” × “ห่างจากเหรียญ 50% แค่ไหน” — ยิ่งไม้เยอะ ยิ่งมั่นใจ</span>
          <span className="font-mono">1 ไม้/100% ≈ 5% · 5 ไม้/78% ≈ 22% · 700 ไม้/74% ≈ 97%</span>
        </div>
      )}

      {/* hypotheses grouped by status */}
      <div className="space-y-6">
        {grouped.map((g) => {
          const s = STATUS[g.status];
          const Icon = s.icon;
          return (
            <div key={g.status}>
              <div className="mb-2 flex items-center gap-2">
                <Icon className="h-4 w-4" style={{ color: s.c }} />
                <span className="text-sm font-bold" style={{ color: s.c }}>{s.label}</span>
                <span className="text-[11px] text-muted">({g.items.length})</span>
              </div>
              <div className="space-y-2">
                {g.items.map((e, i) => (
                  <motion.div
                    key={e.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.4) }}
                    className="glass flex flex-wrap items-center gap-3 p-3"
                    style={{ borderColor: `${s.c}22` }}
                  >
                    <span
                      className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                      style={{ color: e.kind === "strong" ? "#22c55e" : "#ef4444", background: e.kind === "strong" ? "#22c55e18" : "#ef444418" }}
                    >
                      {e.kind === "strong" ? "จุดแข็ง" : "จุดอ่อน"}
                    </span>
                    <span className="min-w-[180px] flex-1 text-sm text-white/90">{e.statement}</span>
                    <span className="shrink-0 font-mono text-xs text-muted">
                      หลักฐาน: {e.cur_wr}% · {e.cur_n} ไม้
                    </span>
                    <ConfidenceMeter value={e.confidence ?? 0} />
                  </motion.div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
