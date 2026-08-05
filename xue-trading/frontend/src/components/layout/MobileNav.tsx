"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { NAV } from "@/lib/nav";
import { cn } from "@/lib/utils";

// ปุ่มเมนู ☰ + ลิ้นชักเมนู สำหรับจอมือถือ (ซ่อนบนจอใหญ่ที่มี Sidebar อยู่แล้ว)
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="เปิดเมนู"
        className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-white transition-colors hover:bg-white/[0.06] lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", stiffness: 380, damping: 38 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[270px] flex-col border-r border-white/[0.06] bg-bg-soft px-3 py-5 lg:hidden"
            >
              <div className="mb-6 flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-amber-600 shadow-glow">
                    <span className="font-mono text-base font-black text-black">X</span>
                  </div>
                  <p className="text-[14px] font-bold tracking-wide text-white">
                    XUE <span className="text-gradient-gold">TRADING</span>
                  </p>
                </div>
                <button onClick={() => setOpen(false)} aria-label="ปิดเมนู" className="rounded-lg p-1.5 text-muted hover:text-white">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <nav className="flex flex-1 flex-col gap-1 overflow-y-auto">
                {NAV.map((item) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                        active ? "bg-white/[0.06] text-white ring-1 ring-white/10" : "text-muted hover:text-white"
                      )}
                    >
                      <Icon className={cn("h-[18px] w-[18px]", active && "text-brand")} />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
