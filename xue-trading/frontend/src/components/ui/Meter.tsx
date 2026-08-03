"use client";

import { motion } from "framer-motion";

export function Meter({
  value,
  color = "#22d3ee",
  height = 6,
}: {
  value: number;
  color?: string;
  height?: number;
}) {
  return (
    <div className="w-full overflow-hidden rounded-full bg-white/[0.06]" style={{ height }}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: color, boxShadow: `0 0 12px ${color}55` }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.8, ease: "easeOut" }}
      />
    </div>
  );
}

export function RiskMeter({ value }: { value: number }) {
  const pct = Math.min(100, (value / 20) * 100); // 20% dd = full
  return (
    <div className="space-y-2">
      <div className="relative h-2.5 w-full overflow-hidden rounded-full">
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-accent-green via-brand to-accent-red opacity-90" />
        <div className="absolute inset-0 rounded-full bg-black/30" style={{ left: `${pct}%` }} />
        <motion.div
          className="absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full border-2 border-white bg-white/20 backdrop-blur"
          initial={{ left: 0 }}
          animate={{ left: `calc(${pct}% - 8px)` }}
          transition={{ type: "spring", stiffness: 120, damping: 18 }}
          style={{ boxShadow: "0 0 12px rgba(255,255,255,0.6)" }}
        />
      </div>
      <div className="flex justify-between text-[10px] font-medium uppercase tracking-wider">
        <span className="text-accent-green">Low Risk</span>
        <span className="text-muted">Medium</span>
        <span className="text-accent-red">High</span>
      </div>
    </div>
  );
}
