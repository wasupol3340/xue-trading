"use client";

import { motion } from "framer-motion";
import { useTradingStore } from "@/store/useTradingStore";
import { PageHeader } from "@/components/layout/PageHeader";

const levelColor: Record<string, string> = {
  info: "#8a93a6",
  success: "#22c55e",
  warn: "#f97316",
  error: "#ef4444",
};

export default function LogsPage() {
  const logs = useTradingStore((s) => s.logs);

  return (
    <div>
      <PageHeader title="บันทึกระบบ" subtitle="สตรีมเหตุการณ์แบบเรียลไทม์จาก AI ทุกตัว เครื่องยนต์ความเสี่ยง และตัวเชื่อม MT5" action={<span className="chip border-accent-green/30 bg-accent-green/10 text-accent-green"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-green" /> กำลังสตรีม</span>} />
      <div className="glass p-4 font-mono text-[13px]">
        <div className="space-y-1.5">
          {logs.map((l, i) => (
            <motion.div key={l.id} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.02, 0.5) }} className="flex items-start gap-3 rounded-md px-2 py-1 hover:bg-white/[0.02]">
              <span className="shrink-0 text-muted-soft">{l.time}</span>
              <span className="w-16 shrink-0 font-bold uppercase" style={{ color: levelColor[l.level] }}>
                {l.level}
              </span>
              <span className="w-24 shrink-0 text-accent-cyan">{l.source}</span>
              <span className="text-white/85">{l.message}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
