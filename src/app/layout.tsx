import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  title: "XUE Trading — แพลตฟอร์มเทรดอัตโนมัติด้วย AI",
  description:
    "แพลตฟอร์มเทรดอัตโนมัติด้วย AI ระดับองค์กร ทีม AI เฉพาะทาง 8 ตัวทำงานวิจัยตลาด กลยุทธ์ ความเสี่ยง และการเข้าเทรด XAUUSD ผ่าน MetaTrader 5",
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
