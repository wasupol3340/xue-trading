"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Lock, Mail, ArrowRight, ShieldCheck, Loader2, Info } from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import { isBackendConfigured } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const { login, loading, error } = useAuthStore();
  const [email, setEmail] = useState("master@xuetrading.ai");
  const [password, setPassword] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const ok = await login(email, password);
    if (ok) router.push("/dashboard");
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div className="pointer-events-none absolute inset-0 grid-bg opacity-40" />
      <div className="pointer-events-none absolute -left-40 top-0 h-96 w-96 rounded-full bg-accent-violet/20 blur-[120px]" />
      <div className="pointer-events-none absolute -right-40 bottom-0 h-96 w-96 rounded-full bg-accent-cyan/20 blur-[120px]" />

      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="glass-strong relative z-10 w-full max-w-md p-8"
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-brand to-amber-600 shadow-glow">
            <span className="font-mono text-3xl font-black text-black">X</span>
          </div>
          <h1 className="text-2xl font-bold text-white">
            XUE <span className="text-gradient-gold">TRADING</span>
          </h1>
          <p className="mt-1 text-sm text-muted">แพลตฟอร์มเทรดอัตโนมัติด้วย AI</p>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">อีเมล</label>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 focus-within:border-accent-violet/50">
              <Mail className="h-4 w-4 text-muted" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent py-3 text-sm text-white placeholder:text-muted-soft focus:outline-none"
                placeholder="you@company.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wider text-muted">รหัสผ่าน</label>
            <div className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.03] px-3 focus-within:border-accent-violet/50">
              <Lock className="h-4 w-4 text-muted" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent py-3 text-sm text-white placeholder:text-muted-soft focus:outline-none"
                placeholder="••••••••"
                required={isBackendConfigured()}
              />
            </div>
          </div>

          {error && <p className="text-xs text-accent-red">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
            {loading ? "กำลังเข้าสู่ระบบ…" : "เข้าสู่ระบบ"}
          </button>
        </form>

        {!isBackendConfigured() && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-accent-cyan/20 bg-accent-cyan/5 p-3 text-[11px] text-muted">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-cyan" />
            โหมดทดลอง — ยังไม่ได้เชื่อมต่อ backend ล็อกอินด้วยอะไรก็ได้เพื่อสำรวจหน้าจอบนข้อมูลตัวอย่าง
          </div>
        )}

        <div className="mt-6 flex items-center justify-center gap-2 text-[11px] text-muted">
          <ShieldCheck className="h-3.5 w-3.5 text-accent-green" />
          ปลอดภัยด้วย JWT · หมุนเวียน Refresh token
        </div>
      </motion.div>
    </div>
  );
}
