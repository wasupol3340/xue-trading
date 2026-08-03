import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "XUE Trading — Autonomous AI Trading Platform",
  description:
    "Enterprise-grade autonomous AI trading platform. 8 specialized AI agents run market research, strategy, risk and execution on XAUUSD via MetaTrader 5.",
  keywords: ["AI trading", "XAUUSD", "MT5", "SMC", "ICT", "algorithmic trading", "fintech"],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${mono.variable} dark`}>
      <body className="min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
