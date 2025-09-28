export type UUID = string;
import type { Dataset, DatasetTemplate, DatasetCreatePayload } from "@/types/database";


const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:4000"; 

function authHeaders() {
    const t = localStorage.getItem("access_token") ||
    localStorage.getItem("token");
    return t ? { Authorization: `Bearer ${t}` } : {};
}
async function http<T>(path: string, init?: RequestInit): Promise<T> {
    const res = await fetch(`${API_BASE}${path}`, {
        ...init,
        headers: {
            "Content-Type": "application/json",
            ...authHeaders(),
            ...(init?.headers || {}),
        },
        credentials: "include",
    });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
    }
    return (await res.json()) as T;
}
    // ---------------- Templates ----------------
export function listTemplates() {
    return http<{ data: DatasetTemplate[] }>(`/api/database-templates`);
}
    // ---------------- Datasets -----------------
export function listDatasets(activation_id: number) {
    const q = new URLSearchParams({ activation_id:
    String(activation_id) }).toString();
    return http<{ data: Dataset[] }>(`/api/database?${q}`);
}
export function createDataset(payload: DatasetCreatePayload) {
    return http<{ success: boolean; data: Dataset }>(`/api/database`, {
        method: "POST",
        body: JSON.stringify(payload),
    });
}