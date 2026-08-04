"use client";

import { motion } from "framer-motion";

export function PageHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-5 flex flex-wrap items-end justify-between gap-3"
    >
      <div>
        <h1 className="text-xl font-bold text-white lg:text-2xl">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </motion.div>
  );
}
