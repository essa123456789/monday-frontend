import { clearSession, getSession, tryRefresh } from "./auth";
import { clientId } from "./realtime";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

let refreshPromise: Promise<string | null> | null = null;

async function request<T>(
  path: string,
  options: RequestInit = {},
  retried = false,
  asBlob = false
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  const session = getSession();
  if (session) {
    headers["Authorization"] = `Bearer ${session.access}`;
  }
  headers["X-Client-Id"] = clientId;

  const res = await fetch(`${BASE}${path}`, { ...options, headers });

  if (res.status === 401 && session && !retried) {
    // Single-flight token refresh, then retry the request once
    refreshPromise = refreshPromise ?? tryRefresh();
    const newAccess = await refreshPromise;
    refreshPromise = null;
    if (newAccess) {
      return request<T>(path, options, true, asBlob);
    }
    clearSession();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${body.slice(0, 200)}`);
  }
  if (res.status === 204) return undefined as T;
  return (asBlob ? res.blob() : res.json()) as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  /** Fetch a binary response (file downloads) with the usual auth + refresh. */
  getBlob: (path: string) => request<Blob>(path, {}, false, true),
  post: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "POST", body: JSON.stringify(data) }),
  postForm: <T>(path: string, data: FormData) =>
    request<T>(path, { method: "POST", body: data }),
  patch: <T>(path: string, data: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(data) }),
  patchForm: <T>(path: string, data: FormData) =>
    request<T>(path, { method: "PATCH", body: data }),
  delete: (path: string) => request<void>(path, { method: "DELETE" }),
};
