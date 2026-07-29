"use client";

import { FormEvent, Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2 } from "lucide-react";
import { confirmPasswordReset } from "@/lib/auth";
import { AuthShell, Field } from "@/components/auth/AuthShell";

function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Those passwords don't match.");
      return;
    }
    setLoading(true);
    try {
      await confirmPasswordReset(token, password);
      setDone(true);
      setTimeout(() => router.replace("/login"), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <div className="py-4 text-center">
        <p className="text-[14px] font-semibold text-ink">Invalid reset link</p>
        <p className="mt-1 text-[13px] text-ink-muted">
          This link is missing its token. Request a new one from the sign-in page.
        </p>
        <Link
          href="/forgot-password"
          className="mt-5 flex h-11 w-full items-center justify-center rounded-lg bg-primary text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover"
        >
          Request a new link
        </Link>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col items-center py-4 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#10B981]/10 text-[#10B981]">
          <CheckCircle2 size={26} />
        </span>
        <p className="mt-4 text-[14px] font-semibold text-ink">Password reset</p>
        <p className="mt-1 text-[13px] text-ink-muted">Taking you to the sign-in page…</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Field
        label="New password"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        placeholder="••••••••"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <Field
        label="Confirm new password"
        name="confirm"
        type="password"
        autoComplete="new-password"
        required
        placeholder="••••••••"
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
      />
      {error && (
        <p className="rounded-lg bg-[#E2445C]/10 px-3 py-2 text-[12.5px] font-medium text-[#E2445C]">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-semibold text-white shadow-card transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
      >
        {loading && <Loader2 size={16} className="animate-spin" />}
        {loading ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell
      title="Choose a new password"
      subtitle={
        <>
          Changed your mind?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-8 text-ink-faint">
            <Loader2 size={18} className="animate-spin" />
          </div>
        }
      >
        <ResetPasswordForm />
      </Suspense>
    </AuthShell>
  );
}
