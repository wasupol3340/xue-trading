"use client";

import { NewsImpact } from "@/types";
import { useTradingStore } from "@/store/useTradingStore";

const impactColor: Record<NewsImpact, string> = {
  high: "#ef4444",
  medium: "#f97316",
  low: "#22c55e",
};

export function EconomicNewsPanel() {
  const news = useTradingStore((s) => s.news);
  return (
    <div className="glass flex flex-col p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="panel-title">ข่าวเศรษฐกิจ</h3>
        <button className="text-[11px] font-semibold text-accent-cyan hover:underline">ดูทั้งหมด</button>
      </div>
      <div className="flex flex-col divide-y divide-white/[0.05]">
        {news.slice(0, 6).map((n) => (
          <div key={n.id} className="flex items-center gap-3 py-2.5">
            <span className="w-11 shrink-0 font-mono text-xs text-muted">{n.time}</span>
            <span className="text-base leading-none">{n.flag}</span>
            <span className="w-9 shrink-0 text-[11px] font-semibold text-white">{n.currency}</span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-medium text-white">{n.title}</p>
              {n.actual && n.actual !== "—" && (
                <p className="text-[10px] text-muted">
                  ค่าจริง: <span className="text-white">{n.actual}</span> · คาดการณ์: {n.forecast}
                </p>
              )}
              {n.impact === "high" && n.actual === "—" && <p className="text-[10px] font-semibold text-accent-red">ผลกระทบสูง</p>}
            </div>
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: impactColor[n.impact], boxShadow: `0 0 8px ${impactColor[n.impact]}88` }} />
          </div>
        ))}
      </div>
    </div>
  );
}
