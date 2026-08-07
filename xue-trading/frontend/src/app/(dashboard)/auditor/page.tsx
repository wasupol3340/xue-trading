"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ClipboardCheck, RefreshCw, AlertTriangle, CheckCircle2, XCircle, AlertCircle, Scan, CalendarDays,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api";

type Check = { key: string; label: string; status: "ok" | "warn" | "error"; detail: string; expected: any; actual: any };
type LogRow = { id: number; day: string; healthy: number; errors: number; warns: number; summary: string };
type Report = {
  healthy: boolean; errors: number; warns: number; summary: string;
  checks: Check[]; audited_at: string; log: LogRow[];
};

const ST: Record<string, { c: string; icon: any }> = {
  ok: { c: "#22c55e", icon: CheckCircle2 },
  warn: { c: "#f0b429", icon: AlertCircle },
  error: { c: "#ef4444", icon: XCircle },
};

export default function AuditorPage() {
  const [r, setR] = useState<Report | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    try { setR(await api.auditor()); setErr(""); }
    catch (e: any) { setErr(e?.message || "โหลดข้อมูลไม่ได้"); }
    finally { setLoading(false); }
  };
  const runNow = async () => { setRunning(true); try { await api.auditorRun(); await load(); } catch { /* ignore */ } finally { setRunning(false); } };
  useEffect(() => { load(); const iv = setInterval(load, 20000); return () => clearInterval(iv); }, []);

  const hc = r?.healthy ? "#22c55e" : r && r.errors > 0 ? "#ef4444" : "#f0b429";

  return (
    <div>
      <PageHeader
        title="ผู้ตรวจสอบบัญชี"
        subtitle="กระทบยอดตัวเลขภายในทั้งหมดกับ MT5 (แหล่งความจริง) ตลอดเวลา — ตัวเลขเพี้ยน/ไม้หาย/นับซ้ำ จับได้ทันที (ไม่แตะการเทรด)"
        action={
          <div className="flex gap-2">
            <button onClick={runNow} disabled={running} className="chip border-white/10 bg-white/[0.03] text-muted hover:text-white disabled:opacity-50">
              <Scan className={running ? "h-3.5 w-3.5 animate-pulse" : "h-3.5 w-3.5"} /> {running ? "กำลังตรวจ…" : "ตรวจเดี๋ยวนี้"}
            </button>
            <button onClick={load} className="chip border-white/10 bg-white/[0.03] text-muted hover:text-white">
              <RefreshCw className="h-3.5 w-3.5" /> รีเฟรช
            </button>
          </div>
        }
      />

      {err && (
        <div className="glass mb-5 flex items-center gap-2 p-4 text-sm" style={{ borderColor: "#ef444433" }}>
          <AlertTriangle className="h-4 w-4 text-accent-red" /><span className="text-muted">{err}</span>
        </div>
      )}
      {loading && !r && <div className="glass p-6 text-center text-muted">กำลังตรวจสอบ…</div>}

      {r && (
        <>
          {/* verdict */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="glass flex flex-wrap items-center gap-4 p-5" style={{ borderColor: `${hc}33` }}>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: `${hc}1a`, border: `1px solid ${hc}44` }}>
              <ClipboardCheck className="h-7 w-7" style={{ color: hc }} />
            </div>
            <div className="min-w-[200px] flex-1">
              <p className="text-base font-bold text-white">{r.healthy ? "บัญชีตรงทุกจุด — เชื่อถือได้" : r.summary}</p>
              <p className="text-[12px] text-muted">ตรวจล่าสุด {r.audited_at}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center"><p className="font-mono text-2xl font-black" style={{ color: r.errors ? "#ef4444" : "#8b90a0" }}>{r.errors}</p><p className="text-[10px] text-muted">ผิดพลาด</p></div>
              <div className="text-center"><p className="font-mono text-2xl font-black" style={{ color: r.warns ? "#f0b429" : "#8b90a0" }}>{r.warns}</p><p className="text-[10px] text-muted">เฝ้าระวัง</p></div>
            </div>
          </motion.div>

          {/* checks */}
          <div className="mt-5 space-y-2">
            {r.checks.map((c, i) => {
              const s = ST[c.status] || ST.ok;
              const Icon = s.icon;
              return (
                <motion.div key={c.key} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                  className="glass flex items-start gap-3 p-4" style={{ borderColor: `${s.c}22` }}>
                  <Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: s.c }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[14px] font-bold text-white">{c.label}</p>
                    <p className="text-[12.5px] text-white/70">{c.detail}</p>
                  </div>
                  <span className="shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase" style={{ background: `${s.c}18`, color: s.c }}>
                    {c.status === "ok" ? "ตรง" : c.status === "warn" ? "เฝ้าระวัง" : "ผิดพลาด"}
                  </span>
                </motion.div>
              );
            })}
          </div>

          {/* history */}
          {r.log.length > 1 && (
            <div className="glass mt-5 p-4">
              <h3 className="panel-title mb-3">ประวัติการตรวจสอบ</h3>
              <div className="space-y-1.5">
                {r.log.map((h) => (
                  <div key={h.id} className="flex items-center justify-between rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-1.5 text-[12px]">
                    <span className="inline-flex items-center gap-1 font-mono text-white/70"><CalendarDays className="h-3 w-3" /> {h.day}</span>
                    <span className="text-muted">{h.summary}</span>
                    <span className="font-mono" style={{ color: h.healthy ? "#22c55e" : h.errors ? "#ef4444" : "#f0b429" }}>
                      {h.healthy ? "✓ ตรง" : `${h.errors}E · ${h.warns}W`}
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
