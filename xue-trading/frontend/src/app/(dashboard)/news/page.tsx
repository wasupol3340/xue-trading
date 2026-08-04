"use client";

import { motion } from "framer-motion";
import { useState } from "react";
import { NEWS } from "@/lib/mock-data";
import { NewsImpact } from "@/types";
import { PageHeader } from "@/components/layout/PageHeader";

const impactColor: Record<NewsImpact, string> = { high: "#ef4444", medium: "#f97316", low: "#22c55e" };
const impactLabel: Record<NewsImpact, string> = { high: "สูง", medium: "กลาง", low: "ต่ำ" };
const filterLabel: Record<string, string> = { all: "ทั้งหมด", high: "สูง", medium: "กลาง", low: "ต่ำ" };
const SOURCES = ["ForexFactory", "Investing", "TradingEconomics", "Reuters"];

export default function NewsPage() {
  const [filter, setFilter] = useState<NewsImpact | "all">("all");
  const items = NEWS.filter((n) => filter === "all" || n.impact === filter);

  return (
    <div>
      <PageHeader
        title="ข่าวเศรษฐกิจ"
        subtitle="ฟีดเรียลไทม์เศรษฐกิจมหภาค — News AI วิเคราะห์ข่าวแต่ละชิ้นและประเมินผลกระทบต่อทองคำ"
        action={
          <div className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
            {(["all", "high", "medium", "low"] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)} className={`rounded-lg px-3 py-1 text-xs font-semibold capitalize transition ${filter === f ? "bg-white/10 text-white" : "text-muted hover:text-white"}`}>
                {filterLabel[f]}
              </button>
            ))}
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        {SOURCES.map((s) => (
          <span key={s} className="chip text-muted">
            {s}
          </span>
        ))}
      </div>

      <div className="grid gap-3">
        {items.map((n, i) => (
          <motion.div key={n.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass flex items-center gap-4 p-4">
            <div className="text-center">
              <p className="font-mono text-sm text-white">{n.time}</p>
              <p className="text-2xl">{n.flag}</p>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-white">{n.currency}</span>
                <p className="truncate text-sm text-white/90">{n.title}</p>
              </div>
              <div className="mt-1 flex gap-4 text-[11px] text-muted">
                <span>ค่าจริง: <span className="font-mono text-white">{n.actual}</span></span>
                <span>คาดการณ์: <span className="font-mono">{n.forecast}</span></span>
                <span>ครั้งก่อน: <span className="font-mono">{n.previous}</span></span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="chip text-[10px] font-bold uppercase" style={{ color: impactColor[n.impact] }}>
                ผลกระทบ{impactLabel[n.impact]}
              </span>
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: impactColor[n.impact], boxShadow: `0 0 10px ${impactColor[n.impact]}` }} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
