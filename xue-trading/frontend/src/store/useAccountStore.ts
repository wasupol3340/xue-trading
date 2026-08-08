"use client";

import { create } from "zustand";
import { api } from "@/lib/api";

export type Account = {
  id: number;
  user_id: number | null;
  name: string;
  broker: string;      // mt5 / binance
  asset: string;       // gold / crypto / oil / forex
  market: string;      // XAUUSD.sc / BTCUSDT
  status: string;      // active / paused
  created_at?: string;
};

const KEY = "xue_account";

interface AccountState {
  accounts: Account[];
  currentId: number | null;
  loading: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  setCurrent: (id: number) => void;
}

export const useAccountStore = create<AccountState>((set, get) => ({
  accounts: [],
  currentId: null,
  loading: false,
  loaded: false,

  load: async () => {
    if (get().loading) return;
    set({ loading: true });
    try {
      const r = await api.accounts();
      const accs: Account[] = r?.accounts || [];
      // เลือกบัญชีปัจจุบัน: ที่เคยเลือกไว้ (localStorage) > default จาก backend > ตัวแรก
      const saved = typeof window !== "undefined" ? Number(localStorage.getItem(KEY)) : NaN;
      let cur = get().currentId;
      if (saved && accs.some((a) => a.id === saved)) cur = saved;
      if (!cur || !accs.some((a) => a.id === cur)) cur = r?.default_id || accs[0]?.id || null;
      set({ accounts: accs, currentId: cur, loading: false, loaded: true });
    } catch {
      set({ loading: false, loaded: true });
    }
  },

  setCurrent: (id) => {
    if (typeof window !== "undefined") localStorage.setItem(KEY, String(id));
    set({ currentId: id });
  },
}));
