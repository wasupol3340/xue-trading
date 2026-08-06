"use client";

import { useEffect, useState } from "react";
import { Eye, Brain } from "lucide-react";
import { api } from "@/lib/api";

/**
 * Shows Brain OS's current life-stage on any "opinion" page (Journal, Report, …).
 * While observing, it makes explicit that what's below is DATA BEING GATHERED — Brain OS
 * is not yet asserting advice. Once advising, it flips to a calm "awake" note.
 */
export function BrainModeBanner() {
  const [s, setS] = useState<any>(null);

  useEffect(() => {
    api.brainOs().then(setS).catch(() => setS(null));
  }, []);

  if (!s) return null;
  const observing = s.mode === "observing";
  const c = observing ? "#38bdf8" : "#22c55e";

  return (
    <div className="glass mb-5 flex flex-wrap items-center gap-3 p-3.5" style={{ borderColor: `${c}33` }}>
      {observing ? <Eye className="h-4 w-4 shrink-0" style={{ color: c }} />
                 : <Brain className="h-4 w-4 shrink-0" style={{ color: c }} />}
      <span className="text-[13px] text-white/85">
        {observing ? (
          <>
            <b style={{ color: c }}>Brain OS: โหมดศึกษาเงียบ</b> — กำลังสังเกตและสะสมข้อมูล
            (<span className="font-mono">{s.trades_observed}/{s.activation_trades}</span> ไม้)
            ข้างล่างคือ “สิ่งที่จดไว้” ยังไม่ใช่คำแนะนำ · อีก {s.remaining} ไม้จะเริ่มออกความเห็น
          </>
        ) : (
          <>
            <b style={{ color: c }}>Brain OS: ตื่นแล้ว</b> — ศึกษาครบ {s.trades_observed} ไม้
            เริ่มออกความเห็นบนหลักฐานจริงได้
          </>
        )}
      </span>
      <a href="/brain-os" className="ml-auto text-[11px] text-muted underline hover:text-white">ดูสถานะ Brain OS</a>
    </div>
  );
}
