"use client";

import { FormEvent, Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, MailX, ShieldCheck } from "lucide-react";
import { fetchInviteInfo, getSession, register, type InviteInfo } from "@/lib/auth";
import { AuthShell, Field } from "@/components/auth/AuthShell";

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";

  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [checking, setChecking] = useState(true);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSession()) router.replace("/overview");
  }, [router]);

  useEffect(() => {
    let cancelled = false;
    if (!token) {
      setInvite({ valid: false });
      setChecking(false);
      return;
    }
    fetchInviteInfo(token).then((info) => {
      if (cancelled) return;
      setInvite(info);
      if (info.valid && info.email) setEmail(info.email);
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await register(name.trim(), email.trim(), password, token);
      router.replace("/overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-ink-muted">
        <Loader2 size={16} className="animate-spin" /> Checking your invite…
      </div>
    );
  }

  if (!invite?.valid) {
    return (
      <div className="py-4 text-center">
        <span className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#E2445C]/10 text-[#E2445C]">
          <MailX size={22} />
        </span>
        <h2 className="text-[15px] font-semibold text-ink">
          {token ? "This invite link is invalid or has expired" : "Registration is invite-only"}
        </h2>
        <p className="mx-auto mt-1.5 max-w-xs text-[13px] leading-relaxed text-ink-muted">
          {token
            ? "Ask a workspace admin to send you a fresh invite link."
            : "WorkBoard accounts are created through invite links. Ask a workspace admin to invite you, then open the link they share."}
        </p>
        <Link
          href="/login"
          className="mt-4 inline-block rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <>
      <p className="mb-4 flex items-start gap-2 rounded-lg bg-[#B0DC51]/15 px-3 py-2 text-[12.5px] leading-relaxed text-ink">
        <ShieldCheck size={15} className="mt-0.5 shrink-0 text-[#7CA83B]" />
        <span>
          You&apos;ve been invited to <span className="font-semibold">{invite.workspace}</span> as{" "}
          <span className="font-semibold">{invite.role}</span>.
        </span>
      </p>
      <form onSubmit={submit} className="space-y-4">
        <Field
          label="Full name"
          name="name"
          autoComplete="name"
          required
          placeholder="Ada Lovelace"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          readOnly
          value={email}
          onChange={() => undefined}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="At least 6 characters"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <Field
          label="Confirm password"
          name="confirm"
          type="password"
          autoComplete="new-password"
          required
          placeholder="Repeat your password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && (
          <p className="rounded-lg bg-[#E2445C]/10 px-3 py-2 text-[12.5px] font-medium text-[#E2445C]">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-semibold text-white shadow-card transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Creating account…" : "Join workspace"}
        </button>
      </form>
    </>
  );
}

export default function RegisterPage() {
  return (
    <AuthShell
      title="Create your account"
      subtitle={
        <>
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center gap-2 py-10 text-[13px] text-ink-muted">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        }
      >
        <RegisterForm />
      </Suspense>
    </AuthShell>
  );
}
