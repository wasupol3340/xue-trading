"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Server, ShieldAlert, Bot, User, Wifi } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={`relative h-6 w-11 rounded-full transition-colors ${on ? "bg-accent-green/80" : "bg-white/10"}`}>
      <motion.span layout className="absolute top-0.5 h-5 w-5 rounded-full bg-white shadow" style={{ left: on ? 22 : 2 }} />
    </button>
  );
}

function Field({ label, value, placeholder }: { label: string; value?: string; placeholder?: string }) {
  return (
    <div>
      <label className="panel-title mb-1.5 block">{label}</label>
      <input defaultValue={value} placeholder={placeholder} className="w-full rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2.5 text-sm text-white placeholder:text-muted-soft focus:border-accent-violet/50 focus:outline-none" />
    </div>
  );
}

function Section({ icon, title, desc, children }: { icon: React.ReactNode; title: string; desc: string; children: React.ReactNode }) {
  return (
    <div className="glass p-5">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] text-accent-cyan">{icon}</div>
        <div>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <p className="text-[11px] text-muted">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [auto, setAuto] = useState(true);
  const [trailing, setTrailing] = useState(true);
  const [news, setNews] = useState(true);

  return (
    <div>
      <PageHeader title="ตั้งค่า" subtitle="บัญชี ตัวเชื่อม MT5 ขีดจำกัดความเสี่ยง และการควบคุมการเทรดอัตโนมัติ" action={<button className="btn-primary">บันทึกการเปลี่ยนแปลง</button>} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Section icon={<User className="h-5 w-5" />} title="บัญชี" desc="โปรไฟล์และความปลอดภัย">
          <div className="grid gap-4">
            <Field label="ชื่อที่แสดง" value="XUE Master" />
            <Field label="อีเมล" value="master@xuetrading.ai" />
            <Field label="รหัสผ่าน" placeholder="••••••••" />
          </div>
        </Section>

        <Section icon={<Server className="h-5 w-5" />} title="การเชื่อมต่อ MetaTrader 5" desc="ตัวเชื่อมโบรกเกอร์ผ่าน MetaTrader5 Python API">
          <div className="grid gap-4">
            <Field label="ล็อกอิน" value="51234567" />
            <Field label="เซิร์ฟเวอร์" value="MetaQuotes-Demo" />
            <Field label="รหัสผ่าน" placeholder="••••••••" />
            <div className="flex items-center gap-2 rounded-xl border border-accent-green/20 bg-accent-green/5 px-3 py-2 text-xs text-accent-green">
              <Wifi className="h-4 w-4" /> เชื่อมต่อแล้ว · ดีเลย์ 41ms
            </div>
          </div>
        </Section>

        <Section icon={<ShieldAlert className="h-5 w-5" />} title="การจัดการความเสี่ยง" desc="ขีดจำกัดที่บังคับใช้โดย Risk AI">
          <div className="grid grid-cols-2 gap-4">
            <Field label="ความเสี่ยงต่อไม้ (%)" value="5" />
            <Field label="Drawdown สูงสุด (%)" value="20" />
            <Field label="ขีดจำกัดขาดทุนรายวัน (%)" value="8" />
            <Field label="ขีดจำกัดขาดทุนรายสัปดาห์ (%)" value="15" />
            <Field label="ขนาดสถานะสูงสุด (ล็อต)" value="1.0" />
            <Field label="Magic Number" value="20260803" />
          </div>
        </Section>

        <Section icon={<Bot className="h-5 w-5" />} title="การเทรดอัตโนมัติ" desc="AI ทำงานโดยไม่ต้องยืนยัน">
          <div className="space-y-4">
            <Row label="เทรดอัตโนมัติ" desc="AI เปิดและปิดไม้โดยอัตโนมัติ" on={auto} onClick={() => setAuto(!auto)} />
            <Row label="Trailing Stop" desc="เลื่อน SL ตามเมื่อไม้มีกำไรมากขึ้น" on={trailing} onClick={() => setTrailing(!trailing)} />
            <Row label="ตัวกรองข่าว" desc="หยุดเทรดชั่วคราวรอบข่าวที่มีผลกระทบสูง" on={news} onClick={() => setNews(!news)} />
          </div>
        </Section>
      </div>
    </div>
  );
}

function Row({ label, desc, on, onClick }: { label: string; desc: string; on: boolean; onClick: () => void }) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
      <div>
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-[11px] text-muted">{desc}</p>
      </div>
      <Toggle on={on} onClick={onClick} />
    </div>
  );
}
