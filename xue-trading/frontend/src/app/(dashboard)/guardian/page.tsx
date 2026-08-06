"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ShieldAlert, ShieldCheck, RefreshCw, AlertTriangle, Radar, Brain,
  CheckCircle2, Bot, Scan,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api";

type Ev = {
  id: number; severity: "critical" | "warn"; agent: string; rule: string;
  detail: string; brain_os_note: string; status: string; created_at: string;
};
type Status = {
  healthy: boolean; open_total: number; open_critical: number; open_warn: number;
  total_events: number; last_scan: number;
  rules: { key: string; th: string; sev: string }[];
  events: Ev[];
};

export default function GuardianPage() {
  const [s, setS] = useState<Status | null>(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  const load = async () => {
    try { setS(await api.guardian()); setErr(""); }
    catch (e: any) { setErr(e?.message || "โหลดข้อมูลไม่ได้"); }
    finally { setLoading(false); }
  };
  const scanNow = async () => {
    setScanning(true);
    try { await api.guardianScan(); await load(); } catch { /* ignore */ } finally { setScanning(false); }
  };
  const ack = async (id: number) => { try { await api.guardianAck(id); await load(); } catch { /* ignore */ } };

  useEffect(() => { load(); const iv = setInterval(load, 15000); return () => clearInterval(iv); }, []);

  const healthy = s?.healthy;
  const hc = healthy ? "#22c55e" : s && s.open_critical > 0 ? "#ef4444" : "#f0b429";

  return (
    <div>
      <PageHeader
        title="ทีมเทคนิค (ความปลอดภัย)"
        subtitle="เฝ้าจับความผิดปกติ/การละเมิดกฎของทั้งระบบตลอดเวลา — เจอเมื่อไหร่ แจ้ง Telegram ทันที + ให้ Brain OS เข้าตรวจสอบ (ไม่หยุดเทรดเอง — ผู้กำกับตัดสินใจ)"
        action={
          <div className="flex gap-2">
            <button onClick={scanNow} disabled={scanning} className="chip border-white/10 bg-white/[0.03] text-muted hover:text-white disabled:opacity-50">
              <Scan className={scanning ? "h-3.5 w-3.5 animate-pulse" : "h-3.5 w-3.5"} /> {scanning ? "กำลังสแกน…" : "สแกนเดี๋ยวนี้"}
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
      {loading && !s && <div className="glass p-6 text-center text-muted">กำลังโหลด…</div>}

      {s && (
        <>
          {/* health banner */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="glass flex flex-wrap items-center gap-4 p-5" style={{ borderColor: `${hc}33` }}>
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl" style={{ background: `${hc}1a`, border: `1px solid ${hc}44` }}>
              {healthy ? <ShieldCheck className="h-7 w-7" style={{ color: hc }} /> : <ShieldAlert className="h-7 w-7" style={{ color: hc }} />}
            </div>
            <div className="min-w-[200px] flex-1">
              <p className="text-base font-bold text-white">
                {healthy ? "ปกติดี — ไม่พบการละเมิดกฎ" : `พบ ${s.open_total} เรื่องที่ต้องดู`}
              </p>
              <p className="text-[12px] text-muted">
                {healthy ? "ทุกออเดอร์ผ่านคณะกรรมการ · อยู่ในเพดานความเสี่ยง · มี SL ครบ"
                         : `วิกฤต ${s.open_critical} · เฝ้าระวัง ${s.open_warn}`}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center"><p className="font-mono text-2xl font-black" style={{ color: s.open_critical ? "#ef4444" : "#8b90a0" }}>{s.open_critical}</p><p className="text-[10px] text-muted">วิกฤต</p></div>
              <div className="text-center"><p className="font-mono text-2xl font-black" style={{ color: s.open_warn ? "#f0b429" : "#8b90a0" }}>{s.open_warn}</p><p className="text-[10px] text-muted">เฝ้าระวัง</p></div>
            </div>
          </motion.div>

          {/* rules watched */}
          <div className="glass mt-5 p-4">
            <h3 className="panel-title mb-3 flex items-center gap-2"><Radar className="h-4 w-4 text-brand" /> กฎที่ทีมเทคนิคเฝ้าอยู่ ({s.rules.length})</h3>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {s.rules.map((r) => (
                <div key={r.key} className="flex items-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[12.5px]">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.sev === "critical" ? "#ef4444" : "#f0b429" }} />
                  <span className="text-white/85">{r.th}</span>
                </div>
              ))}
            </div>
          </div>

          {/* events log */}
          <div className="glass mt-5 p-4">
            <h3 className="panel-title mb-3 flex items-center gap-2"><ShieldAlert className="h-4 w-4 text-brand" /> บันทึกเหตุการณ์ (เก็บถาวร)</h3>
            {s.events.length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <CheckCircle2 className="mb-2 h-9 w-9 text-accent-green" />
                <p className="text-sm text-white">ยังไม่พบความผิดปกติ — ระบบสะอาด</p>
                <p className="text-[11px] text-muted">ทีมเทคนิคสแกนอัตโนมัติทุก ~45 วินาทีระหว่างเทรด</p>
              </div>
            ) : (
              <div className="space-y-2">
                {s.events.map((e) => {
                  const crit = e.severity === "critical";
                  const c = crit ? "#ef4444" : "#f0b429";
                  const isOpen = e.status === "open";
                  return (
                    <div key={e.id} className="rounded-lg border bg-white/[0.02] p-3" style={{ borderColor: `${c}33`, opacity: isOpen ? 1 : 0.6 }}>
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase" style={{ background: `${c}18`, color: c }}>
                          {crit ? "วิกฤต" : "เฝ้าระวัง"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] text-white/70"><Bot className="h-3 w-3" /> {e.agent}</span>
                        <span className="font-mono text-[10px] text-muted">{e.created_at}</span>
                        {isOpen ? (
                          <button onClick={() => ack(e.id)} className="ml-auto rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-muted hover:text-white">
                            รับทราบ
                          </button>
                        ) : (
                          <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-accent-green"><CheckCircle2 className="h-3 w-3" /> รับทราบแล้ว</span>
                        )}
                      </div>
                      <p className="text-[13px] text-white/90">{e.detail}</p>
                      {e.brain_os_note && (
                        <p className="mt-1.5 flex items-start gap-1.5 rounded-md bg-white/[0.03] px-2 py-1.5 text-[11.5px] text-white/70">
                          <Brain className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-violet" /> {e.brain_os_note}
                        </p>
                      )}
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
