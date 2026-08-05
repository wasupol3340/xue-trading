"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ShieldCheck, Sparkles } from "lucide-react";
import { useTradingStore } from "@/store/useTradingStore";

const CAT: [string, string][] = [
  ["structure", "โครงสร้าง"],
  ["trend", "เทรนด์ (MTF)"],
  ["liquidity", "สภาพคล่อง"],
  ["smart_money", "Smart Money"],
  ["volume", "วอลุ่ม"],
  ["momentum", "โมเมนตัม"],
  ["volatility", "ผันผวน (ATR)"],
  ["price_action", "Price Action"],
  ["news", "ข่าว"],
  ["correlation", "สัมพันธ์"],
  ["risk", "เสี่ยง (RR)"],
  ["execution", "Spread"],
  ["data", "ข้อมูล"],
];

const barColor = (v: number) => (v >= 70 ? "#22c55e" : v >= 50 ? "#f0b429" : "#ef4444");
const verdictStyle = (r: string) =>
  r === "BUY" ? { c: "#22c55e", t: "ซื้อ (BUY)" }
  : r === "SELL" ? { c: "#ef4444", t: "ขาย (SELL)" }
  : { c: "#8b90a0", t: "ไม่เทรด (NO TRADE)" };

export function CommitteePanel() {
  const sc = useTradingStore((s) => s.scorecard) || {};
  const lastAction = useTradingStore((s) => s.lastAction);
  const lastActionAt = useTradingStore((s) => s.lastActionAt);
  const advisorText = useTradingStore((s) => s.advisorText);
  const has = !!sc.recommendation;
  const v = verdictStyle(sc.recommendation || "NO TRADE");
  const scores = sc.scores || {};

  return (
    <div className="glass p-5" style={{ borderColor: `${v.c}22` }}>
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" style={{ color: v.c }} />
          <div>
            <p className="text-sm font-bold text-white">คณะกรรมการลงทุน</p>
            <p className="text-[11px] text-muted">การตัดสินใจจริงล่าสุดของบอท</p>
          </div>
        </div>
        <Link href="/committee" className="text-[11px] font-semibold text-brand hover:underline">
          ดูเต็ม →
        </Link>
      </div>

      {/* verdict + score */}
      <div className="mb-3 flex items-center justify-between rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
        <div>
          <p className="text-[11px] text-muted">คำตัดสิน</p>
          <p className="text-xl font-black" style={{ color: v.c }}>{v.t}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] text-muted">คะแนนรวม</p>
          <p className="font-mono text-2xl font-black text-white">
            {has ? sc.total : "—"}<span className="text-sm text-muted">/100</span>
          </p>
        </div>
      </div>

      {/* last action (why this round) */}
      <div className="mb-3 rounded-lg border border-white/[0.05] bg-white/[0.02] px-3 py-2">
        <p className="text-[12px] text-white/90">{lastAction || "รอบอทประเมินรอบแรก (สูงสุด 15 นาที)"}</p>
        {lastActionAt && <p className="mt-0.5 font-mono text-[10px] text-muted">ประเมินเมื่อ {lastActionAt} · ทุก 15 นาที</p>}
      </div>

      {/* 13 category mini-bars */}
      {has && (
        <div className="mb-3 grid grid-cols-1 gap-x-5 gap-y-1.5 sm:grid-cols-2">
          {CAT.map(([key, label]) => {
            const val = scores[key] ?? 0;
            return (
              <div key={key} className="flex items-center gap-2">
                <span className="w-24 shrink-0 text-[11px] text-white/70">{label}</span>
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                  <motion.div initial={{ width: 0 }} animate={{ width: `${val}%` }} transition={{ duration: 0.5 }} className="h-full rounded-full" style={{ background: barColor(val) }} />
                </div>
                <span className="w-6 text-right font-mono text-[11px] font-bold" style={{ color: barColor(val) }}>{val}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* AI advisor */}
      {advisorText && (
        <div className="rounded-lg border p-3" style={{ borderColor: "#8b5cf633", background: "#8b5cf60d" }}>
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold text-accent-violet">
            <Sparkles className="h-3.5 w-3.5" /> ที่ปรึกษา AI
          </p>
          <p className="text-[12px] leading-relaxed text-white/90">{advisorText}</p>
        </div>
      )}
    </div>
  );
}
