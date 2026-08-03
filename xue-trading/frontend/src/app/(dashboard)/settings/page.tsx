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
      <PageHeader title="Settings" subtitle="Account, MT5 bridge, risk limits and autonomous execution controls." action={<button className="btn-primary">Save Changes</button>} />

      <div className="grid gap-5 lg:grid-cols-2">
        <Section icon={<User className="h-5 w-5" />} title="Account" desc="Profile & security">
          <div className="grid gap-4">
            <Field label="Display Name" value="XUE Master" />
            <Field label="Email" value="master@xuetrading.ai" />
            <Field label="Password" placeholder="••••••••" />
          </div>
        </Section>

        <Section icon={<Server className="h-5 w-5" />} title="MetaTrader 5 Connection" desc="Broker bridge via MetaTrader5 Python API">
          <div className="grid gap-4">
            <Field label="Login" value="51234567" />
            <Field label="Server" value="MetaQuotes-Demo" />
            <Field label="Password" placeholder="••••••••" />
            <div className="flex items-center gap-2 rounded-xl border border-accent-green/20 bg-accent-green/5 px-3 py-2 text-xs text-accent-green">
              <Wifi className="h-4 w-4" /> Connected · latency 41ms
            </div>
          </div>
        </Section>

        <Section icon={<ShieldAlert className="h-5 w-5" />} title="Risk Management" desc="Hard limits enforced by Risk AI">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Risk per Trade (%)" value="5" />
            <Field label="Max Drawdown (%)" value="20" />
            <Field label="Daily Loss Limit (%)" value="8" />
            <Field label="Weekly Loss Limit (%)" value="15" />
            <Field label="Max Exposure (lots)" value="1.0" />
            <Field label="Magic Number" value="20260803" />
          </div>
        </Section>

        <Section icon={<Bot className="h-5 w-5" />} title="Autonomous Execution" desc="AI acts without confirmation">
          <div className="space-y-4">
            <Row label="Auto Trading" desc="AI opens & closes trades automatically" on={auto} onClick={() => setAuto(!auto)} />
            <Row label="Trailing Stop" desc="Trail SL as trade moves in profit" on={trailing} onClick={() => setTrailing(!trailing)} />
            <Row label="News Filter" desc="Pause execution around high-impact news" on={news} onClick={() => setNews(!news)} />
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
