"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export function Panel({
  children,
  className,
  title,
  action,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
  delay?: number;
}) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] }}
      className={cn("glass p-4", className)}
    >
      {(title || action) && (
        <div className="mb-3 flex items-center justify-between">
          {title && <h3 className="panel-title">{title}</h3>}
          {action}
        </div>
      )}
      {children}
    </motion.section>
  );
}
