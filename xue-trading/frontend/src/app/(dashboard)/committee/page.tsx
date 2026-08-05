"use client";

import { motion } from "framer-motion";
import { ShieldCheck, CheckCircle2, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { useTradingStore } from "@/store/useTradingStore";

const CAT: [string, string][] = [
  ["structure", "โครงสร้าง / Regime"],
  ["trend", "เทรนด์ (Multi-TF)"],
  ["liquidity", "สภาพคล่อง"],
  ["smart_money", "Smart Money"],
  ["volume", "วอลุ่ม"],
  ["momentum", "โมเมนตัม"],
  ["volatility", "ความผันผวน (ATR)"],
  ["price_action", "Price Action"],
  ["news", "ข่าว"],
  ["correlation", "สินทรัพย์สัมพันธ์"],
  ["risk", "ความเสี่ยง (RR)"],
  ["execution", "คุณภาพเข้า (Spread)"],
  ["data", "คุณภาพข้อมูล"],
];

const barColor = (v: number) => (v >= 70 ? "#22c55e" : v >= 50 ? "#f0b429" : "#ef4444");
const verdictStyle = (r: string) =>
  r === "BUY" ? { c: "#22c55e", t: "ซื้อ (BUY)" }
  : r === "SELL" ? { c: "#ef4444", t: "ขาย (SELL)" }
  : { c: "#8b90a0", t: "ไม่เทรด (NO TRADE)" };

export default function CommitteePage() {
  const sc = useTradingStore((s) => s.scorecard) || {};
  const lastAction = useTradingStore((s) => s.lastAction);
  const lastActionAt = useTradingStore((s) => s.lastActionAt);
  const has = !!sc.recommendation;
  const v = verdictStyle(sc.recommendation || "NO TRADE");
  const scores = sc.scores || {};
  const executed = (lastAction || "").includes("ส่งออเดอร์แล้ว");

  return (
    <div>
      <PageHeader
        title="คณะกรรมการลงทุน"
        subtitle="การตัดสินใจจริงล่าสุดของบอท (รอบประชุมจริงทุก 15 นาที) — สิ่งที่เห็นคือสิ่งที่บอททำจริง"
      />

      {/* ผลรอบล่าสุดจริงของบอท + เหตุผลว่าออก/ไม่ออกออเดอร์ */}
      <div
        className="mb-5 glass flex flex-wrap items-center justify-between gap-3 p-4"
        style={{ borderColor: executed ? "#22c55e33" : "#8b90a033" }}
      >
        <div className="flex items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: executed ? "#22c55e22" : "#8b90a022", color: executed ? "#22c55e" : "#8b90a0" }}
          >
            {executed ? "✅" : "•"}
          </span>
          <div>
            <p className="text-[11px] uppercase tracking-wider text-muted">ผลรอบล่าสุดของบอท</p>
            <p className="text-sm font-semibold text-white">{lastAction || "ยังไม่ได้ประเมินรอบแรก (รอสูงสุด 15 นาที)"}</p>
          </div>
        </div>
        <span className="font-mono text-[11px] text-muted">
          ประเมินเมื่อ {lastActionAt || "—"} · อัปเดตทุกรอบ 15 นาที
        </span>
      </div>

      {!has ? (
        <div className="glass flex flex-col items-center gap-3 p-12 text-center">
          <ShieldCheck className="h-10 w-10 text-muted" />
          <p className="text-sm text-muted">ยังไม่มีการประเมิน — รอบอทประชุมรอบแรก (สูงสุด 15 นาที) แล้วคณะกรรมการจะลงความเห็นที่นี่</p>
        </div>
      ) : (
        <>
          {/* verdict */}
          <div className="mb-5 grid gap-4 lg:grid-cols-[320px_1fr]">
            <div className="glass flex flex-col items-center justify-center gap-2 p-6" style={{ borderColor: `${v.c}33` }}>
              <ShieldCheck className="h-8 w-8" style={{ color: v.c }} />
              <p className="text-[11px] uppercase tracking-wider text-muted">คำตัดสินคณะกรรมการ</p>
              <p className="text-3xl font-black" style={{ color: v.c }}>{v.t}</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="font-mono text-4xl font-black text-white">{sc.total ?? "—"}</span>
                <span className="text-sm text-muted">/ 100</span>
              </div>
              <p className="text-[11px] text-muted">ความมั่นใจ {sc.confidence ?? "—"}% · เทคนิค {sc.technique || "—"}</p>
            </div>

            <div className="glass p-5">
              <p className="panel-title mb-3">แผนเทรด</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <Plan label="จุดเข้า" value={sc.entry} tone="text-white" />
                <Plan label="Stop Loss" value={sc.sl} tone="text-accent-red" />
                <Plan label="Take Profit" value={sc.tp} tone="text-accent-green" />
                <Plan label="Risk : Reward" value={sc.rr} tone="text-accent-cyan" />
              </div>
              <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
                <p className="text-[11px] font-semibold text-muted">คำแนะนำสุดท้าย</p>
                <p className="mt-1 text-sm text-white/90">{sc.summary || "—"}</p>
              </div>
            </div>
          </div>

          {/* 13 category scores */}
          <div className="mb-5 glass p-5">
            <p className="panel-title mb-4">คะแนนรายหมวด (13 ด้าน)</p>
            <div className="grid gap-x-8 gap-y-3 sm:grid-cols-2">
              {CAT.map(([key, label]) => {
                const val = scores[key] ?? 0;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-40 shrink-0 text-[12px] text-white/80">{label}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${val}%` }} transition={{ duration: 0.5 }} className="h-full rounded-full" style={{ background: barColor(val) }} />
                    </div>
                    <span className="w-8 text-right font-mono text-[12px] font-bold" style={{ color: barColor(val) }}>{val}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* reasons / risks */}
          <div className="mb-5 grid gap-4 lg:grid-cols-2">
            <div className="glass p-5">
              <p className="panel-title mb-3 flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent-green" /> เหตุผลสนับสนุน</p>
              <ul className="space-y-2">
                {(sc.reasons || []).length === 0 && <li className="text-[13px] text-muted">—</li>}
                {(sc.reasons || []).map((r: string, i: number) => (
                  <li key={i} className="flex gap-2 text-[13px] text-white/85"><span className="text-accent-green">✓</span>{r}</li>
                ))}
              </ul>
            </div>
            <div className="glass p-5">
              <p className="panel-title mb-3 flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-accent-red" /> ความเสี่ยง / Red Team</p>
              <ul className="space-y-2">
                {(sc.risks || []).length === 0 && <li className="text-[13px] text-muted">—</li>}
                {(sc.risks || []).map((r: string, i: number) => (
                  <li key={i} className="flex gap-2 text-[13px] text-white/85"><span className="text-accent-red">✕</span>{r}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* invalidation + uncertainty */}
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="glass p-5">
              <p className="panel-title mb-2">เงื่อนไขที่ทำให้แผนใช้ไม่ได้ (Invalidation)</p>
              <p className="text-[13px] text-white/85">{sc.invalidation || "—"}</p>
            </div>
            <div className="glass p-5">
              <p className="panel-title mb-2">สิ่งที่ยังไม่แน่ใจ (Uncertainty)</p>
              <ul className="space-y-1">
                {(sc.uncertainty || []).length === 0 && <li className="text-[13px] text-muted">—</li>}
                {(sc.uncertainty || []).map((u: string, i: number) => (
                  <li key={i} className="text-[13px] text-muted">• {u}</li>
                ))}
              </ul>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function Plan({ label, value, tone }: { label: string; value: any; tone: string }) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`mt-1 font-mono text-lg font-bold ${tone}`}>{value ?? "—"}</p>
    </div>
  );
}
