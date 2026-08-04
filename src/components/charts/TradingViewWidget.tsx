"use client";

import { useEffect, useRef, memo } from "react";

/**
 * TradingView Advanced Chart widget. Used in production for real XAUUSD
 * candles. The dashboard uses the self-contained <CandleChart /> by default
 * so the UI renders without the external script; swap this in where desired.
 */
function TradingViewWidget({ symbol = "OANDA:XAUUSD", interval = "15" }: { symbol?: string; interval?: string }) {
  const container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!container.current) return;
    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      autosize: true,
      symbol,
      interval,
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      backgroundColor: "rgba(5,7,13,1)",
      gridColor: "rgba(255,255,255,0.05)",
      hide_top_toolbar: false,
      allow_symbol_change: false,
      studies: ["STD;EMA", "STD;RSI"],
      support_host: "https://www.tradingview.com",
    });
    container.current.innerHTML = "";
    container.current.appendChild(script);
  }, [symbol, interval]);

  return <div ref={container} className="h-full w-full" style={{ minHeight: 380 }} />;
}

export default memo(TradingViewWidget);
