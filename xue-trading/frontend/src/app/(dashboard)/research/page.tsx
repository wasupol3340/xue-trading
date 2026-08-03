"use client";

import { motion } from "framer-motion";
import { Layers, GitBranch, Droplets, Boxes, Waves, Target } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { RadialProgress } from "@/components/ui/RadialProgress";

const CONCEPTS = [
  { icon: Boxes, name: "Order Blocks", desc: "Institutional accumulation zones on HTF", conf: 89, color: "#3b82f6" },
  { icon: GitBranch, name: "Fair Value Gap", desc: "Price imbalance likely to be rebalanced", conf: 82, color: "#8b5cf6" },
  { icon: Droplets, name: "Liquidity Pools", desc: "Resting stops above/below equal highs-lows", conf: 85, color: "#22d3ee" },
  { icon: Layers, name: "Market Structure", desc: "BOS / CHoCH bias detection on M15–H4", conf: 91, color: "#f0b429" },
  { icon: Waves, name: "Wyckoff Phase", desc: "Accumulation / distribution schematic", conf: 80, color: "#2dd4bf" },
  { icon: Target, name: "Premium / Discount", desc: "Optimal Trade Entry within dealing range", conf: 87, color: "#f6ad55" },
];

export default function ResearchPage() {
  return (
    <div>
      <PageHeader title="Research Lab" subtitle="Research AI decomposes the market into SMC & ICT concepts and scores each in real time." />

      <div className="mb-5 glass p-5">
        <h3 className="panel-title mb-3">Current Market Thesis · XAUUSD</h3>
        <p className="text-sm leading-relaxed text-white/85">
          Higher-timeframe structure is <span className="font-semibold text-accent-green">bullish</span>. Price swept sell-side liquidity into a
          demand <span className="font-semibold text-accent-blue">order block</span> at 2,318 and left an unfilled{" "}
          <span className="font-semibold text-accent-violet">fair value gap</span> at 2,331. Bias favors longs targeting buy-side liquidity resting
          above 2,352, invalidation below 2,314. Confluence with the London session and post-NFP volatility raises the model&apos;s conviction.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {CONCEPTS.map((c, i) => {
          const Icon = c.icon;
          return (
            <motion.div key={c.name} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }} className="glass-strong flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `${c.color}22`, color: c.color }}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">{c.name}</p>
                <p className="text-[11px] text-muted">{c.desc}</p>
              </div>
              <RadialProgress value={c.conf} label={`${c.conf}`} size={52} stroke={5} color={c.color} />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
