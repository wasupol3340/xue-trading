"use client";

import { motion } from "framer-motion";
import { Layers, GitBranch, Droplets, Boxes, Waves, Target } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { RadialProgress } from "@/components/ui/RadialProgress";

const CONCEPTS = [
  { icon: Boxes, name: "Order Blocks", desc: "โซนสะสมของสถาบันบนไทม์เฟรมใหญ่", conf: 89, color: "#3b82f6" },
  { icon: GitBranch, name: "Fair Value Gap", desc: "ความไม่สมดุลของราคาที่มักถูกเติมเต็ม", conf: 82, color: "#8b5cf6" },
  { icon: Droplets, name: "Liquidity Pools", desc: "จุด stop ที่ค้างอยู่เหนือ/ใต้จุดสูง-ต่ำที่เท่ากัน", conf: 85, color: "#22d3ee" },
  { icon: Layers, name: "Market Structure", desc: "ตรวจจับทิศทาง BOS / CHoCH บน M15–H4", conf: 91, color: "#f0b429" },
  { icon: Waves, name: "Wyckoff Phase", desc: "แผนภาพการสะสม / กระจายของ Wyckoff", conf: 80, color: "#2dd4bf" },
  { icon: Target, name: "Premium / Discount", desc: "จุดเข้าเทรดที่ดีที่สุดในกรอบราคา", conf: 87, color: "#f6ad55" },
];

export default function ResearchPage() {
  return (
    <div>
      <PageHeader title="ห้องวิจัย" subtitle="Research AI แยกตลาดออกเป็นแนวคิด SMC และ ICT พร้อมให้คะแนนแต่ละอย่างแบบเรียลไทม์" />

      <div className="mb-5 glass p-5">
        <h3 className="panel-title mb-3">มุมมองตลาดปัจจุบัน · XAUUSD</h3>
        <p className="text-sm leading-relaxed text-white/85">
          โครงสร้างในไทม์เฟรมใหญ่เป็น <span className="font-semibold text-accent-green">ขาขึ้น</span> ราคากวาด sell-side liquidity เข้าสู่
          demand <span className="font-semibold text-accent-blue">order block</span> ที่ 2,318 และทิ้ง{" "}
          <span className="font-semibold text-accent-violet">fair value gap</span> ที่ยังไม่ถูกเติมไว้ที่ 2,331 ทิศทางเอนไปทางฝั่งซื้อ โดยเล็งไปที่ buy-side liquidity ที่ค้างอยู่
          เหนือ 2,352 และจะผิดทางหากหลุดใต้ 2,314 การมาบรรจบกับช่วง London session และความผันผวนหลัง NFP ยิ่งเพิ่มความมั่นใจของโมเดล
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
