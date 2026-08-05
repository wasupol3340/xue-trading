"use client";

import { useLiveTicker } from "@/hooks/useLiveTicker";
import { PortfolioPanel } from "@/components/dashboard/PortfolioPanel";
import { EconomicNewsPanel } from "@/components/dashboard/EconomicNewsPanel";
import { SignalCards } from "@/components/dashboard/SignalCards";
import { TradeControls } from "@/components/dashboard/TradeControls";
import { MeetingTimeline } from "@/components/dashboard/MeetingTimeline";
import { LiveTechniqueBar } from "@/components/dashboard/LiveTechniqueBar";
import { CommitteePanel } from "@/components/dashboard/CommitteePanel";

export default function DashboardPage() {
  useLiveTicker();

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
      {/* CENTER — Technique learning + signals + controls */}
      <div className="order-1 flex min-w-0 flex-col gap-4">
        <LiveTechniqueBar />
        <CommitteePanel />
        <SignalCards />
        <TradeControls />
        <MeetingTimeline />
      </div>

      {/* RIGHT — Portfolio + news */}
      <div className="order-2 flex flex-col gap-4">
        <PortfolioPanel />
        <EconomicNewsPanel />
      </div>
    </div>
  );
}
