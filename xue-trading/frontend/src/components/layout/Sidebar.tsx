"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Wallet,
  Bot,
  FlaskConical,
  Users,
  Brain,
  History,
  Newspaper,
  LineChart,
  Settings,
  ScrollText,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/headquarters", label: "AI Headquarters", icon: Building2 },
  { href: "/agents", label: "AI Agents", icon: Bot },
  { href: "/research", label: "Research Lab", icon: FlaskConical },
  { href: "/meeting", label: "Meeting Room", icon: Users },
  { href: "/portfolio", label: "Portfolio", icon: Wallet },
  { href: "/strategy", label: "Strategy Center", icon: Brain },
  { href: "/backtest", label: "Backtesting", icon: LineChart },
  { href: "/news", label: "Economic News", icon: Newspaper },
  { href: "/history", label: "Trading History", icon: History },
  { href: "/logs", label: "System Logs", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-[248px] shrink-0 flex-col border-r border-white/[0.06] bg-bg-soft/60 px-3 py-5 backdrop-blur-xl lg:flex">
      <Link href="/dashboard" className="mb-7 flex items-center gap-3 px-2">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-amber-600 shadow-glow">
          <span className="font-mono text-lg font-black text-black">X</span>
        </div>
        <div className="leading-tight">
          <p className="text-[15px] font-bold tracking-wide text-white">
            XUE <span className="text-gradient-gold">TRADING</span>
          </p>
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted">AI Autonomous</p>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="relative">
              {active && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-0 rounded-xl bg-white/[0.06] ring-1 ring-white/10"
                  transition={{ type: "spring", stiffness: 400, damping: 32 }}
                />
              )}
              <span
                className={cn(
                  "relative z-10 flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                  active ? "text-white" : "text-muted hover:text-white"
                )}
              >
                <Icon className={cn("h-[18px] w-[18px]", active && "text-brand")} />
                {item.label}
                {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand shadow-glow" />}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 rounded-xl border border-white/[0.06] bg-gradient-to-br from-accent-violet/10 to-accent-cyan/5 p-3">
        <p className="text-[11px] font-semibold text-white">AI Agent Center</p>
        <p className="mt-0.5 text-[11px] text-muted">8 / 8 agents online · autonomous</p>
        <Link href="/headquarters" className="mt-2 inline-flex text-[11px] font-semibold text-brand hover:underline">
          Manage & Configure →
        </Link>
      </div>
    </aside>
  );
}
