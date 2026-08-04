"use client";

import { useRouter } from "next/navigation";
import { Bell, Search, Wifi, WifiOff, Server, LogOut } from "lucide-react";
import { useTradingStore } from "@/store/useTradingStore";
import { useAuthStore } from "@/store/useAuthStore";

export function Topbar() {
  const router = useRouter();
  const conn = useTradingStore((s) => s.connection);
  const isLive = useTradingStore((s) => s.isLive);
  const logout = useAuthStore((s) => s.logout);

  const connected = conn.mt5;

  function onLogout() {
    logout();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-white/[0.06] bg-bg/70 px-5 backdrop-blur-xl">
      <div className="hidden items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2 md:flex">
        <Search className="h-4 w-4 text-muted" />
        <input
          placeholder="ค้นหาสัญลักษณ์ AI กลยุทธ์…"
          className="w-64 bg-transparent text-sm text-white placeholder:text-muted-soft focus:outline-none"
        />
      </div>

      <div className="ml-auto flex items-center gap-3">
        <span
          className={`hidden rounded-xl border px-2.5 py-1.5 text-[11px] font-semibold sm:inline-flex ${
            isLive ? "border-accent-green/20 bg-accent-green/10 text-accent-green" : "border-white/10 bg-white/[0.03] text-muted"
          }`}
        >
          {isLive ? "ข้อมูลสด" : "ข้อมูลทดลอง"}
        </span>

        <div
          className={`hidden items-center gap-2 rounded-xl border px-3 py-1.5 sm:flex ${
            connected ? "border-accent-green/20 bg-accent-green/10" : "border-accent-red/20 bg-accent-red/10"
          }`}
        >
          {connected ? (
            <>
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-green opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-green" />
              </span>
              <Wifi className="h-3.5 w-3.5 text-accent-green" />
              <span className="text-xs font-medium text-accent-green">MT5 เชื่อมต่อแล้ว</span>
            </>
          ) : (
            <>
              <WifiOff className="h-3.5 w-3.5 text-accent-red" />
              <span className="text-xs font-medium text-accent-red">MT5 ออฟไลน์</span>
            </>
          )}
        </div>

        <div className="hidden items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 lg:flex">
          <Server className="h-3.5 w-3.5 text-muted" />
          <span className="text-xs text-muted">{conn.server}</span>
        </div>

        <button className="relative rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-muted transition-colors hover:text-white">
          <Bell className="h-4 w-4" />
          <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand" />
        </button>

        <div className="flex items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] py-1.5 pl-1.5 pr-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-violet to-accent-cyan text-sm font-bold text-white">
            X
          </div>
          <div className="hidden leading-tight sm:block">
            <p className="text-xs font-semibold text-white">XUE Master</p>
            <p className="text-[10px] text-muted">CEO &amp; ผู้ก่อตั้ง</p>
          </div>
          <button onClick={onLogout} title="ออกจากระบบ" className="ml-1 rounded-lg p-1.5 text-muted transition-colors hover:text-accent-red">
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
