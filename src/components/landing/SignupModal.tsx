"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, Sparkles, X } from "lucide-react";
import { signup } from "@/lib/auth";

export function SignupModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setCompany("");
      setEmail("");
      setError("");
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const result = await signup(company.trim(), email.trim().toLowerCase());
      // Hand off to the existing register screen to set a password
      router.push(`/register?token=${result.token}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-[#0b0b1a]/60 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Start free"
    >
      <div
        className="relative w-full max-w-md animate-pop-in overflow-hidden rounded-[24px] border border-white/60 bg-white shadow-2xl dark:border-white/10 dark:bg-[#1b1e27]"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-70 blur-3xl"
          style={{ background: "radial-gradient(circle, #8B5CF6, transparent 70%)" }}
        />
        <div className="relative p-6">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="absolute right-4 top-4 cursor-pointer rounded-lg p-1.5 text-ink-faint transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
          >
            <X size={18} />
          </button>

          <span className="inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-2.5 py-1 text-[11.5px] font-semibold text-primary dark:bg-primary/15">
            <Sparkles size={13} /> Free 14-day trial
          </span>
          <h2 className="mt-3 text-[22px] font-bold tracking-tight text-ink">Start free</h2>
          <p className="mt-1 text-[13.5px] leading-relaxed text-ink-muted">
            Spin up your company workspace in seconds. Next you&apos;ll set a password, then invite your team.
          </p>

          <form onSubmit={submit} className="mt-5 space-y-3.5">
            <div>
              <label htmlFor="s-company" className="mb-1 block text-[12.5px] font-semibold text-ink-muted">
                Company name
              </label>
              <input
                id="s-company"
                autoFocus
                required
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Acme Inc."
                className="h-11 w-full rounded-2xl border border-edge bg-surface-sunken px-3.5 text-[14px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint focus:border-primary focus:bg-surface-raised"
              />
            </div>
            <div>
              <label htmlFor="s-email" className="mb-1 block text-[12.5px] font-semibold text-ink-muted">
                Work email
              </label>
              <input
                id="s-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@acme.com"
                className="h-11 w-full rounded-2xl border border-edge bg-surface-sunken px-3.5 text-[14px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint focus:border-primary focus:bg-surface-raised"
              />
            </div>
            {error && (
              <p className="rounded-2xl bg-[#E2445C]/10 px-3 py-2 text-[12.5px] font-medium text-[#E2445C]">{error}</p>
            )}
            <button
              type="submit"
              disabled={loading || !company.trim() || !email.trim()}
              className="group flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-2xl bg-primary text-[14px] font-semibold text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? "Creating your workspace…" : "Continue"}
              {!loading && <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />}
            </button>
          </form>

          <p className="mt-4 text-center text-[12px] text-ink-faint">
            Already have an account?{" "}
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="cursor-pointer font-semibold text-primary hover:underline"
            >
              Log in
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
