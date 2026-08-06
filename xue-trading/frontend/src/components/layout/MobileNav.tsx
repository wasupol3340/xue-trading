"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { NAV_GROUPS } from "@/lib/nav";
import { cn } from "@/lib/utils";

// ปุ่มเมนู ☰ + ลิ้นชักเมนู สำหรับจอมือถือ (ซ่อนบนจอใหญ่ที่มี Sidebar อยู่แล้ว)
//
// สำคัญ: ลิ้นชัก (overlay + drawer) เรนเดอร์ผ่าน React portal ไปที่ document.body
// เพราะ Topbar มี `backdrop-blur` (backdrop-filter) ซึ่งทำให้ element ลูกที่เป็น
// position:fixed ไปอ้างอิงกับกล่อง Topbar แทนทั้งจอ — เมนูเลยถูกบีบจนมองไม่เห็น.
// การ portal ออกไปนอก Topbar ทำให้ fixed กลับมาอ้างอิงทั้ง viewport ถูกต้อง.
export function MobileNav() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [groups, setGroups] = useState<Record<number, boolean>>({});
  const pathname = usePathname();
  const activeGroup = NAV_GROUPS.findIndex((g) => g.items.some((i) => i.href === pathname));

  useEffect(() => setMounted(true), []);

  // ล็อกไม่ให้พื้นหลังเลื่อนตอนเมนูเปิด
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const drawer = (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm lg:hidden"
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            className="fixed inset-y-0 left-0 z-[100] flex w-[270px] flex-col border-r border-white/[0.06] bg-bg-soft px-3 py-5 lg:hidden"
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

            <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
              {NAV_GROUPS.map((group, gi) => {
                const renderItem = (item: (typeof group.items)[number], indent?: boolean) => {
                  const active = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-medium transition-colors",
                        indent && "pl-4",
                        active ? "bg-white/[0.06] text-white ring-1 ring-white/10" : "text-muted hover:text-white"
                      )}
                    >
                      <Icon className={cn("h-[18px] w-[18px]", active && "text-brand")} />
                      {item.label}
                    </Link>
                  );
                };

                if (group.label === null) {
                  return (
                    <div key={`top-${gi}`} className="flex flex-col gap-0.5">
                      {group.items.map((item) => renderItem(item))}
                    </div>
                  );
                }
                const GroupIcon = group.icon;
                const expanded = groups[gi] ?? gi === activeGroup;
                return (
                  <div key={group.label} className="mt-1.5">
                    <button
                      onClick={() => setGroups((o) => ({ ...o, [gi]: !expanded }))}
                      className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-muted/80 hover:text-white"
                    >
                      {GroupIcon && <GroupIcon className="h-3.5 w-3.5" />}
                      <span>{group.label}</span>
                      <ChevronDown className={cn("ml-auto h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
                    </button>
                    <AnimatePresence initial={false}>
                      {expanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="flex flex-col gap-0.5 pt-0.5">
                            {group.items.map((item) => renderItem(item, true))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </nav>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="เปิดเมนู"
        className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-white transition-colors hover:bg-white/[0.06] lg:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mounted && createPortal(drawer, document.body)}
    </>
  );
}
