"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { Candle } from "@/types";

interface Marker {
  index: number;
  type: "BUY" | "SELL" | "BUY_STRONG";
  price: number;
}

interface Props {
  candles: Candle[];
  markers?: Marker[];
  current: number;
  height?: number;
}

/**
 * Self-contained SVG candlestick chart with SMC/ICT annotations
 * (order block, fair value gap, liquidity, BUY/SELL markers).
 * Renders instantly without external scripts; swap for the TradingView
 * Advanced widget in production via <TradingViewWidget />.
 */
export function CandleChart({ candles, markers = [], current, height = 380 }: Props) {
  const width = 1000;
  const pad = { top: 16, right: 62, bottom: 24, left: 8 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const { min, max, xStep } = useMemo(() => {
    const lows = candles.map((c) => c.low);
    const highs = candles.map((c) => c.high);
    const lo = Math.min(...lows);
    const hi = Math.max(...highs);
    const buffer = (hi - lo) * 0.08;
    return {
      min: lo - buffer,
      max: hi + buffer,
      xStep: innerW / candles.length,
    };
  }, [candles, innerW]);

  const y = (p: number) => pad.top + innerH - ((p - min) / (max - min)) * innerH;
  const x = (i: number) => pad.left + i * xStep + xStep / 2;
  const candleW = Math.max(2, xStep * 0.6);

  const gridLines = 5;
  const priceTicks = Array.from({ length: gridLines + 1 }, (_, i) => min + ((max - min) * i) / gridLines);

  // Annotation zones (order block / FVG) derived from mock structure
  const obIndex = Math.floor(candles.length * 0.22);
  const fvgIndex = Math.floor(candles.length * 0.58);

  return (
    <div className="relative w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }}>
        <defs>
          <linearGradient id="upGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
          <linearGradient id="downGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f6ad55" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
        </defs>

        {/* grid */}
        {priceTicks.map((p, i) => (
          <g key={i}>
            <line x1={pad.left} x2={pad.left + innerW} y1={y(p)} y2={y(p)} stroke="rgba(255,255,255,0.045)" strokeWidth={1} />
            <text x={width - pad.right + 8} y={y(p) + 3} fill="#6b7280" fontSize={10} fontFamily="monospace">
              {p.toFixed(2)}
            </text>
          </g>
        ))}

        {/* order block zone */}
        <rect
          x={x(obIndex) - candleW}
          y={y(candles[obIndex].high + 4)}
          width={candleW * 6}
          height={Math.abs(y(candles[obIndex].low - 4) - y(candles[obIndex].high + 4))}
          fill="rgba(59,130,246,0.10)"
          stroke="rgba(59,130,246,0.4)"
          strokeDasharray="3 3"
        />
        <text x={x(obIndex) + 4} y={y(candles[obIndex].high + 4) - 4} fill="#60a5fa" fontSize={9}>
          ORDER BLOCK
        </text>

        {/* fair value gap */}
        <rect
          x={x(fvgIndex)}
          y={y(candles[fvgIndex].high)}
          width={candleW * 4}
          height={22}
          fill="rgba(139,92,246,0.14)"
          stroke="rgba(139,92,246,0.45)"
          strokeDasharray="2 2"
        />
        <text x={x(fvgIndex) + 4} y={y(candles[fvgIndex].high) + 14} fill="#a78bfa" fontSize={9}>
          FVG
        </text>

        {/* liquidity line */}
        <line
          x1={pad.left}
          x2={pad.left + innerW}
          y1={y(max - (max - min) * 0.14)}
          y2={y(max - (max - min) * 0.14)}
          stroke="rgba(239,68,68,0.5)"
          strokeDasharray="6 4"
          strokeWidth={1}
        />
        <text x={pad.left + 6} y={y(max - (max - min) * 0.14) - 4} fill="#f87171" fontSize={9}>
          LIQUIDITY
        </text>

        {/* candles */}
        {candles.map((c, i) => {
          const up = c.close >= c.open;
          const cx = x(i);
          const oy = y(c.open);
          const cy = y(c.close);
          const top = Math.min(oy, cy);
          const bh = Math.max(2, Math.abs(cy - oy));
          return (
            <g key={i}>
              <line x1={cx} x2={cx} y1={y(c.high)} y2={y(c.low)} stroke={up ? "#22d3ee" : "#f59e0b"} strokeWidth={1} opacity={0.9} />
              <motion.rect
                initial={{ opacity: 0, scaleY: 0 }}
                animate={{ opacity: 1, scaleY: 1 }}
                transition={{ duration: 0.4, delay: i * 0.004 }}
                style={{ transformOrigin: `${cx}px ${top + bh / 2}px` }}
                x={cx - candleW / 2}
                y={top}
                width={candleW}
                height={bh}
                rx={1}
                fill={up ? "url(#upGrad)" : "url(#downGrad)"}
              />
            </g>
          );
        })}

        {/* current price line */}
        <line x1={pad.left} x2={pad.left + innerW} y1={y(current)} y2={y(current)} stroke="#f0b429" strokeDasharray="4 4" strokeWidth={1} />
        <rect x={width - pad.right} y={y(current) - 9} width={pad.right} height={18} rx={3} fill="#f0b429" />
        <text x={width - pad.right + 6} y={y(current) + 3} fill="#000" fontSize={10} fontWeight={700} fontFamily="monospace">
          {current.toFixed(2)}
        </text>

        {/* markers */}
        {markers.map((m, i) => {
          const cx = x(m.index);
          const cy = y(m.price);
          const isSell = m.type === "SELL";
          const color = m.type === "SELL" ? "#ef4444" : m.type === "BUY_STRONG" ? "#22c55e" : "#3b82f6";
          const yOff = isSell ? -30 : 22;
          const label = m.type === "BUY_STRONG" ? "ซื้อแรง" : m.type === "SELL" ? "ขาย" : "ซื้อ";
          return (
            <g key={`mk${i}`}>
              <line x1={cx} x2={cx} y1={cy} y2={cy + (isSell ? -14 : 14)} stroke={color} strokeWidth={1.4} />
              <g transform={`translate(${cx - label.length * 3.4}, ${cy + yOff - 9})`}>
                <rect width={label.length * 6.8 + 8} height={16} rx={4} fill={color} />
                <text x={(label.length * 6.8 + 8) / 2} y={11} textAnchor="middle" fill="#fff" fontSize={9} fontWeight={700}>
                  {label}
                </text>
              </g>
            </g>
          );
        })}
      </svg>
      <div className="pointer-events-none absolute right-3 top-2 flex items-center gap-1.5 text-[11px] text-accent-green">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-green" /> เรียลไทม์
      </div>
    </div>
  );
}
