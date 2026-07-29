"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2 } from "lucide-react";
import { requestPasswordReset } from "@/lib/auth";
import { AuthShell, Field } from "@/components/auth/AuthShell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const detail = await requestPasswordReset(email.trim());
      setMessage(detail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    }
    setLoading(false);
  };

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle={
        <>
          Remembered it?{" "}
          <Link href="/login" className="font-semibold text-primary hover:underline">
            Back to sign in
          </Link>
        </>
      }
    >
      {message ? (
        <div className="flex flex-col items-center py-4 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#10B981]/10 text-[#10B981]">
            <CheckCircle2 size={26} />
          </span>
          <p className="mt-4 text-[14px] font-semibold text-ink">Check your inbox</p>
          <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{message}</p>
          <Link
            href="/login"
            className="mt-5 flex h-11 w-full items-center justify-center rounded-lg bg-primary text-[14px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover"
          >
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <p className="text-[13px] leading-relaxed text-ink-muted">
            Enter the email you use for WorkBoard and we&apos;ll send you a link to reset your
            password.
          </p>
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
