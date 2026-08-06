const API = process.env.NEXT_PUBLIC_API_URL || "";

export const isBackendConfigured = () => !!API;

const TOKEN_KEY = "xue_access";
const REFRESH_KEY = "xue_refresh";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}
export function setTokens(access: string, refresh?: string) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, access);
  if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
}
export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

async function tryRefresh(): Promise<boolean> {
  const refresh = typeof window !== "undefined" ? localStorage.getItem(REFRESH_KEY) : null;
  if (!refresh) return false;
  try {
    const res = await fetch(`${API}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "true" },
      body: JSON.stringify({ refresh_token: refresh }),
    });
    if (!res.ok) return false;
    const data = await res.json();
    setTokens(data.access_token);
    return true;
  } catch {
    return false;
  }
}

async function request<T>(path: string, opts: RequestInit = {}, retry = true): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API}/api${path}`, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers || {}),
    },
  });
  if (res.status === 401 && retry && (await tryRefresh())) {
    return request<T>(path, opts, false);
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail || `Request failed: ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ access_token: string; refresh_token: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  me: () => request("/auth/me"),

  status: () => request<any>("/trading/status"),
  account: () => request<any>("/trading/account"),
  positions: () => request<any[]>("/trading/positions"),
  history: () => request<any>("/trading/history"),
  agents: () => request<any[]>("/agents"),
  brains: () => request<any[]>("/agents/brains"),
  reviews: () => request<any[]>("/agents/reviews"),
  agentsLive: () => request<any[]>("/agents/live"),
  experience: (limit = 60) => request<any>(`/agents/experience?limit=${limit}`),
  boardroom: () => request<any>("/agents/boardroom"),
  boardroomRun: () => request<any>("/agents/boardroom/run", { method: "POST" }),
  decision: () => request<any>("/agents/decision"),
  strategies: () => request<any[]>("/strategies"),
  news: () => request<any[]>("/news"),

  startEngine: () => request("/trading/start", { method: "POST" }),
  stopEngine: (flatten = false) => request(`/trading/stop?flatten=${flatten}`, { method: "POST" }),
  panic: () => request("/trading/panic", { method: "POST" }),
};

export const WS_URL = process.env.NEXT_PUBLIC_WS_URL || "";
