"use client";

import { motion } from "framer-motion";
import { Minus, Plus, Pencil } from "lucide-react";
import { useTradingStore } from "@/store/useTradingStore";
import { cn } from "@/lib/utils";

function Stepper({
  label,
  value,
  suffix,
  onDec,
  onInc,
}: {
  label: string;
  value: string;
  suffix?: string;
  onDec: () => void;
  onInc: () => void;
}) {
  return (
    <div className="glass p-3">
      <span className="panel-title">{label}</span>
      <div className="mt-2 flex items-center justify-between gap-2">
        <button onClick={onDec} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-muted transition hover:text-white">
          <Minus className="h-4 w-4" />
        </button>
        <span className="font-mono text-lg font-semibold text-white">
          {value}
          {suffix}
        </span>
        <button onClick={onInc} className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-muted transition hover:text-white">
          <Plus className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function TradeControls() {
  const { lotSize, riskLevel, tp, sl, autoTrading, setLotSize, setRiskLevel, toggleAuto } = useTradingStore();

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
      <Stepper label="Lot Size" value={lotSize.toFixed(2)} onDec={() => setLotSize(lotSize - 0.01)} onInc={() => setLotSize(lotSize + 0.01)} />
      <Stepper label="Risk Level" value={`${riskLevel}`} suffix="%" onDec={() => setRiskLevel(riskLevel - 1)} onInc={() => setRiskLevel(riskLevel + 1)} />

      <div className="glass p-3">
        <span className="panel-title">Take Profit</span>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-lg font-semibold text-accent-green">{tp.toFixed(2)}</span>
          <Pencil className="h-3.5 w-3.5 text-muted" />
        </div>
      </div>

      <div className="glass p-3">
        <span className="panel-title">Stop Loss</span>
        <div className="mt-2 flex items-center justify-between">
          <span className="font-mono text-lg font-semibold text-accent-red">{sl.toFixed(2)}</span>
          <Pencil className="h-3.5 w-3.5 text-muted" />
        </div>
      </div>

      <button
        onClick={toggleAuto}
        className={cn(
          "relative flex flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border p-3 transition-all",
          autoTrading ? "border-accent-violet/40 bg-gradient-to-br from-accent-violet/25 to-accent-cyan/15" : "border-white/10 bg-white/[0.02]"
        )}
      >
        <span className="text-[11px] font-bold uppercase tracking-wider text-white">Auto Trading</span>
        <div className="flex items-center gap-2">
          <span className={cn("text-sm font-bold", autoTrading ? "text-accent-green" : "text-muted")}>{autoTrading ? "ON" : "OFF"}</span>
          <span className={cn("relative h-5 w-9 rounded-full transition-colors", autoTrading ? "bg-accent-green/80" : "bg-white/10")}>
            <motion.span layout className="absolute top-0.5 h-4 w-4 rounded-full bg-white shadow" style={{ left: autoTrading ? 18 : 2 }} />
          </span>
        </div>
      </button>
    </div>
  );
}
