"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { getSession, login } from "@/lib/auth";
import { AuthShell, Field } from "@/components/auth/AuthShell";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getSession()) router.replace("/overview");
  }, [router]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email.trim(), password);
      router.replace("/overview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Welcome back"
      subtitle={
        <>
          New to WorkBoard?{" "}
          <Link href="/register" className="font-semibold text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
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
        <div>
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <div className="mt-1.5 text-right">
            <Link
              href="/forgot-password"
              className="text-[12.5px] font-semibold text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
        </div>
        {error && (
          <p className="rounded-lg bg-[#E2445C]/10 px-3 py-2 text-[12.5px] font-medium text-[#E2445C]">{error}</p>
        )}
        <button
          type="submit"
          disabled={loading}
          className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary text-[14px] font-semibold text-white shadow-card transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? "Signing in…" : "Sign in"}
        </button>
      </form>
      {/* <p className="mt-4 rounded-lg bg-surface-sunken px-3 py-2 text-[12px] leading-relaxed text-ink-muted">
        Demo account: <span className="font-semibold">essak585@gmail.com</span> / <span className="font-semibold">demo1234</span>
      </p> */}
    </AuthShell>
  );
}
