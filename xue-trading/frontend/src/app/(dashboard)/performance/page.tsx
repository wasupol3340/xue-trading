"use client";

import { useEffect, useState } from "react";
import { api, isBackendConfigured } from "@/lib/api";
import { PageHeader } from "@/components/layout/PageHeader";
import { fmtMoney } from "@/lib/utils";
import { useAccountStore } from "@/store/useAccountStore";

type Trade = { pnl: number; technique: string; closed_at: number; result: string };
type Stats = { total: number; win_rate: number; net_pnl: number; best_technique: string };

export default function PerformancePage() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<Stats>({ total: 0, win_rate: 0, net_pnl: 0, best_technique: "—" });
  const [loaded, setLoaded] = useState(false);
  const currentId = useAccountStore((s) => s.currentId);
  const loadAccounts = useAccountStore((s) => s.load);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => {
    if (!isBackendConfigured()) { setLoaded(true); return; }
    let alive = true;
    const load = async () => {
      try {
        const res = await api.history(currentId || undefined);
        if (!alive) return;
        setTrades(res.trades || []);
        setStats(res.stats || { total: 0, win_rate: 0, net_pnl: 0, best_technique: "—" });
      } catch { /* keep last */ } finally { if (alive) setLoaded(true); }
    };
    load();
    const iv = setInterval(load, 20000);
    return () => { alive = false; clearInterval(iv); };
  }, [currentId]);

  // equity curve = cumulative realized P&L over time (oldest -> newest)
  const chrono = [...trades].sort((a, b) => a.closed_at - b.closed_at);
  let cum = 0;
  const pts = chrono.map((t) => { cum += t.pnl; return cum; });
  const netUp = (pts[pts.length - 1] ?? 0) >= 0;

  // per-technique breakdown
  const byTech: Record<string, { pnl: number; n: number; w: number }> = {};
  for (const t of trades) {
    const k = t.technique || "—";
    const g = byTech[k] || { pnl: 0, n: 0, w: 0 };
    g.pnl += t.pnl; g.n += 1; if (t.pnl >= 0) g.w += 1;
    byTech[k] = g;
  }
  const techRows = Object.entries(byTech)
    .map(([name, g]) => ({ name, pnl: g.pnl, n: g.n, wr: g.n ? (g.w / g.n) * 100 : 0 }))
    .sort((a, b) => b.pnl - a.pnl);
  const maxAbs = Math.max(1, ...techRows.map((r) => Math.abs(r.pnl)));

  return (
    <div>
      <PageHeader title="ผลงาน" subtitle="กราฟกำไรสะสม (Equity Curve) และผลงานจริงของแต่ละเทคนิค จากไม้ที่ปิดใน MT5" />

      <div className="mb-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="ไม้ทั้งหมด" value={`${stats.total}`} />
        <Stat label="อัตราชนะ" value={`${stats.win_rate}%`} tone="text-accent-cyan" />
        <Stat label="กำไร/ขาดทุนสุทธิ" value={`${stats.net_pnl >= 0 ? "+" : ""}${fmtMoney(stats.net_pnl)}`} tone={stats.net_pnl >= 0 ? "text-up" : "text-down"} />
        <Stat label="เทคนิคดีที่สุด" value={stats.best_technique} tone="text-brand" />
      </div>

      {/* equity curve */}
      <div className="mb-5 glass p-5">
        <p className="panel-title mb-3">กำไรสะสม (Equity Curve)</p>
        {pts.length >= 2 ? (
          <EquityChart pts={pts} up={netUp} />
        ) : (
          <div className="flex h-40 items-center justify-center text-sm text-muted">
            {loaded ? "ยังมีไม้ปิดไม่พอวาดกราฟ (ต้องมีอย่างน้อย 2 ไม้)" : "กำลังโหลด…"}
          </div>
        )}
      </div>

      {/* per-technique */}
      <div className="glass p-5">
        <p className="panel-title mb-4">กำไร/ขาดทุนแยกตามเทคนิค</p>
        {techRows.length === 0 ? (
          <p className="text-sm text-muted">{loaded ? "ยังไม่มีไม้ที่ปิด" : "กำลังโหลด…"}</p>
        ) : (
          <div className="space-y-2.5">
            {techRows.map((r) => {
              const pos = r.pnl >= 0;
              const w = (Math.abs(r.pnl) / maxAbs) * 50; // % of half-width
              return (
                <div key={r.name} className="flex items-center gap-3">
                  <span className="w-40 shrink-0 truncate text-[12px] text-white/80">{r.name}</span>
                  <div className="relative h-5 flex-1">
                    <div className="absolute left-1/2 top-0 h-full w-px bg-white/10" />
                    <div
                      className="absolute top-0.5 h-4 rounded"
                      style={{
                        background: pos ? "#22c55e" : "#ef4444",
                        left: pos ? "50%" : `${50 - w}%`,
                        width: `${w}%`,
                      }}
                    />
                  </div>
                  <span className={`w-20 text-right font-mono text-[12px] font-bold ${pos ? "text-up" : "text-down"}`}>
                    {pos ? "+" : ""}{fmtMoney(r.pnl)}
                  </span>
                  <span className="w-24 text-right text-[11px] text-muted">{r.n} ไม้ · {r.wr.toFixed(0)}%</span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function EquityChart({ pts, up }: { pts: number[]; up: boolean }) {
  const W = 800, H = 220, pad = 10;
  const ys = [0, ...pts];
  const min = Math.min(...ys), max = Math.max(...ys);
  const range = (max - min) || 1;
  const n = pts.length;
  const x = (i: number) => pad + (i / Math.max(1, n - 1)) * (W - 2 * pad);
  const y = (v: number) => pad + (1 - (v - min) / range) * (H - 2 * pad);
  const line = pts.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `M ${x(0).toFixed(1)},${y(pts[0]).toFixed(1)} ` +
    pts.map((v, i) => `L ${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ") +
    ` L ${x(n - 1).toFixed(1)},${y(min).toFixed(1)} L ${x(0).toFixed(1)},${y(min).toFixed(1)} Z`;
  const color = up ? "#22c55e" : "#ef4444";
  const zeroY = y(0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" preserveAspectRatio="none" style={{ height: 220 }}>
      <defs>
        <linearGradient id="eqfill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.28" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* zero baseline */}
      {min < 0 && max > 0 && (
        <line x1={pad} y1={zeroY} x2={W - pad} y2={zeroY} stroke="#ffffff20" strokeDasharray="4 4" strokeWidth="1" />
      )}
      <path d={area} fill="url(#eqfill)" />
      <polyline points={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

function Stat({ label, value, tone = "text-white" }: { label: string; value: string; tone?: string }) {
  return (
    <div className="glass p-4">
      <p className="panel-title">{label}</p>
      <p className={`mt-1 font-mono text-2xl font-bold ${tone}`}>{value}</p>
    </div>
  );
}
