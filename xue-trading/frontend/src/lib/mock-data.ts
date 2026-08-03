import {
  Agent,
  Meeting,
  Strategy,
  NewsItem,
  Position,
  Portfolio,
  TradeRecord,
  LogEntry,
  Candle,
} from "@/types";

export const AGENTS: Agent[] = [
  {
    id: "ceo",
    name: "CEO AI",
    role: "CEO",
    title: "Strategic Decision Maker",
    status: "thinking",
    statusLabel: "Thinking",
    confidence: 91,
    cpu: 42,
    memory: 61,
    currentTask: "Weighing agent consensus for XAUUSD",
    performance: 94,
    accent: "#f0b429",
    online: true,
  },
  {
    id: "research",
    name: "Research AI",
    role: "Research",
    title: "Market Researcher",
    status: "analyzing",
    statusLabel: "Analyzing",
    confidence: 87,
    cpu: 66,
    memory: 58,
    currentTask: "Scanning HTF structure & liquidity pools",
    performance: 89,
    accent: "#3b82f6",
    online: true,
  },
  {
    id: "news",
    name: "News AI",
    role: "News",
    title: "News & Sentiment",
    status: "scanning",
    statusLabel: "Scanning",
    confidence: 74,
    cpu: 38,
    memory: 44,
    currentTask: "Parsing NFP release & Fed commentary",
    performance: 82,
    accent: "#22c55e",
    online: true,
  },
  {
    id: "risk",
    name: "Risk AI",
    role: "Risk",
    title: "Risk Management",
    status: "monitoring",
    statusLabel: "Monitoring",
    confidence: 96,
    cpu: 29,
    memory: 40,
    currentTask: "Enforcing 5% risk & max exposure caps",
    performance: 97,
    accent: "#8b5cf6",
    online: true,
  },
  {
    id: "strategy",
    name: "Strategy AI",
    role: "Strategy",
    title: "Strategy Developer",
    status: "optimizing",
    statusLabel: "Optimizing",
    confidence: 88,
    cpu: 71,
    memory: 69,
    currentTask: "SMC + ICT confluence at premium zone",
    performance: 91,
    accent: "#f6ad55",
    online: true,
  },
  {
    id: "execution",
    name: "Execution AI",
    role: "Execution",
    title: "Order Executor",
    status: "trading",
    statusLabel: "Trading",
    confidence: 90,
    cpu: 33,
    memory: 37,
    currentTask: "Routing 0.10 lot buy to MT5 bridge",
    performance: 93,
    accent: "#22d3ee",
    online: true,
  },
  {
    id: "learning",
    name: "Learning AI",
    role: "Learning",
    title: "Machine Learning",
    status: "learning",
    statusLabel: "Learning",
    confidence: 84,
    cpu: 82,
    memory: 77,
    currentTask: "Updating strategy scores from 240 trades",
    performance: 88,
    accent: "#60a5fa",
    online: true,
  },
  {
    id: "monitor",
    name: "Monitor AI",
    role: "Monitor",
    title: "System Monitor",
    status: "monitoring",
    statusLabel: "Monitoring",
    confidence: 99,
    cpu: 18,
    memory: 31,
    currentTask: "Watching MT5 link, latency & drawdown",
    performance: 99,
    accent: "#2dd4bf",
    online: true,
  },
];

export const MEETING: Meeting = {
  id: "mtg-0916",
  startedAt: new Date().toISOString(),
  symbol: "XAUUSD",
  approved: 8,
  total: 8,
  confidence: 87,
  decision: "BUY",
  messages: [
    { id: "m1", agent: "CEO", time: "09:15:23", text: "Let's analyze current market condition.", vote: undefined },
    { id: "m2", agent: "Research", time: "09:15:35", text: "Gold is showing bullish momentum on higher TF.", vote: "BUY" },
    { id: "m3", agent: "News", time: "09:15:42", text: "News sentiment is positive for gold.", vote: "WAIT" },
    { id: "m4", agent: "Risk", time: "09:15:48", text: "Risk level is within safe limit.", vote: "BUY" },
    { id: "m5", agent: "Strategy", time: "09:15:55", text: "Pullback strategy with SMC + ICT confluence.", vote: "BUY" },
    { id: "m6", agent: "Execution", time: "09:16:02", text: "Ready to execute buy order with 0.10 lot.", vote: "BUY" },
    { id: "m7", agent: "CEO", time: "09:16:10", text: "All agents agree. Execute the trade.", vote: "BUY_STRONG" },
  ],
};

export const STRATEGIES: Strategy[] = [
  { id: "smc", name: "Smart Money Concepts", category: "SMC", score: 92, confidence: 89, winRate: 71.4, profitFactor: 2.31, sharpe: 1.94, maxDrawdown: 6.2, trades: 412, enabled: true },
  { id: "ict", name: "ICT (Inner Circle Trader)", category: "ICT", score: 90, confidence: 87, winRate: 68.9, profitFactor: 2.18, sharpe: 1.81, maxDrawdown: 7.1, trades: 388, enabled: true },
  { id: "fvg", name: "Fair Value Gap", category: "ICT", score: 85, confidence: 82, winRate: 64.2, profitFactor: 1.92, sharpe: 1.57, maxDrawdown: 8.4, trades: 301, enabled: true },
  { id: "liquidity", name: "Liquidity Sweep", category: "SMC", score: 88, confidence: 85, winRate: 66.7, profitFactor: 2.04, sharpe: 1.72, maxDrawdown: 7.8, trades: 274, enabled: true },
  { id: "orderblock", name: "Order Block", category: "SMC", score: 87, confidence: 84, winRate: 65.9, profitFactor: 1.98, sharpe: 1.66, maxDrawdown: 8.0, trades: 336, enabled: true },
  { id: "supplydemand", name: "Supply & Demand", category: "SMC", score: 81, confidence: 78, winRate: 61.3, profitFactor: 1.74, sharpe: 1.42, maxDrawdown: 9.6, trades: 259, enabled: true },
  { id: "ema", name: "EMA Confluence", category: "Indicator", score: 73, confidence: 70, winRate: 57.8, profitFactor: 1.51, sharpe: 1.18, maxDrawdown: 11.2, trades: 520, enabled: true },
  { id: "rsi", name: "RSI Divergence", category: "Indicator", score: 69, confidence: 66, winRate: 55.1, profitFactor: 1.39, sharpe: 1.02, maxDrawdown: 12.7, trades: 480, enabled: false },
  { id: "macd", name: "MACD Momentum", category: "Indicator", score: 66, confidence: 63, winRate: 53.4, profitFactor: 1.31, sharpe: 0.94, maxDrawdown: 13.5, trades: 445, enabled: false },
  { id: "wyckoff", name: "Wyckoff Method", category: "Volume", score: 83, confidence: 80, winRate: 63.0, profitFactor: 1.86, sharpe: 1.52, maxDrawdown: 8.9, trades: 198, enabled: true },
];

export const NEWS: NewsItem[] = [
  { id: "n1", time: "08:30", currency: "USD", flag: "🇺🇸", title: "Non-Farm Payrolls (May)", impact: "high", actual: "272K", forecast: "185K", previous: "175K" },
  { id: "n2", time: "07:00", currency: "EUR", flag: "🇪🇺", title: "CPI (YoY) (May)", impact: "medium", actual: "2.6%", forecast: "2.4%", previous: "2.4%" },
  { id: "n3", time: "06:00", currency: "GBP", flag: "🇬🇧", title: "GDP (QoQ) (Q1)", impact: "low", actual: "0.7%", forecast: "0.6%", previous: "0.3%" },
  { id: "n4", time: "05:30", currency: "USD", flag: "🇺🇸", title: "Crude Oil Inventories", impact: "medium", actual: "-2.3M", forecast: "-1.8M", previous: "1.2M" },
  { id: "n5", time: "04:00", currency: "USD", flag: "🇺🇸", title: "Fed Chair Powell Speaks", impact: "high", actual: "—", forecast: "—", previous: "—" },
];

export const POSITIONS: Position[] = [
  { id: "p1", symbol: "XAUUSD", side: "BUY", lots: 0.1, entry: 2331.4, current: 2345.68, sl: 2320.0, tp: 2370.0, pnl: 142.8, openedAt: new Date(Date.now() - 3600e3).toISOString(), magic: 20260803 },
  { id: "p2", symbol: "XAUUSD", side: "BUY", lots: 0.05, entry: 2338.2, current: 2345.68, sl: 2325.0, tp: 2372.0, pnl: 37.4, openedAt: new Date(Date.now() - 1800e3).toISOString(), magic: 20260803 },
  { id: "p3", symbol: "XAUUSD", side: "SELL", lots: 0.05, entry: 2352.9, current: 2345.68, sl: 2360.0, tp: 2330.0, pnl: 36.1, openedAt: new Date(Date.now() - 900e3).toISOString(), magic: 20260803 },
];

export const PORTFOLIO: Portfolio = {
  balance: 1000.0,
  equity: 1720.45,
  profit: 720.45,
  profitPct: 72,
  drawdown: 4.12,
  openPositions: 3,
  totalProfit: 720.45,
  todayProfit: 216.3,
  monthProfit: 720.45,
  winRate: 68.4,
  riskMeter: 4.12,
};

export const LOGS: LogEntry[] = [
  { id: "l1", time: "09:16:10", level: "success", source: "CEO AI", message: "Consensus reached (8/8). Decision: BUY XAUUSD @ 0.10 lot" },
  { id: "l2", time: "09:16:02", level: "info", source: "Execution AI", message: "Order queued → MT5 bridge (magic 20260803)" },
  { id: "l3", time: "09:15:55", level: "info", source: "Strategy AI", message: "SMC+ICT confluence detected at premium discount zone" },
  { id: "l4", time: "09:15:48", level: "success", source: "Risk AI", message: "Risk check passed: exposure 4.1% < 5% cap" },
  { id: "l5", time: "09:15:42", level: "warn", source: "News AI", message: "High-impact NFP in T-15m — widening SL buffer" },
  { id: "l6", time: "09:15:35", level: "info", source: "Research AI", message: "HTF bias: bullish. Liquidity resting above 2,352" },
  { id: "l7", time: "09:15:23", level: "info", source: "Monitor AI", message: "MT5 link healthy · latency 41ms · server MetaQuotes-Demo" },
];

export const TRADES: TradeRecord[] = Array.from({ length: 14 }).map((_, i) => {
  const win = Math.random() > 0.34;
  const side = Math.random() > 0.5 ? "BUY" : "SELL";
  const entry = 2300 + Math.random() * 80;
  const move = (win ? 1 : -1) * (Math.random() * 18 + 3) * (side === "BUY" ? 1 : -1);
  const exit = entry + move;
  const lots = [0.05, 0.1, 0.15][Math.floor(Math.random() * 3)];
  const pnl = (exit - entry) * (side === "BUY" ? 1 : -1) * lots * 100;
  const strat = STRATEGIES[Math.floor(Math.random() * 6)].name;
  return {
    id: `t${i}`,
    symbol: "XAUUSD",
    side: side as "BUY" | "SELL",
    lots,
    entry: +entry.toFixed(2),
    exit: +exit.toFixed(2),
    pnl: +pnl.toFixed(2),
    strategy: strat,
    openedAt: new Date(Date.now() - (i + 1) * 5400e3).toISOString(),
    closedAt: new Date(Date.now() - (i + 1) * 5400e3 + 2400e3).toISOString(),
    result: (pnl >= 0 ? "win" : "loss") as "win" | "loss",
  };
});

/** Deterministic-ish synthetic candles for the fallback chart */
export function generateCandles(count = 90, start = 2320): Candle[] {
  const candles: Candle[] = [];
  let price = start;
  const now = Date.now();
  for (let i = count; i > 0; i--) {
    const drift = Math.sin(i / 6) * 2.4;
    const noise = (Math.random() - 0.5) * 6;
    const open = price;
    const close = open + drift + noise;
    const high = Math.max(open, close) + Math.random() * 3;
    const low = Math.min(open, close) - Math.random() * 3;
    candles.push({
      time: now - i * 15 * 60 * 1000,
      open: +open.toFixed(2),
      high: +high.toFixed(2),
      low: +low.toFixed(2),
      close: +close.toFixed(2),
      volume: Math.round(500 + Math.random() * 1500),
    });
    price = close;
  }
  return candles;
}
