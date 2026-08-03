"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Maximize2, Settings2, Share2, CandlestickChart } from "lucide-react";
import { useTradingStore } from "@/store/useTradingStore";
import { useLiveTicker } from "@/hooks/useLiveTicker";
import { generateCandles } from "@/lib/mock-data";
import { CandleChart } from "@/components/charts/CandleChart";
import { AgentRail } from "@/components/dashboard/AgentRail";
import { PortfolioPanel } from "@/components/dashboard/PortfolioPanel";
import { EconomicNewsPanel } from "@/components/dashboard/EconomicNewsPanel";
import { SignalCards } from "@/components/dashboard/SignalCards";
import { TradeControls } from "@/components/dashboard/TradeControls";
import { MeetingTimeline } from "@/components/dashboard/MeetingTimeline";
import { fmtNumber } from "@/lib/utils";

const TIMEFRAMES = ["M1", "M5", "M15", "H1", "H4", "D1"];

export default function DashboardPage() {
  useLiveTicker();
  const { symbol, price, change, changePct, timeframe, setTimeframe } = useTradingStore();

  const candles = useMemo(() => generateCandles(88, 2318), []);
  const markers = useMemo(
    () => [
      { index: 12, type: "SELL" as const, price: candles[12]?.high ?? price },
      { index: 20, type: "BUY" as const, price: candles[20]?.low ?? price },
      { index: 44, type: "SELL" as const, price: candles[44]?.high ?? price },
      { index: 52, type: "BUY" as const, price: candles[52]?.low ?? price },
      { index: 78, type: "BUY_STRONG" as const, price: candles[78]?.low ?? price },
    ],
    [candles, price]
  );

  const up = change >= 0;

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[280px_minmax(0,1fr)_340px]">
      {/* LEFT — Agent rail */}
      <div className="order-2 xl:order-1">
        <AgentRail />
      </div>

      {/* CENTER — Chart + signals + controls */}
      <div className="order-1 flex min-w-0 flex-col gap-4 xl:order-2">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="glass p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-amber-600">
                <CandlestickChart className="h-5 w-5 text-black" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white">{symbol}</h2>
                  <span className="text-[11px] text-muted">Gold / U.S. Dollar</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="font-mono text-2xl font-bold text-white">{fmtNumber(price)}</span>
                  <span className={`font-mono text-sm font-semibold ${up ? "text-up" : "text-down"}`}>
                    {up ? "+" : ""}
                    {fmtNumber(change)} ({up ? "+" : ""}
                    {fmtNumber(changePct)}%)
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-white/[0.02] p-1">
                {TIMEFRAMES.map((tf) => (
                  <button
                    key={tf}
                    onClick={() => setTimeframe(tf)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                      timeframe === tf ? "bg-accent-blue text-white shadow-glow-blue" : "text-muted hover:text-white"
                    }`}
                  >
                    {tf}
                  </button>
                ))}
              </div>
              {[Settings2, Share2, Maximize2].map((Icon, i) => (
                <button key={i} className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-2 text-muted transition hover:text-white">
                  <Icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <CandleChart candles={candles} markers={markers} current={price} height={384} />
          </div>
        </motion.div>

        <SignalCards />
        <TradeControls />
        <MeetingTimeline />
      </div>

      {/* RIGHT — Portfolio + news */}
      <div className="order-3 flex flex-col gap-4">
        <PortfolioPanel />
        <EconomicNewsPanel />
      </div>
    </div>
  );
}
