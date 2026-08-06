"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown } from "lucide-react";
import { NAV_GROUPS, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";

function Item({ item, active, indent }: { item: NavItem; active: boolean; indent?: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition-colors",
        indent && "pl-4",
        active ? "bg-white/[0.06] text-white ring-1 ring-white/10" : "text-muted hover:text-white"
      )}
    >
      <Icon className={cn("h-[18px] w-[18px]", active && "text-brand")} />
      {item.label}
      {active && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-brand shadow-glow" />}
    </Link>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const activeGroup = NAV_GROUPS.findIndex((g) => g.items.some((i) => i.href === pathname));
  const [open, setOpen] = useState<Record<number, boolean>>({});

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
          <p className="text-[10px] uppercase tracking-[0.2em] text-muted">AI อัตโนมัติ</p>
        </div>
      </Link>

      <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto">
        {NAV_GROUPS.map((group, gi) => {
          if (group.label === null) {
            return (
              <div key={`top-${gi}`} className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <Item key={item.href} item={item} active={pathname === item.href} />
                ))}
              </div>
            );
          }
          const GroupIcon = group.icon;
          const expanded = open[gi] ?? gi === activeGroup;
          return (
            <div key={group.label} className="mt-1.5">
              <button
                onClick={() => setOpen((o) => ({ ...o, [gi]: !expanded }))}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-muted/80 transition-colors hover:text-white"
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
                      {group.items.map((item) => (
                        <Item key={item.href} item={item} active={pathname === item.href} indent />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </nav>

      <div className="mt-4 rounded-xl border border-white/[0.06] bg-gradient-to-br from-accent-violet/10 to-accent-cyan/5 p-3">
        <p className="text-[11px] font-semibold text-white">ศูนย์ควบคุม AI</p>
        <p className="mt-0.5 text-[11px] text-muted">8 / 8 เอเจนต์ออนไลน์ · อัตโนมัติ</p>
        <Link href="/headquarters" className="mt-2 inline-flex text-[11px] font-semibold text-brand hover:underline">
          จัดการ &amp; ตั้งค่า →
        </Link>
      </div>
    </aside>
  );
}
