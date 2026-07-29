import type { Member } from "./types";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";
const STORAGE_KEY = "workboard_auth";

export interface AuthSession {
  access: string;
  refresh: string;
  member: Member;
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthSession) : null;
  } catch {
    return null;
  }
}

export function saveSession(session: AuthSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

/** Keep the cached member in the session in step with profile edits. */
export function updateSessionMember(member: Member) {
  const session = getSession();
  if (session) saveSession({ ...session, member });
}

async function authRequest(path: string, body: unknown): Promise<AuthSession> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      data.detail ??
      data.email ??
      data.name ??
      data.password ??
      "Something went wrong. Please try again.";
    throw new Error(Array.isArray(message) ? message[0] : String(message));
  }
  return data as AuthSession;
}

export async function login(email: string, password: string): Promise<AuthSession> {
  const session = await authRequest("/auth/login/", { email, password });
  saveSession(session);
  return session;
}

export async function register(
  name: string,
  email: string,
  password: string,
  inviteToken: string
): Promise<AuthSession> {
  const session = await authRequest("/auth/register/", {
    name,
    email,
    password,
    invite_token: inviteToken,
  });
  saveSession(session);
  return session;
}

export interface SignupResult {
  token: string;
  email: string;
  company: string;
}

/** Public self-serve signup: provisions a company + admin invite, returns the
 * invite token so the caller can continue to /register to set a password. */
export async function signup(companyName: string, email: string): Promise<SignupResult> {
  const res = await fetch(`${BASE}/auth/signup/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ company_name: companyName, email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.email ?? data.company_name ?? data.detail ?? "Something went wrong.";
    throw new Error(Array.isArray(message) ? message[0] : String(message));
  }
  return data as SignupResult;
}

export interface InviteInfo {
  valid: boolean;
  email?: string;
  workspace?: string;
  role?: string;
}

export async function fetchInviteInfo(token: string): Promise<InviteInfo> {
  try {
    const res = await fetch(`${BASE}/invites/info/?token=${encodeURIComponent(token)}`);
    if (!res.ok) return { valid: false };
    return (await res.json()) as InviteInfo;
  } catch {
    return { valid: false };
  }
}

/** Ask the server to email a password-reset link. Resolves to the server's
 * neutral confirmation message (it never reveals whether the email exists). */
export async function requestPasswordReset(email: string): Promise<string> {
  const res = await fetch(`${BASE}/auth/password-reset/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.email ?? data.detail ?? "Something went wrong. Please try again.";
    throw new Error(Array.isArray(message) ? message[0] : String(message));
  }
  return data.detail as string;
}

/** Complete a reset with the token from the email and a new password. */
export async function confirmPasswordReset(token: string, newPassword: string): Promise<string> {
  const res = await fetch(`${BASE}/auth/password-reset/confirm/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, new_password: newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.new_password ?? data.detail ?? "Something went wrong. Please try again.";
    throw new Error(Array.isArray(message) ? message[0] : String(message));
  }
  return data.detail as string;
}

export function logout() {
  clearSession();
  window.location.href = "/login";
}

/** Try to refresh the access token; returns the new token or null. */
export async function tryRefresh(): Promise<string | null> {
  const session = getSession();
  if (!session) return null;
  try {
    const res = await fetch(`${BASE}/auth/refresh/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh: session.refresh }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access: string };
    saveSession({ ...session, access: data.access });
    return data.access;
  } catch {
    return null;
  }
}
