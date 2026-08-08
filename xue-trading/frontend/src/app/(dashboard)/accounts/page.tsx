"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Wallet, Plus, RefreshCw, AlertTriangle, CheckCircle2, Brain } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { api } from "@/lib/api";
import { useAccountStore } from "@/store/useAccountStore";

const ASSET_ICON: Record<string, string> = { gold: "🥇", crypto: "₿", oil: "🛢️", forex: "💱" };
const ASSET_LABEL: Record<string, string> = { gold: "ทอง", crypto: "คริปโต", oil: "น้ำมัน", forex: "คู่เงิน" };
const ASSETS = ["gold", "crypto", "oil", "forex"];
const BROKERS = ["mt5", "binance-th", "binance-spot", "binance-futures"];
// ตัวอย่างคู่เทรดตามโบรก (ผู้ใช้พิมพ์เองได้)
const PAIR_HINT: Record<string, string> = {
  "binance-th": "Binance TH (บาท, spot) — เช่น BTCTHB, ETHTHB, USDTTHB",
  "binance-spot": "Binance global (spot) — เช่น BTCUSDT, ETHUSDT",
  "binance-futures": "Binance global (futures USDT-M) — เช่น BTCUSDT, ETHUSDT",
  mt5: "เช่น XAUUSD.sc",
};

export default function AccountsPage() {
  const { accounts, currentId, load, setCurrent } = useAccountStore();
  const [err, setErr] = useState("");
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: "", broker: "binance-th", asset: "crypto", market: "" });
  const [busy, setBusy] = useState(false);
  const [summaries, setSummaries] = useState<Record<number, any>>({});

  useEffect(() => {
    load();
  }, [load]);

  // ดึงสรุปสด (ยอด/PnL) ของแต่ละบัญชี — MT5 หรือ Binance ตามโบรก
  useEffect(() => {
    let alive = true;
    accounts.forEach(async (a) => {
      try {
        const s = await api.accountSummary(a.id);
        if (alive) setSummaries((prev) => ({ ...prev, [a.id]: s }));
      } catch {
        /* ignore */
      }
    });
    return () => {
      alive = false;
    };
  }, [accounts]);

  const submit = async () => {
    if (!form.name.trim() || !form.market.trim()) {
      setErr("กรอกชื่อบัญชีและสัญลักษณ์ (market) ก่อน");
      return;
    }
    setBusy(true);
    setErr("");
    try {
      const r = await api.accountsCreate(form);
      if (r?.ok === false) throw new Error(r?.error || "เพิ่มบัญชีไม่สำเร็จ");
      setForm({ name: "", broker: "binance", asset: "crypto", market: "" });
      setAdding(false);
      await load();
    } catch (e: any) {
      setErr(e?.message || "เพิ่มบัญชีไม่สำเร็จ");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="บัญชีทั้งหมด"
        subtitle="เชื่อมได้หลายบัญชีในที่เดียว — แต่ละบัญชีมีเงิน/ไม้แยกกัน แต่ใช้สมองบริหารกลางร่วมกัน (Brain OS/CEO/เป้าหมาย)"
        action={
          <div className="flex gap-2">
            <button onClick={() => setAdding((v) => !v)} className="chip border-brand/30 bg-brand/10 text-brand hover:bg-brand/20">
              <Plus className="h-3.5 w-3.5" /> เพิ่มบัญชี
            </button>
            <button onClick={load} className="chip border-white/10 bg-white/[0.03] text-muted hover:text-white">
              <RefreshCw className="h-3.5 w-3.5" /> รีเฟรช
            </button>
          </div>
        }
      />

      {err && (
        <div className="glass mb-5 flex items-center gap-2 p-4 text-sm" style={{ borderColor: "#ef444433" }}>
          <AlertTriangle className="h-4 w-4 text-accent-red" />
          <span className="text-muted">{err}</span>
        </div>
      )}

      {/* add-account form */}
      {adding && (
        <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="glass mb-5 p-4">
          <h3 className="panel-title mb-3">เพิ่มบัญชีใหม่</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="ชื่อบัญชี">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="เช่น คริปโต-Binance" className="inp" />
            </Field>
            <Field label="โบรกเกอร์">
              <select value={form.broker} onChange={(e) => setForm({ ...form, broker: e.target.value })} className="inp">
                {BROKERS.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </Field>
            <Field label="สินทรัพย์ (สมองการเทรด)">
              <select value={form.asset} onChange={(e) => setForm({ ...form, asset: e.target.value })} className="inp">
                {ASSETS.map((a) => <option key={a} value={a}>{ASSET_LABEL[a]} ({a})</option>)}
              </select>
            </Field>
            <Field label="คู่เทรด (symbol)">
              <input value={form.market} onChange={(e) => setForm({ ...form, market: e.target.value })}
                placeholder="เช่น BTCUSDT" className="inp" />
            </Field>
          </div>
          <p className="mt-2 text-[11px] text-muted">{PAIR_HINT[form.broker] || ""} · แสดงผลตามสกุลของคู่ (ลงท้าย USDT→USDT, THB→บาท)</p>
          <div className="mt-3 flex items-center gap-2">
            <button onClick={submit} disabled={busy} className="chip border-accent-green/30 bg-accent-green/10 text-accent-green disabled:opacity-50">
              {busy ? "กำลังเพิ่ม…" : "บันทึกบัญชี"}
            </button>
            <button onClick={() => setAdding(false)} className="chip border-white/10 bg-white/[0.03] text-muted hover:text-white">ยกเลิก</button>
            <span className="text-[11px] text-muted">* เพิ่มบัญชีที่นี่คือ “จดทะเบียน” ไว้ก่อน — การเชื่อม API key จริงจะทำในเฟสถัดไป</span>
          </div>
        </motion.div>
      )}

      {/* account cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {accounts.map((a, i) => {
          const active = a.id === currentId;
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i * 0.05, 0.4) }}
              className="glass p-4"
              style={{ borderColor: active ? "#7c5cff55" : "#ffffff12" }}
            >
              <div className="flex items-start gap-3">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.04] text-2xl leading-none">
                  {ASSET_ICON[a.asset] || "📊"}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-base font-bold text-white">{a.name}</span>
                    {active && <span className="chip border-accent-violet/40 bg-accent-violet/10 text-[9px] font-bold text-accent-violet">กำลังดู</span>}
                  </div>
                  <p className="mt-0.5 text-[11px] text-muted">
                    {ASSET_LABEL[a.asset] || a.asset} · {a.broker} · {a.market}
                  </p>
                </div>
                <span className={`chip text-[10px] ${a.status === "active" ? "border-accent-green/30 bg-accent-green/10 text-accent-green" : "text-muted"}`}>
                  {a.status === "active" ? "ทำงานอยู่" : a.status}
                </span>
              </div>
              {summaries[a.id] && <AccountSummaryLine s={summaries[a.id]} />}

              {a.broker?.startsWith("binance") && <CryptoSettings accountId={a.id} />}

              <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-muted">สร้างเมื่อ {a.created_at || "—"}</span>
                {active ? (
                  <span className="inline-flex items-center gap-1 text-[11px] text-accent-green"><CheckCircle2 className="h-3.5 w-3.5" /> บัญชีปัจจุบัน</span>
                ) : (
                  <button onClick={() => setCurrent(a.id)} className="chip border-white/10 bg-white/[0.03] text-[11px] text-muted hover:text-white">
                    ดูบัญชีนี้
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}

        {accounts.length === 0 && (
          <div className="glass col-span-full p-8 text-center">
            <Wallet className="mx-auto mb-3 h-10 w-10 text-muted" />
            <p className="text-sm text-white">ยังไม่มีบัญชี — กด “เพิ่มบัญชี” เพื่อเริ่ม</p>
          </div>
        )}
      </div>

      {/* shared brain note */}
      <div className="glass mt-5 flex items-start gap-3 p-4">
        <Brain className="mt-0.5 h-5 w-5 shrink-0 text-accent-violet" />
        <div className="text-[12.5px] text-white/80">
          <p className="font-semibold text-white">โครงสร้างสมอง</p>
          <p className="mt-1 text-muted">
            แต่ละสินทรัพย์มี “สมองการเทรด” ของตัวเอง (ทอง/คริปโต/น้ำมัน/คู่เงิน) เรียนรู้การเข้าออเดอร์แยกกันไม่ปนกัน ·
            ส่วน <span className="text-white/90">Brain OS, CEO, คณะกรรมการ, เป้าหมายบริษัท, สมุดบันทึกสมอง</span> ใช้ร่วมกันทั้งบริษัท มองรวมทุกบัญชี
          </p>
        </div>
      </div>

      <style jsx>{`
        :global(.inp) {
          width: 100%;
          border-radius: 0.6rem;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          padding: 0.5rem 0.7rem;
          font-size: 0.85rem;
          color: #fff;
        }
        :global(.inp:focus) {
          outline: none;
          border-color: rgba(124, 92, 255, 0.5);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-muted">{label}</span>
      {children}
    </label>
  );
}

const n2 = (v: any) => (v === null || v === undefined ? "—" : Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));

// สรุปสด บนการ์ดบัญชี — รองรับทั้ง MT5 (ทอง) และ Binance (คริปโต)
function AccountSummaryLine({ s }: { s: any }) {
  if (s?.kind === "binance") {
    if (!s.connected) {
      return (
        <div className="mt-3 rounded-lg border border-white/[0.06] bg-black/20 p-2.5 text-[11px]">
          <span className="text-accent-red">ยังเชื่อม Binance ไม่ได้</span>
          <span className="block text-muted">{s.error || "ตรวจสอบ API key ใน .env"}</span>
        </div>
      );
    }
    const q = s.quote || "USDT";
    return (
      <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-white/[0.06] bg-black/20 p-2.5 text-center">
        <Cell label={`ยอด (${q})`} value={n2(s.balance)} tone="text-white" />
        <Cell label="กำไรลอยตัว" value={`${(s.unrealized_pnl ?? 0) >= 0 ? "+" : ""}${n2(s.unrealized_pnl)}`}
          tone={(s.unrealized_pnl ?? 0) >= 0 ? "text-accent-green" : "text-accent-red"} />
        <Cell label={`ราคา ${s.symbol}`} value={n2(s.price)} tone="text-accent-cyan" />
        <div className="col-span-3 mt-1 text-[10px] text-muted">
          {s.testnet ? "🧪 Testnet · " : ""}โพซิชันเปิด {s.positions?.length || 0} รายการ {s.positions?.length ? `(${s.positions.map((p: any) => p.side).join(", ")})` : ""}
        </div>
      </div>
    );
  }
  // MT5 (บัญชีเซนต์)
  return (
    <div className="mt-3 grid grid-cols-3 gap-2 rounded-lg border border-white/[0.06] bg-black/20 p-2.5 text-center">
      <Cell label="ยอดเงิน" value={n2(s.balance)} tone="text-white" />
      <Cell label="กำไรเทรดจริง" value={`${(s.trade_realized ?? 0) >= 0 ? "+" : ""}${n2(s.trade_realized)}`}
        tone={(s.trade_realized ?? 0) >= 0 ? "text-accent-green" : "text-accent-red"} />
      <Cell label="วันนี้" value={`${(s.realized_today ?? 0) >= 0 ? "+" : ""}${n2(s.realized_today)}`}
        tone={(s.realized_today ?? 0) >= 0 ? "text-accent-green" : "text-accent-red"} />
      <div className="col-span-3 mt-1 text-[10px] text-muted">บัญชีเซนต์ · ตัวเลขดิบเท่า MT5</div>
    </div>
  );
}

function Cell({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div>
      <p className="text-[10px] text-muted">{label}</p>
      <p className={`font-mono text-sm font-bold ${tone}`}>{value}</p>
    </div>
  );
}

// ตั้งค่าเทรดคริปโตรายบัญชี (฿/ไม้, SL%, TP%, เปิด/ปิดเทรด) — ตั้งบนเว็บได้
function CryptoSettings({ accountId }: { accountId: number }) {
  const [open, setOpen] = useState(false);
  const [s, setS] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const loadS = async () => {
    try { setS(await api.accountSettings(accountId)); } catch { /* ignore */ }
  };
  useEffect(() => { if (open && !s) loadS(); /* eslint-disable-next-line */ }, [open]);

  const save = async (patch: any) => {
    setSaving(true); setMsg("");
    try {
      const r = await api.accountSettingsSet(accountId, patch);
      if (r?.ok === false) throw new Error(r?.error || "บันทึกไม่สำเร็จ");
      setS(r); setMsg("บันทึกแล้ว ✓");
    } catch (e: any) { setMsg(e?.message || "บันทึกไม่สำเร็จ"); }
    finally { setSaving(false); }
  };

  return (
    <div className="mt-3">
      <button onClick={() => setOpen((o) => !o)} className="text-[11px] text-accent-cyan hover:underline">
        {open ? "▾ ซ่อนตั้งค่าเทรด" : "▸ ตั้งค่าเทรด (฿/ไม้, SL/TP, เปิดเทรด)"}
      </button>
      {open && s && (
        <div className="mt-2 rounded-lg border border-white/[0.06] bg-black/20 p-3">
          <div className="grid grid-cols-3 gap-2">
            <NumField label="฿/ไม้ (ขั้นต่ำ 300)" value={s.trade_size_thb} min={s.min_notional_thb || 300}
              onSave={(v) => save({ trade_size_thb: v })} />
            <NumField label="SL %" value={s.sl_pct} onSave={(v) => save({ sl_pct: v })} />
            <NumField label="TP %" value={s.tp_pct} onSave={(v) => save({ tp_pct: v })} />
          </div>
          <div className="mt-3 flex items-center justify-between">
            <span className="text-[11px] text-muted">เปิดให้บัญชีนี้เทรดจริง</span>
            <button
              onClick={() => save({ trade_enabled: s.trade_enabled ? 0 : 1 })}
              disabled={saving}
              className={`chip text-[11px] ${s.trade_enabled ? "border-accent-green/30 bg-accent-green/10 text-accent-green" : "border-white/10 bg-white/[0.03] text-muted"}`}
            >
              {s.trade_enabled ? "เปิดอยู่ (กดเพื่อปิด)" : "ปิดอยู่ (กดเพื่อเปิด)"}
            </button>
          </div>
          {msg && <p className="mt-2 text-[10px] text-muted">{msg}</p>}
          <p className="mt-2 text-[10px] text-muted">
            * ต้องตั้ง <code>CRYPTO_TRADING_ENABLED=true</code> ใน .env ด้วย ระบบถึงจะเทรดจริง (สวิตช์ใหญ่)
          </p>
        </div>
      )}
    </div>
  );
}

function NumField({ label, value, min, onSave }: { label: string; value: number; min?: number; onSave: (v: number) => void }) {
  const [v, setV] = useState(String(value ?? ""));
  useEffect(() => { setV(String(value ?? "")); }, [value]);
  return (
    <label className="block">
      <span className="mb-1 block text-[10px] text-muted">{label}</span>
      <input
        type="number"
        value={v}
        min={min}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => { const num = parseFloat(v); if (!isNaN(num) && num !== value) onSave(num); }}
        className="w-full rounded-md border border-white/10 bg-white/[0.03] px-2 py-1 text-sm text-white focus:border-accent-violet/50 focus:outline-none"
      />
    </label>
  );
}
