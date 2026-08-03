"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { isBackendConfigured } from "@/lib/api";
import { useBackendSync } from "@/hooks/useBackendSync";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { authed, init } = useAuthStore();
  const [ready, setReady] = useState(false);

  useBackendSync();

  useEffect(() => {
    init();
    setReady(true);
  }, [init]);

  useEffect(() => {
    if (ready && isBackendConfigured() && !authed) {
      router.replace("/login");
    }
  }, [ready, authed, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/10 border-t-brand" />
      </div>
    );
  }

  if (isBackendConfigured() && !authed) return null;

  return <>{children}</>;
}
