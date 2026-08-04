"use client";

import { motion } from "framer-motion";
import { Boxes, GitBranch, Waves, Layers } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { RadialProgress } from "@/components/ui/RadialProgress";
import { useTradingStore } from "@/store/useTradingStore";

// ไอคอน/สีตามหมวดของเทคนิคจริง
const CAT_ICON: Record<string, any> = { SMC: Boxes, ICT: GitBranch, Indicator: Waves, Volume: Layers };
const CAT_COLOR: Record<string, string> = { SMC: "#3b82f6", ICT: "#8b5cf6", Indicator: "#f6ad55", Volume: "#2dd4bf" };
const decLabel: Record<string, string> = { BUY: "ซื้อ", SELL: "ขาย", WAIT: "รอ", BUY_STRONG: "ซื้อ (มั่นใจ)" };

export default function ResearchPage() {
  // ข้อมูลจริงจาก store (useBackendSync เติมจากผลเทรดจริง + รอบตัดสินใจล่าสุด)
  const strategies = useTradingStore((s) => s.strategies);
  const meeting = useTradingStore((s) => s.meeting);
  const symbol = useTradingStore((s) => s.symbol);
  const techName = useTradingStore((s) => s.currentTechniqueName);

  const ranked = [...strategies].sort((a, b) => b.score - a.score);
  const top = ranked[0];

  return (
    <div>
      <PageHeader title="ห้องวิจัย" subtitle="Research AI จัดอันดับทุกเทคนิคจากผลเทรดจริงแบบเรียลไทม์" />

      <div className="mb-5 glass p-5">
        <h3 className="panel-title mb-3">มุมมองตลาดปัจจุบัน · {symbol}</h3>
        <p className="text-sm leading-relaxed text-white/85">
          ระบบกำลังให้น้ำหนักเทคนิค{" "}
          <span className="font-semibold text-accent-blue">{techName || top?.name || "—"}</span> สูงสุดในตอนนี้
          {top ? <> (คะแนน <span className="font-semibold text-accent-green">{top.score}</span>)</> : null}. มติล่าสุดของทีม AI:{" "}
          <span className="font-semibold text-accent-violet">{decLabel[meeting.decision] ?? meeting.decision}</span> ·
          ความมั่นใจ <span className="font-semibold">{meeting.confidence}%</span>. คะแนนทุกตัวด้านล่างคำนวณจาก
          อัตราชนะและ Profit Factor ของการเทรดจริงที่สะสมไว้ (ไม่ใช่ค่าตายตัว) และปรับตัวขึ้นลงตามผลงานจริงของแต่ละเทคนิค.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {ranked.map((s, i) => {
          const color = CAT_COLOR[s.category] || "#3b82f6";
          const Icon = CAT_ICON[s.category] || Boxes;
          return (
            <motion.div key={s.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="glass-strong flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl" style={{ background: `${color}22`, color }}>
                <Icon className="h-6 w-6" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">{s.name}</p>
                <p className="text-[11px] text-muted">
                  {s.category} · ชนะ {s.winRate}% · {s.trades} ไม้
                </p>
              </div>
              <RadialProgress value={s.score} label={`${s.score}`} size={52} stroke={5} color={color} />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
