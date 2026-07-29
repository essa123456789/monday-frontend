"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  Calendar,
  ChevronDown,
  Clock,
  FileText,
  FormInput,
  LayoutGrid,
  MessageSquare,
  Moon,
  Plus,
  Share2,
  Star,
  Sun,
  Workflow,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";
import { HeroDashboard } from "./HeroDashboard";
import { FeatureCard, type FeatureKind } from "./FeatureCard";
import { SignupModal } from "./SignupModal";

const NAV_LINKS = ["Features", "Solutions", "Pricing", "Enterprise", "Resources"];

const FEATURES: { icon: typeof Bot; title: string; desc: string; color: string; kind: FeatureKind }[] = [
  { icon: Bot, title: "AI Task Management", desc: "Let AI break down goals, draft subtasks and set smart due dates.", color: "#8B5CF6", kind: "ai" },
  { icon: Zap, title: "Automations", desc: "Trigger status changes, assignments and alerts with no-code rules.", color: "#FDBC64", kind: "automation" },
  { icon: Clock, title: "Time Tracking", desc: "Track effort per task and roll it up into clean reports.", color: "#10B981", kind: "time" },
  { icon: LayoutGrid, title: "Workspaces", desc: "Give every team an isolated, organized home for their work.", color: "#5AC6FC", kind: "workspaces" },
  { icon: Workflow, title: "Dashboards", desc: "Live widgets that turn tasks into decisions at a glance.", color: "#9D99FF", kind: "dashboards" },
  { icon: FileText, title: "Docs", desc: "Write specs and notes that link straight to your tasks.", color: "#E2445C", kind: "docs" },
  { icon: FormInput, title: "Forms", desc: "Collect requests and turn them into trackable items instantly.", color: "#C48ADB", kind: "forms" },
  { icon: MessageSquare, title: "Chat", desc: "Discuss work in context with @mentions and live updates.", color: "#66CCFF", kind: "chat" },
  { icon: Share2, title: "File Sharing", desc: "Attach, preview and version files right where work happens.", color: "#78D0BD", kind: "files" },
];

const VIEWS = [
  { icon: LayoutGrid, label: "Kanban" },
  { icon: Workflow, label: "Table" },
  { icon: Clock, label: "Timeline" },
  { icon: Calendar, label: "Calendar" },
];

const TESTIMONIALS = [
  {
    quote: "We replaced three tools with one workspace. Our team ships twice as fast and nothing falls through the cracks.",
    name: "Amara Okafor",
    role: "Head of Product, Northwind",
    initials: "AO",
    color: "#8B5CF6",
  },
  {
    quote: "The AI assistant plans our sprints in seconds. It feels like an extra project manager on the team.",
    name: "Daniel Reyes",
    role: "Engineering Lead, Lumen",
    initials: "DR",
    color: "#10B981",
  },
  {
    quote: "Beautiful, fast, and genuinely easy to roll out across departments. Adoption was effortless.",
    name: "Priya Nair",
    role: "COO, Brightline",
    initials: "PN",
    color: "#E2445C",
  },
];

const PRICING = [
  {
    name: "Starter",
    price: "$0",
    cadence: "/ forever",
    blurb: "For small teams getting organized.",
    features: ["Up to 5 members", "Unlimited tasks", "Kanban & table views", "Mobile & web"],
    highlight: false,
  },
  {
    name: "Pro",
    price: "$12",
    cadence: "/ user / mo",
    blurb: "For growing teams that need more power.",
    features: ["Everything in Starter", "Automations & AI", "Dashboards & timeline", "Time tracking", "Priority support"],
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    blurb: "For organizations at scale.",
    features: ["SSO & advanced security", "Dedicated workspaces", "Audit logs", "Onboarding & SLA"],
    highlight: false,
  },
];

const FAQS = [
  { q: "Do I need a credit card to start?", a: "No. Create your workspace free and invite your team — no card required for the trial." },
  { q: "Can I invite my whole team?", a: "Yes. As a workspace admin you can invite members and other admins, each with role-based access." },
  { q: "Is my company's data isolated?", a: "Completely. Every company gets its own private workspace; members only ever see their own organization's data." },
  { q: "Does it work in real time?", a: "Yes. Changes sync live across everyone's screens, and you get instant notifications for assignments and mentions." },
  { q: "Can I switch plans later?", a: "Anytime. Upgrade or downgrade in a click — changes take effect immediately." },
];

function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <span className="h-9 w-9" />;
  const dark = resolvedTheme === "dark";
  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label="Toggle theme"
      className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-lg text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
    >
      {dark ? <Sun size={18} /> : <Moon size={18} />}
    </button>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary text-white shadow-lg shadow-primary/25">
        <LayoutGrid size={18} />
      </span>
      <span className="text-[18px] font-bold tracking-tight text-ink">WorkBoard</span>
    </div>
  );
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-edge bg-surface-raised">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full cursor-pointer items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-[15px] font-semibold text-ink">{q}</span>
        <ChevronDown
          size={18}
          className={`shrink-0 text-ink-faint transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && <p className="px-5 pb-4 text-[13.5px] leading-relaxed text-ink-muted">{a}</p>}
    </div>
  );
}

export function LandingPage() {
  const router = useRouter();
  const [signupOpen, setSignupOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-surface-sunken">
      <style>{`
        @keyframes riseIn { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:translateY(0)} }
        .rise { animation: riseIn .6s cubic-bezier(0.16,1,0.3,1) both; }
      `}</style>

      {/* Background mesh gradients */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[520px] w-[520px] rounded-full opacity-50 blur-[120px]" style={{ background: "radial-gradient(circle, #8B5CF6, transparent 70%)" }} />
        <div className="absolute -right-40 top-20 h-[480px] w-[480px] rounded-full opacity-40 blur-[120px]" style={{ background: "radial-gradient(circle, #C48ADB, transparent 70%)" }} />
        <div className="absolute left-1/3 top-[540px] h-[440px] w-[440px] rounded-full opacity-30 blur-[120px]" style={{ background: "radial-gradient(circle, #5AC6FC, transparent 70%)" }} />
        <div className="absolute -right-20 top-[900px] h-[420px] w-[420px] rounded-full opacity-25 blur-[120px]" style={{ background: "radial-gradient(circle, #10B981, transparent 70%)" }} />
      </div>

      {/* Nav */}
      <header
        className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
          scrolled ? "border-b border-edge bg-surface/80 backdrop-blur-xl" : "border-b border-transparent"
        }`}
      >
        <nav className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-5 md:px-8">
          <Logo />
          <div className="ml-4 hidden items-center gap-1 lg:flex">
            {NAV_LINKS.map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => scrollTo(l.toLowerCase())}
                className="cursor-pointer rounded-lg px-3 py-2 text-[13.5px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
              >
                {l}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="hidden h-9 cursor-pointer items-center rounded-lg px-3.5 text-[13.5px] font-semibold text-ink transition-colors duration-150 hover:bg-surface-sunken sm:flex"
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setSignupOpen(true)}
              className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg bg-primary px-4 text-[13.5px] font-semibold text-white shadow-lg shadow-primary/25 transition-all duration-200 hover:bg-primary-hover hover:shadow-primary/40"
            >
              Start Free
            </button>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative mx-auto max-w-7xl px-5 pt-32 md:px-8 md:pt-40">
        <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.15fr] lg:gap-10">
          <div className="rise">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-edge bg-surface-raised/70 px-3 py-1.5 text-[12.5px] font-semibold text-ink-muted backdrop-blur">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-white">
                <Zap size={10} />
              </span>
              New · AI-powered workflows
            </span>
            <h1 className="mt-5 text-[40px] font-extrabold leading-[1.05] tracking-tight text-ink sm:text-[52px] md:text-[58px]">
              The Operating System for{" "}
              <span
                className="bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(120deg, #8B5CF6, #C48ADB 45%, #5AC6FC)" }}
              >
                Modern Teams
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-ink-muted">
              Manage projects, tasks, documents, goals and workflows in one beautiful workspace — built for
              speed, clarity and real-time collaboration.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => setSignupOpen(true)}
                className="group flex h-12 cursor-pointer items-center gap-2 rounded-2xl bg-primary px-6 text-[15px] font-semibold text-white shadow-xl shadow-primary/30 transition-all duration-200 hover:bg-primary-hover hover:shadow-primary/50"
              >
                Start Free
                <ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <span className="flex -space-x-2">
                {["#8B5CF6", "#10B981", "#F59E0B", "#E2445C", "#5AC6FC"].map((c, i) => (
                  <span
                    key={c}
                    className="flex h-8 w-8 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-surface-sunken"
                    style={{ backgroundColor: c }}
                  >
                    {["A", "S", "O", "L", "D"][i]}
                  </span>
                ))}
              </span>
              <div>
                <div className="flex items-center gap-0.5 text-[#FDBC64]">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <Star key={i} size={13} fill="currentColor" />
                  ))}
                </div>
                <p className="text-[12.5px] font-medium text-ink-muted">Trusted by 25,000+ companies</p>
              </div>
            </div>
          </div>

          <div className="relative">
            <div className="w-full lg:w-[740px] lg:max-w-none">
              <HeroDashboard />
            </div>
          </div>
        </div>

        {/* Logo strip */}
        <div className="mt-24 border-y border-edge py-8">
          <p className="mb-5 text-center text-[12px] font-semibold uppercase tracking-widest text-ink-faint">
            Powering teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
            {["Northwind", "Lumen", "Brightline", "Vertex", "Cascade", "Monarch"].map((n) => (
              <span key={n} className="text-[18px] font-bold tracking-tight text-ink-muted">
                {n}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative mx-auto max-w-7xl px-5 py-24 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[13px] font-bold uppercase tracking-widest text-primary">Everything in one place</span>
          <h2 className="mt-3 text-[34px] font-extrabold tracking-tight text-ink md:text-[42px]">
            One workspace. Every workflow.
          </h2>
          <p className="mt-4 text-[16px] leading-relaxed text-ink-muted">
            Stop stitching tools together. WorkBoard brings your tasks, docs, automations and team into a single
            beautifully fast surface.
          </p>
        </div>

        {/* View pills */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          {VIEWS.map((v) => (
            <span
              key={v.label}
              className="flex items-center gap-1.5 rounded-full border border-edge bg-surface-raised px-3.5 py-2 text-[13px] font-semibold text-ink-muted"
            >
              <v.icon size={15} className="text-primary" /> {v.label}
            </span>
          ))}
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* Solutions band */}
      <section id="solutions" className="relative mx-auto max-w-7xl px-5 py-8 md:px-8">
        <div className="overflow-hidden rounded-[28px] border border-edge bg-gradient-to-br from-primary/[0.08] to-[#C48ADB]/[0.08] p-8 md:p-12">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <span className="text-[13px] font-bold uppercase tracking-widest text-primary">Solutions</span>
              <h2 className="mt-3 text-[28px] font-extrabold tracking-tight text-ink md:text-[34px]">
                Built for every team in your company
              </h2>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">
                Product, engineering, marketing, HR and operations — each gets a tailored workspace with the views
                and automations that fit how they actually work.
              </p>
              <button
                type="button"
                onClick={() => setSignupOpen(true)}
                className="mt-6 flex h-11 cursor-pointer items-center gap-2 rounded-2xl bg-primary px-5 text-[14px] font-semibold text-white shadow-lg shadow-primary/25 transition-colors duration-200 hover:bg-primary-hover"
              >
                Start Free <ArrowRight size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {["Product", "Engineering", "Marketing", "Operations"].map((t, i) => (
                <div
                  key={t}
                  className="rounded-2xl border border-white/60 bg-white/70 p-4 backdrop-blur-xl dark:border-white/10 dark:bg-white/[0.04]"
                >
                  <span
                    className="flex h-9 w-9 items-center justify-center rounded-2xl text-white"
                    style={{ backgroundColor: ["#8B5CF6", "#10B981", "#F59E0B", "#E2445C"][i] }}
                  >
                    <LayoutGrid size={16} />
                  </span>
                  <p className="mt-2.5 text-[14px] font-bold text-ink">{t}</p>
                  <p className="text-[12px] text-ink-muted">Ready-made workspace</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="resources" className="relative mx-auto max-w-7xl px-5 py-24 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[13px] font-bold uppercase tracking-widest text-primary">Loved by teams</span>
          <h2 className="mt-3 text-[34px] font-extrabold tracking-tight text-ink md:text-[42px]">
            The workspace teams rave about
          </h2>
        </div>
        <div className="mt-12 grid gap-4 md:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-[20px] border border-edge bg-surface-raised p-6 shadow-sm">
              <div className="flex items-center gap-0.5 text-[#FDBC64]">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} size={15} fill="currentColor" />
                ))}
              </div>
              <p className="mt-4 text-[14.5px] leading-relaxed text-ink">“{t.quote}”</p>
              <div className="mt-5 flex items-center gap-3">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full text-[13px] font-bold text-white"
                  style={{ backgroundColor: t.color }}
                >
                  {t.initials}
                </span>
                <div>
                  <p className="text-[13.5px] font-bold text-ink">{t.name}</p>
                  <p className="text-[12px] text-ink-muted">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="relative mx-auto max-w-7xl px-5 py-16 md:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-[13px] font-bold uppercase tracking-widest text-primary">Pricing</span>
          <h2 className="mt-3 text-[34px] font-extrabold tracking-tight text-ink md:text-[42px]">
            Simple, transparent pricing
          </h2>
          <p className="mt-4 text-[16px] text-ink-muted">Start free. Upgrade when your team grows.</p>
        </div>
        <div className="mt-12 grid items-start gap-4 md:grid-cols-3">
          {PRICING.map((p) => (
            <div
              key={p.name}
              className={`relative rounded-[24px] border p-7 transition-all duration-200 ${
                p.highlight
                  ? "border-primary bg-surface-raised shadow-2xl shadow-primary/15 md:-translate-y-3"
                  : "border-edge bg-surface-raised shadow-sm"
              }`}
            >
              {p.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow-lg shadow-primary/30">
                  Most popular
                </span>
              )}
              <h3 className="text-[17px] font-bold text-ink">{p.name}</h3>
              <p className="mt-1 text-[13px] text-ink-muted">{p.blurb}</p>
              <div className="mt-4 flex items-end gap-1">
                <span className="text-[36px] font-extrabold tracking-tight text-ink">{p.price}</span>
                <span className="mb-1.5 text-[13px] font-medium text-ink-faint">{p.cadence}</span>
              </div>
              <button
                type="button"
                onClick={() => setSignupOpen(true)}
                className={`mt-5 flex h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-2xl text-[14px] font-semibold transition-colors duration-200 ${
                  p.highlight
                    ? "bg-primary text-white shadow-lg shadow-primary/25 hover:bg-primary-hover"
                    : "border border-edge text-ink hover:bg-surface-sunken"
                }`}
              >
                {p.name === "Enterprise" ? "Contact sales" : "Start Free"}
              </button>
              <ul className="mt-6 space-y-2.5">
                {p.features.map((feat) => (
                  <li key={feat} className="flex items-center gap-2.5 text-[13.5px] text-ink-muted">
                    <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#10B981]/15 text-[#10B981]">
                      <Plus size={11} />
                    </span>
                    {feat}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="relative mx-auto max-w-3xl px-5 py-24 md:px-8">
        <div className="text-center">
          <span className="text-[13px] font-bold uppercase tracking-widest text-primary">FAQ</span>
          <h2 className="mt-3 text-[34px] font-extrabold tracking-tight text-ink md:text-[42px]">
            Questions, answered
          </h2>
        </div>
        <div className="mt-10 space-y-3">
          {FAQS.map((f) => (
            <FaqItem key={f.q} q={f.q} a={f.a} />
          ))}
        </div>
      </section>

      {/* Big CTA */}
      <section id="enterprise" className="relative mx-auto max-w-7xl px-5 pb-24 md:px-8">
        <div
          className="relative overflow-hidden rounded-[32px] px-8 py-16 text-center md:px-16 md:py-20"
          style={{ background: "linear-gradient(120deg, #4b3df0, #8B5CF6 40%, #9d6cf0)" }}
        >
          <div className="pointer-events-none absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-[#5AC6FC]/30 blur-3xl" />
          <div className="relative">
            <h2 className="mx-auto max-w-2xl text-[32px] font-extrabold leading-tight tracking-tight text-white md:text-[44px]">
              Give your team the workspace it deserves
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-[16px] leading-relaxed text-white/80">
              Set up your company in under a minute. Free to start, no credit card required.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => setSignupOpen(true)}
                className="group flex h-12 cursor-pointer items-center gap-2 rounded-2xl bg-white px-7 text-[15px] font-bold text-primary shadow-xl transition-all duration-200 hover:shadow-2xl"
              >
                Start Free
                <ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-0.5" />
              </button>
              <button
                type="button"
                onClick={() => router.push("/login")}
                className="flex h-12 cursor-pointer items-center rounded-2xl border border-white/30 bg-white/10 px-7 text-[15px] font-semibold text-white backdrop-blur transition-colors duration-200 hover:bg-white/20"
              >
                Login
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t border-edge bg-surface">
        <div className="mx-auto max-w-7xl px-5 py-12 md:px-8">
          <div className="grid gap-8 md:grid-cols-5">
            <div className="md:col-span-2">
              <Logo />
              <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-ink-muted">
                The operating system for modern teams. Manage everything in one beautiful workspace.
              </p>
            </div>
            {[
              { h: "Product", items: ["Features", "Pricing", "Integrations", "Changelog"] },
              { h: "Company", items: ["About", "Careers", "Blog", "Contact"] },
              { h: "Legal", items: ["Privacy", "Terms", "Security", "Status"] },
            ].map((col) => (
              <div key={col.h}>
                <p className="text-[12px] font-bold uppercase tracking-wider text-ink-faint">{col.h}</p>
                <ul className="mt-3 space-y-2">
                  {col.items.map((it) => (
                    <li key={it}>
                      <span className="cursor-pointer text-[13.5px] text-ink-muted transition-colors duration-150 hover:text-ink">
                        {it}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-edge pt-6 sm:flex-row">
            <p className="text-[12.5px] text-ink-faint">© {new Date().getFullYear()} WorkBoard. All rights reserved.</p>
            <p className="text-[12.5px] text-ink-faint">Built from scratch — inspired by the best work tools.</p>
          </div>
        </div>
      </footer>

      <SignupModal open={signupOpen} onClose={() => setSignupOpen(false)} />
    </div>
  );
}
