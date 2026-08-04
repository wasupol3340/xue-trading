"use client";

import { create } from "zustand";
import { api, getToken, setTokens, clearTokens, isBackendConfigured } from "@/lib/api";

interface AuthState {
  authed: boolean;
  loading: boolean;
  error: string;
  init: () => void;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  authed: false,
  loading: false,
  error: "",

  // In demo mode (no backend) the app is open; with a backend, a token is required.
  init: () => set({ authed: !isBackendConfigured() || !!getToken() }),

  login: async (email, password) => {
    set({ loading: true, error: "" });
    // Demo mode: no backend to authenticate against — let the user in.
    if (!isBackendConfigured()) {
      set({ authed: true, loading: false });
      return true;
    }
    try {
      const res = await api.login(email, password);
      setTokens(res.access_token, res.refresh_token);
      set({ authed: true, loading: false });
      return true;
    } catch (e: any) {
      set({ loading: false, error: e?.message || "เข้าสู่ระบบไม่สำเร็จ" });
      return false;
    }
  },

  logout: () => {
    clearTokens();
    set({ authed: false });
  },
}));
