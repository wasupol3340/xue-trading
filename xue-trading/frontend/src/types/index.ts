export type AgentRole =
  | "CEO"
  | "Research"
  | "Strategy"
  | "News"
  | "Risk"
  | "Execution"
  | "Learning"
  | "Monitor";

export type AgentStatus =
  | "thinking"
  | "analyzing"
  | "scanning"
  | "monitoring"
  | "optimizing"
  | "trading"
  | "learning"
  | "idle";

export interface Agent {
  id: string;
  name: string;
  role: AgentRole;
  title: string;
  status: AgentStatus;
  statusLabel: string;
  confidence: number; // 0-100
  cpu: number; // 0-100
  memory: number; // 0-100
  currentTask: string;
  performance: number; // 0-100 score
  accent: string; // hex
  online: boolean;
}

export type Vote = "BUY" | "SELL" | "WAIT" | "BUY_STRONG";

export interface MeetingMessage {
  id: string;
  agent: AgentRole;
  time: string;
  text: string;
  vote?: Vote;
}

export interface Meeting {
  id: string;
  startedAt: string;
  symbol: string;
  messages: MeetingMessage[];
  approved: number;
  total: number;
  confidence: number;
  decision: Vote;
}

export interface Strategy {
  id: string;
  name: string;
  category: "SMC" | "ICT" | "Indicator" | "Volume";
  score: number;
  confidence: number;
  winRate: number;
  profitFactor: number;
  sharpe: number;
  maxDrawdown: number;
  trades: number;
  enabled: boolean;
}

export interface Candle {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export type NewsImpact = "high" | "medium" | "low";

export interface NewsItem {
  id: string;
  time: string;
  currency: string;
  flag: string;
  title: string;
  impact: NewsImpact;
  actual?: string;
  forecast?: string;
  previous?: string;
}

export interface Position {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  lots: number;
  entry: number;
  current: number;
  sl: number;
  tp: number;
  pnl: number;
  openedAt: string;
  magic: number;
}

export interface Portfolio {
  balance: number;
  equity: number;
  profit: number;
  profitPct: number;
  drawdown: number;
  openPositions: number;
  totalProfit: number;
  todayProfit: number;
  monthProfit: number;
  winRate: number;
  riskMeter: number;
}

export interface TradeRecord {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  lots: number;
  entry: number;
  exit: number;
  pnl: number;
  strategy: string;
  openedAt: string;
  closedAt: string;
  result: "win" | "loss";
}

export interface LogEntry {
  id: string;
  time: string;
  level: "info" | "success" | "warn" | "error";
  source: string;
  message: string;
}
