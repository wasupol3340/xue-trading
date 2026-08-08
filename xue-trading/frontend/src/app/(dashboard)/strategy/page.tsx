"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { useTradingStore } from "@/store/useTradingStore";
import { useAccountStore } from "@/store/useAccountStore";
import { api } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { Meter } from "@/components/ui/Meter";

const catColor: Record<string, string> = {
  SMC: "#3b82f6",
  ICT: "#8b5cf6",
  Indicator: "#f6ad55",
  Volume: "#22d3ee",
};

function scoreColor(s: number) {
  if (s >= 85) return "#22c55e";
  if (s >= 75) return "#f0b429";
  return "#f97316";
}

export default function StrategyPage() {
  const currentTechnique = useTradingStore((s) => s.currentTechnique);
  const currentId = useAccountStore((s) => s.currentId);
  const accounts = useAccountStore((s) => s.accounts);
  const loadAccounts = useAccountStore((s) => s.load);
  const [sorted, setSorted] = useState<any[]>([]);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const raw = await api.strategies(currentId || undefined);
        const mapped = (raw || []).map((s: any) => ({
          id: s.key, name: s.name, category: s.category, score: s.score,
          confidence: s.confidence, winRate: s.win_rate, profitFactor: s.profit_factor,
          sharpe: s.sharpe, maxDrawdown: s.max_drawdown, trades: s.trades, enabled: !!s.enabled,
        }));
        if (alive) setSorted(mapped.sort((a: any, b: any) => b.score - a.score));
      } catch { /* keep */ }
    };
    load();
    const iv = setInterval(load, 20000);
    return () => { alive = false; clearInterval(iv); };
  }, [currentId]);

  const acc = accounts.find((a) => a.id === currentId);
  const assetLabel = acc ? (acc.asset === "crypto" ? "คริปโต" : acc.asset === "gold" ? "ทอง" : acc.asset) : "";

  return (
    <div>
      <PageHeader
        title="ศูนย์กลยุทธ์"
        subtitle={`สมองการเทรดของ "${assetLabel || "บัญชีที่เลือก"}" — เรียนรู้แยกตามสินทรัพย์ ไม่ปนกัน · คะแนน/อัตราชนะ/PF/Sharpe/DD อัปเดตจากไม้จริงของสินทรัพย์นี้`}
        action={<span className="chip border-accent-violet/30 bg-accent-violet/10 text-accent-violet">สมอง{assetLabel} · สด</span>}
      />

      <div className="glass overflow-x-auto p-0">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/[0.06] text-[11px] uppercase tracking-wider text-muted">
              <th className="px-4 py-3 font-semibold">กลยุทธ์</th>
              <th className="px-4 py-3 font-semibold">คะแนน</th>
              <th className="px-4 py-3 font-semibold">ความมั่นใจ</th>
              <th className="px-4 py-3 font-semibold">อัตราชนะ</th>
              <th className="px-4 py-3 font-semibold">Profit Factor</th>
              <th className="px-4 py-3 font-semibold">Sharpe</th>
              <th className="px-4 py-3 font-semibold">Max DD (เซนต์)</th>
              <th className="px-4 py-3 font-semibold">ไม้</th>
              <th className="px-4 py-3 font-semibold">สถานะ</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => (
              <motion.tr
                key={s.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className="border-b border-white/[0.04] transition-colors hover:bg-white/[0.02]"
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: catColor[s.category] }} />
                    <span className="font-medium text-white">{s.name}</span>
                    <span className="chip text-[10px]" style={{ color: catColor[s.category] }}>
                      {s.category}
                    </span>
                    {s.id === currentTechnique && (
                      <span className="chip border-accent-green/40 bg-accent-green/10 text-[9px] font-bold text-accent-green">
                        ● กำลังเทรด
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <span className="w-8 font-mono font-bold" style={{ color: scoreColor(s.score) }}>
                      {s.score}
                    </span>
                    <div className="w-20">
                      <Meter value={s.score} color={scoreColor(s.score)} />
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 font-mono text-muted">{s.confidence}%</td>
                <td className="px-4 py-3 font-mono text-accent-cyan">{s.winRate}%</td>
                <td className="px-4 py-3 font-mono text-white">{s.profitFactor.toFixed(2)}</td>
                <td className="px-4 py-3 font-mono text-white">{s.sharpe.toFixed(2)}</td>
                <td className="px-4 py-3 font-mono text-accent-red">{Number(s.maxDrawdown) > 0 ? `−${Number(s.maxDrawdown).toFixed(2)}` : "0.00"}</td>
                <td className="px-4 py-3 font-mono text-muted">{s.trades}</td>
                <td className="px-4 py-3">
                  <span className={`chip text-[10px] ${s.enabled ? "border-accent-green/30 bg-accent-green/10 text-accent-green" : "text-muted"}`}>
                    {s.enabled ? "ทำงานอยู่" : "หยุดชั่วคราว"}
                  </span>
                </td>
              </motion.tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-muted">
                  ยังไม่มีสถิติเทคนิคของ{assetLabel ? `สินทรัพย์ "${assetLabel}"` : "บัญชีนี้"} — สมองจะเริ่มเรียนรู้เมื่อมีไม้ปิดของสินทรัพย์นี้
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
