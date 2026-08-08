"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronDown, Check, Plus } from "lucide-react";
import { useAccountStore } from "@/store/useAccountStore";

// ไอคอนตามสินทรัพย์ (สมองการเทรดแต่ละตัว)
const ASSET_ICON: Record<string, string> = { gold: "🥇", crypto: "₿", oil: "🛢️", forex: "💱" };
const ASSET_LABEL: Record<string, string> = { gold: "ทอง", crypto: "คริปโต", oil: "น้ำมัน", forex: "คู่เงิน" };

export function AccountSwitcher() {
  const { accounts, currentId, load, setCurrent } = useAccountStore();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    load();
  }, [load]);

  if (!accounts.length) return null;
  const cur = accounts.find((a) => a.id === currentId) || accounts[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-sm transition-colors hover:border-white/15"
      >
        <span className="text-base leading-none">{ASSET_ICON[cur?.asset] || "📊"}</span>
        <span className="hidden font-semibold text-white sm:inline">{cur?.name}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-50 mt-2 w-64 rounded-xl border border-white/10 bg-[#0f1117] p-1.5 shadow-2xl">
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted">บัญชีที่เชื่อม</p>
            {accounts.map((a) => (
              <button
                key={a.id}
                onClick={() => {
                  setCurrent(a.id);
                  setOpen(false);
                }}
                className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition-colors hover:bg-white/[0.05]"
              >
                <span className="text-base leading-none">{ASSET_ICON[a.asset] || "📊"}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-white">{a.name}</span>
                  <span className="block text-[10px] text-muted">
                    {ASSET_LABEL[a.asset] || a.asset} · {a.broker} · {a.market}
                  </span>
                </span>
                {a.id === currentId && <Check className="h-4 w-4 shrink-0 text-accent-green" />}
              </button>
            ))}
            <div className="my-1 h-px bg-white/[0.06]" />
            <Link
              href="/accounts"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-2 py-2 text-sm text-muted transition-colors hover:bg-white/[0.05] hover:text-white"
            >
              <Plus className="h-4 w-4" /> จัดการ / เพิ่มบัญชี
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
