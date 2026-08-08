"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { AgentLiveCard, AgentLive } from "@/components/agents/AgentLiveCard";
import { api } from "@/lib/api";
import { useAccountStore } from "@/store/useAccountStore";

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentLive[]>([]);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const currentId = useAccountStore((s) => s.currentId);
  const accounts = useAccountStore((s) => s.accounts);
  const loadAccounts = useAccountStore((s) => s.load);

  useEffect(() => { loadAccounts(); }, [loadAccounts]);
  useEffect(() => {
    let alive = true;
    const load = async () => {
      try {
        const rows = (await api.agentsLive(currentId || undefined)) as AgentLive[];
        if (!alive) return;
        setAgents(rows);
        setErr("");
      } catch (e: any) {
        if (alive) setErr(e?.message || "โหลดข้อมูลไม่ได้");
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    const id = setInterval(load, 8000);
    return () => { alive = false; clearInterval(id); };
  }, [currentId]);

  const online = agents.length;
  const acc = accounts.find((a) => a.id === currentId);
  const assetLabel = acc ? (acc.asset === "crypto" ? "คริปโต" : acc.asset === "gold" ? "ทอง" : acc.asset) : "";

  return (
    <div>
      <PageHeader
        title="ทีม AI"
        subtitle={`ทีม AI ของบัญชี "${acc?.name || "ที่เลือก"}" — ${assetLabel ? `ทีม${assetLabel}แยกจากทีมอื่น ไม่ปนกัน · ` : ""}เห็นว่าตอนนี้แต่ละตัวอ่านตลาด/ทำงานอะไรอยู่ (อัปเดตทุก 8 วิ)`}
        action={
          <span className="chip border-accent-green/30 bg-accent-green/10 text-accent-green">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-accent-green" /> {online}/8 ออนไลน์{assetLabel ? ` · ทีม${assetLabel}` : ""}
          </span>
        }
      />

      {err && (
        <div className="glass mb-5 flex items-center gap-2 p-4 text-sm" style={{ borderColor: "#ef444433" }}>
          <AlertTriangle className="h-4 w-4 text-accent-red" />
          <span className="text-muted">เชื่อมต่อ backend ไม่ได้: {err}</span>
        </div>
      )}
      {loading && !agents.length && (
        <div className="glass p-6 text-center text-muted">กำลังโหลดแดชบอร์ด AI…</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {agents.map((a, i) => (
          <AgentLiveCard key={a.id} agent={a} index={i} />
        ))}
      </div>
    </div>
  );
}
