import { queryClient } from "./queryClient";

const API_BASE = "/api";

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(body.message || res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export const api = {
  tweets: {
    list: (params?: { search?: string; tag?: string }) => {
      const qs = new URLSearchParams();
      if (params?.search) qs.set("search", params.search);
      if (params?.tag) qs.set("tag", params.tag);
      const query = qs.toString();
      return fetchJSON<any[]>(`/tweets${query ? `?${query}` : ""}`);
    },
    get: (id: string) => fetchJSON<any>(`/tweets/${id}`),
    create: (data: any) => fetchJSON<any>("/tweets", { method: "POST", body: JSON.stringify(data) }),
    bulkCreate: (tweets: any[]) => fetchJSON<any>("/tweets/bulk", { method: "POST", body: JSON.stringify({ tweets }) }),
    delete: (id: string) => fetchJSON<void>(`/tweets/${id}`, { method: "DELETE" }),
  },
  stats: () => fetchJSON<any>("/stats"),
  graph: () => fetchJSON<any>("/graph"),
  syncLogs: () => fetchJSON<any[]>("/sync-logs"),
  settings: {
    get: () => fetchJSON<any>("/settings"),
    update: (data: any) => fetchJSON<any>("/settings", { method: "PUT", body: JSON.stringify(data) }),
  },
};
