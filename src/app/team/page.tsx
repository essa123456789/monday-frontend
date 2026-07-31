"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  ImagePlus,
  Loader2,
  LogOut,
  Mail,
  Palette,
  ShieldCheck,
  Trash2,
  User as UserIcon,
  UserPlus,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getSession, logout } from "@/lib/auth";
import { useBoardStore } from "@/store/boardStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { ThemeToggle } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { RealtimeClient } from "@/components/layout/RealtimeClient";
import { Avatar } from "@/components/ui/Avatar";
import { Dropdown, DropdownItem } from "@/components/ui/Dropdown";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { cn, copyText, formatRelativeTime } from "@/lib/utils";
import { applyThemeColor, DEFAULT_THEME_COLOR } from "@/lib/theme";
import type { Invite, Membership } from "@/lib/types";

function apiErrorDetail(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    const match = /"detail"\s*:\s*"([^"]+)"/.exec(err.message);
    if (match) return match[1];
  }
  return fallback;
}

function inviteLink(token: string): string {
  return `${window.location.origin}/register?token=${token}`;
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-edge bg-surface-raised px-4 py-3.5 shadow-card">
      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary dark:bg-primary/15">
        {icon}
      </span>
      <div>
        <p className="text-[20px] font-bold leading-tight text-ink">{value}</p>
        <p className="text-[12px] font-medium text-ink-muted">{label}</p>
      </div>
    </div>
  );
}

/** Wordmark the sidebar falls back to when a workspace hasn't set its own. */
const DEFAULT_BRAND_NAME = "WorkBoard";

/** A handful of accents that read well against the app's surfaces — a starting
 * point, with the native picker alongside for anything else. */
const PRESET_COLORS = [
  DEFAULT_THEME_COLOR,
  "#4B91F7",
  "#00A9A5",
  "#11B875",
  "#F5A623",
  "#E2445C",
  "#EC5AA0",
  "#3B4A66",
];

function BrandingSection() {
  const workspace = useBoardStore((s) => s.workspaces[0]);
  const saveBranding = useBoardStore((s) => s.saveBranding);

  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoCleared, setLogoCleared] = useState(false);
  const [color, setColor] = useState(DEFAULT_THEME_COLOR);
  const [brandName, setBrandName] = useState(DEFAULT_BRAND_NAME);
  const [saving, setSaving] = useState(false);
  const logoInput = useRef<HTMLInputElement>(null);

  // Re-sync whenever the workspace lands (or another admin changes it).
  useEffect(() => {
    setLogoFile(null);
    setLogoUrl(workspace?.logo ?? null);
    setLogoCleared(false);
    setColor(workspace?.theme_color || DEFAULT_THEME_COLOR);
    setBrandName(workspace?.brand_name || DEFAULT_BRAND_NAME);
  }, [workspace?.logo, workspace?.theme_color, workspace?.brand_name]);

  useEffect(() => {
    if (!logoFile) return;
    const url = URL.createObjectURL(logoFile);
    setLogoUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  // Live preview: the page rethemes as you pick, and reverts on cancel.
  useEffect(() => {
    applyThemeColor(color);
  }, [color]);

  const dirty =
    logoFile !== null ||
    logoCleared ||
    color.toUpperCase() !== (workspace?.theme_color || DEFAULT_THEME_COLOR).toUpperCase() ||
    brandName.trim() !== (workspace?.brand_name || DEFAULT_BRAND_NAME);

  const reset = () => {
    setLogoFile(null);
    setLogoUrl(workspace?.logo ?? null);
    setLogoCleared(false);
    setColor(workspace?.theme_color || DEFAULT_THEME_COLOR);
    setBrandName(workspace?.brand_name || DEFAULT_BRAND_NAME);
    if (logoInput.current) logoInput.current.value = "";
  };

  const save = async () => {
    if (!dirty || saving) return;
    setSaving(true);
    await saveBranding({
      ...(logoFile ? { logo: logoFile } : logoCleared ? { logo: null } : {}),
      themeColor: color,
      // Blank means "use the default", so don't store the fallback verbatim.
      brandName: brandName.trim() === DEFAULT_BRAND_NAME ? "" : brandName.trim(),
    });
    setSaving(false);
  };

  return (
    <section className="rounded-2xl border border-edge bg-surface-raised p-5 shadow-card">
      <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
        <Palette size={16} className="text-ink-faint" /> Company branding
      </h2>
      <p className="mt-0.5 text-[12.5px] text-ink-muted">
        Your logo replaces the mark at the top of the sidebar, and the accent colour themes the
        app for everyone in the workspace.
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-edge bg-surface-sunken text-ink-faint">
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- logos come from the API host, not the Next image loader
            <img src={logoUrl} alt="" className="h-full w-full object-contain" />
          ) : (
            <ImagePlus size={20} />
          )}
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => logoInput.current?.click()}
            className="h-9 cursor-pointer rounded-lg border border-edge px-3 text-[12.5px] font-medium text-ink transition-colors duration-150 hover:bg-surface-sunken"
          >
            {logoUrl ? "Replace logo" : "Upload logo"}
          </button>
          {logoUrl && (
            <button
              type="button"
              onClick={() => {
                setLogoFile(null);
                setLogoUrl(null);
                setLogoCleared(true);
                if (logoInput.current) logoInput.current.value = "";
              }}
              className="h-9 cursor-pointer rounded-lg px-2.5 text-[12.5px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken"
            >
              Remove
            </button>
          )}
          <span className="text-[11.5px] text-ink-faint">PNG or SVG, up to 5MB</span>
        </div>
        <input
          ref={logoInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setLogoFile(file);
            setLogoCleared(false);
          }}
        />
      </div>

      <div className="mt-5">
        <label className="mb-1.5 block text-[12.5px] font-medium text-ink-muted" htmlFor="brand-name">
          Name beside the logo
        </label>
        <input
          id="brand-name"
          value={brandName}
          onChange={(e) => setBrandName(e.target.value)}
          maxLength={60}
          placeholder={DEFAULT_BRAND_NAME}
          className="h-10 w-full max-w-xs rounded-lg border border-edge bg-surface-sunken px-3 text-[13.5px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint focus:border-primary"
        />
        <p className="mt-1.5 text-[11.5px] text-ink-faint">
          Shown at the top of the sidebar. Leave it empty for “{DEFAULT_BRAND_NAME}”.
        </p>
      </div>

      <div className="mt-5">
        <span className="mb-2 block text-[12.5px] font-medium text-ink-muted">Accent colour</span>
        <div className="flex flex-wrap items-center gap-2">
          {PRESET_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              aria-label={`Use ${c}`}
              aria-pressed={color.toUpperCase() === c.toUpperCase()}
              className={cn(
                "h-8 w-8 cursor-pointer rounded-full transition-transform duration-150 hover:scale-110",
                color.toUpperCase() === c.toUpperCase() &&
                  "ring-2 ring-offset-2 ring-offset-surface-raised"
              )}
              style={{
                backgroundColor: c,
                ...(color.toUpperCase() === c.toUpperCase() ? { ["--tw-ring-color" as string]: c } : {}),
              }}
            />
          ))}
          <label
            className="flex h-8 cursor-pointer items-center gap-2 rounded-lg border border-edge px-2.5 text-[12.5px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken"
            title="Pick any colour"
          >
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value.toUpperCase())}
              className="h-5 w-5 cursor-pointer border-0 bg-transparent p-0"
            />
            {color.toUpperCase()}
          </label>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-edge pt-4">
        <span className="text-[12px] text-ink-faint">
          {dirty ? "Preview is live — save to apply it for the team." : "Everything saved."}
        </span>
        <span className="flex-1" />
        {dirty && (
          <button
            type="button"
            onClick={reset}
            className="h-9 cursor-pointer rounded-lg px-3 text-[12.5px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="flex h-9 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-[12.5px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
          Save branding
        </button>
      </div>
    </section>
  );
}

export default function TeamPage() {
  const router = useRouter();
  const init = useBoardStore((s) => s.init);
  const workspaces = useBoardStore((s) => s.workspaces);
  const currentMember = useBoardStore((s) => s.currentMember);

  const [authed, setAuthed] = useState(false);
  const [memberships, setMemberships] = useState<Membership[] | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);
  const [removeTarget, setRemoveTarget] = useState<Membership | null>(null);

  useEffect(() => {
    if (!getSession()) {
      router.replace("/login");
      return;
    }
    setAuthed(true);
  }, [router]);

  useEffect(() => {
    if (authed && workspaces.length === 0) init();
  }, [authed, init, workspaces.length]);

  // Admin-only page: bounce non-admins once their role is known
  useEffect(() => {
    if (currentMember && currentMember.role !== "admin") router.replace("/overview");
  }, [currentMember, router]);

  const loadData = useCallback(async () => {
    try {
      const [m, i] = await Promise.all([
        api.get<Membership[]>("/memberships/"),
        api.get<Invite[]>("/invites/"),
      ]);
      setMemberships(m);
      setInvites(i);
    } catch {
      toast.error("Failed to load team data");
    }
  }, []);

  useEffect(() => {
    if (authed && currentMember?.role === "admin") loadData();
  }, [authed, currentMember, loadData]);

  if (!authed || !currentMember || currentMember.role !== "admin") return null;

  const copy = async (invite: Invite, message = "Invite link copied") => {
    const link = inviteLink(invite.token);
    if (await copyText(link)) {
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 1500);
      toast.success(message);
    } else {
      toast.error("Could not copy — copy it manually: " + link);
    }
  };

  const createInvite = async () => {
    const email = inviteEmail.trim().toLowerCase();
    if (!email || !email.includes("@") || sending) return;
    setSending(true);
    try {
      const invite = await api.post<Invite>("/invites/", { email, role: inviteRole });
      setInviteEmail("");
      setInvites((prev) => [invite, ...prev.filter((x) => x.id !== invite.id)]);
      if (invite.emailed) {
        toast.success(`Invite sent to ${email}`);
      } else {
        // Mail didn't go out — fall back to the link so the invite isn't stranded.
        await copy(invite, "Couldn't send the email — invite link copied instead");
      }
    } catch (err) {
      toast.error(apiErrorDetail(err, "Failed to create invite"));
    }
    setSending(false);
  };

  const revokeInvite = async (invite: Invite) => {
    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    try {
      await api.delete(`/invites/${invite.id}/`);
      toast.success("Invite revoked");
    } catch {
      loadData();
      toast.error("Failed to revoke invite");
    }
  };

  const changeRole = async (membership: Membership, role: "admin" | "member") => {
    if (membership.role === role) return;
    const prev = memberships;
    setMemberships(
      (prev ?? []).map((m) => (m.id === membership.id ? { ...m, role } : m))
    );
    try {
      await api.patch(`/memberships/${membership.id}/`, { role });
      toast.success(`${membership.member_detail.name} is now ${role === "admin" ? "an admin" : "a member"}`);
    } catch (err) {
      setMemberships(prev ?? null);
      toast.error(apiErrorDetail(err, "Failed to change role"));
    }
  };

  const removeMember = async (membership: Membership) => {
    const prev = memberships;
    setMemberships((prev ?? []).filter((m) => m.id !== membership.id));
    try {
      await api.delete(`/memberships/${membership.id}/`);
      toast.success(`${membership.member_detail.name} removed from the workspace`);
    } catch (err) {
      setMemberships(prev ?? null);
      toast.error(apiErrorDetail(err, "Failed to remove member"));
    }
  };

  const boardCount = workspaces[0]?.boards.length ?? 0;

  return (
    <div className="flex h-screen overflow-hidden p-3 pb-20 gap-3 md:p-6 md:gap-6">
      <RealtimeClient />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-20 shrink-0 items-center gap-3 border-b border-edge bg-surface px-4 md:px-6 rounded-2xl border-[1px] border-[#E7E9EB] dark:border-[#1E2128]">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary dark:bg-primary/20">
            <ShieldCheck size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] font-bold text-ink">Administration</h1>
            <p className="hidden truncate text-[12px] text-ink-faint md:block">
              Manage members, roles and invites — {workspaces[0]?.name ?? "workspace"}
            </p>
          </div>
          <NotificationsBell />
          <ThemeToggle />
          <Dropdown
            align="right"
            width={230}
            trigger={
              <button type="button" className="flex cursor-pointer items-center gap-2 rounded-lg p-1 transition-colors duration-150 hover:bg-surface-sunken" aria-label="Account menu">
                <Avatar member={currentMember} size={30} />
              </button>
            }
          >
            {(close) => (
              <div className="pt-1">
                <DropdownItem
                  onClick={() => {
                    close();
                    router.push("/profile");
                  }}
                >
                  <UserIcon size={14} /> Profile
                </DropdownItem>
                <DropdownItem
                  onClick={() => {
                    close();
                    logout();
                  }}
                >
                  <LogOut size={14} /> Log out
                </DropdownItem>
              </div>
            )}
          </Dropdown>
        </header>

        <div className="flex-1 overflow-y-auto p-4 nice-scroll md:p-6">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <StatCard icon={<Users size={19} />} label="Members" value={memberships?.length ?? 0} />
              <StatCard icon={<Mail size={19} />} label="Pending invites" value={invites.length} />
              <StatCard icon={<ShieldCheck size={19} />} label="Boards" value={boardCount} />
            </div>

            {/* Branding */}
            <BrandingSection />

            {/* Invite */}
            <section className="rounded-2xl border border-edge bg-surface-raised p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                <UserPlus size={16} className="text-ink-faint" /> Invite someone
              </h2>
              <p className="mt-0.5 text-[12.5px] text-ink-muted">
                We&apos;ll email them a single-use invite link, valid for 7 days.
              </p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <input
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && createInvite()}
                  type="email"
                  placeholder="teammate@company.com"
                  aria-label="Invite email"
                  className="h-10 w-full max-w-xs rounded-lg border border-edge bg-surface-sunken px-3 text-[13.5px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint focus:border-primary"
                />
                <div className="flex gap-1 rounded-lg bg-surface-sunken p-1">
                  {(["member", "admin"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setInviteRole(r)}
                      className={cn(
                        "cursor-pointer rounded-md px-3 py-1.5 text-[12.5px] font-medium capitalize transition-colors duration-150",
                        inviteRole === r ? "bg-surface-raised text-ink shadow-card" : "text-ink-muted hover:text-ink"
                      )}
                    >
                      {r}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={createInvite}
                  disabled={!inviteEmail.trim() || sending}
                  className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending && <Loader2 size={14} className="animate-spin" />}
                  {sending ? "Sending…" : "Send invite"}
                </button>
              </div>
            </section>

            {/* Members */}
            <section className="rounded-2xl border border-edge bg-surface-raised shadow-card">
              <h2 className="flex items-center gap-2 border-b border-edge px-5 py-3.5 text-[15px] font-semibold text-ink">
                <Users size={16} className="text-ink-faint" /> Members
                <span className="text-[12.5px] font-medium text-ink-faint">{memberships?.length ?? 0}</span>
              </h2>
              {memberships === null ? (
                <div className="space-y-2 p-5">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : (
                <ul>
                  {memberships.map((m) => {
                    const isSelf = m.member_detail.id === currentMember.id;
                    return (
                      <li
                        key={m.id}
                        className="flex flex-wrap items-center gap-3 border-b border-edge px-5 py-3 last:border-b-0"
                      >
                        <Avatar member={m.member_detail} size={36} />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[14px] font-semibold text-ink">
                            {m.member_detail.name}
                            {isSelf && <span className="ml-1.5 rounded-full bg-primary-soft px-1.5 py-0.5 text-[10.5px] font-semibold text-primary dark:bg-primary/20">you</span>}
                          </p>
                          <p className="truncate text-[12px] text-ink-faint">
                            {m.member_detail.email} · joined {formatRelativeTime(m.created_at)}
                          </p>
                        </div>

                        <Dropdown
                          align="right"
                          width={200}
                          trigger={
                            <button
                              type="button"
                              className={cn(
                                "flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-[12.5px] font-medium capitalize transition-colors duration-150",
                                m.role === "admin"
                                  ? "border-primary/40 bg-primary-soft text-primary dark:bg-primary/15"
                                  : "border-edge text-ink-muted hover:bg-surface-sunken"
                              )}
                              aria-label={`Change role for ${m.member_detail.name}`}
                            >
                              {m.role === "admin" && <ShieldCheck size={13} />}
                              {m.role} ▾
                            </button>
                          }
                        >
                          {(close) => (
                            <>
                              <DropdownItem
                                active={m.role === "admin"}
                                onClick={() => {
                                  changeRole(m, "admin");
                                  close();
                                }}
                              >
                                <ShieldCheck size={14} />
                                <span className="flex-1">Admin</span>
                                {m.role === "admin" && <Check size={14} className="text-primary" />}
                              </DropdownItem>
                              <DropdownItem
                                active={m.role === "member"}
                                onClick={() => {
                                  changeRole(m, "member");
                                  close();
                                }}
                              >
                                <Users size={14} />
                                <span className="flex-1">Member</span>
                                {m.role === "member" && <Check size={14} className="text-primary" />}
                              </DropdownItem>
                            </>
                          )}
                        </Dropdown>

                        <button
                          type="button"
                          onClick={() => setRemoveTarget(m)}
                          disabled={isSelf}
                          aria-label={`Remove ${m.member_detail.name}`}
                          title={isSelf ? "You can't remove yourself" : "Remove from workspace"}
                          className="cursor-pointer rounded-lg p-2 text-ink-faint transition-colors duration-150 hover:bg-[#E2445C]/10 hover:text-[#E2445C] disabled:cursor-not-allowed disabled:opacity-30"
                        >
                          <Trash2 size={15} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {/* Pending invites */}
            <section className="rounded-2xl border border-edge bg-surface-raised shadow-card">
              <h2 className="flex items-center gap-2 border-b border-edge px-5 py-3.5 text-[15px] font-semibold text-ink">
                <Mail size={16} className="text-ink-faint" /> Pending invites
                <span className="text-[12.5px] font-medium text-ink-faint">{invites.length}</span>
              </h2>
              {invites.length === 0 ? (
                <p className="px-5 py-6 text-center text-[13px] text-ink-faint">
                  No pending invites. Create one above to bring someone in.
                </p>
              ) : (
                <ul>
                  {invites.map((inv) => (
                    <li key={inv.id} className="flex flex-wrap items-center gap-3 border-b border-edge px-5 py-3 last:border-b-0">
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-sunken text-ink-faint">
                        <Mail size={15} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13.5px] font-semibold text-ink">{inv.email}</p>
                        <p className="truncate text-[12px] text-ink-faint">
                          {inv.role} · invited by {inv.invited_by_detail?.name ?? "—"} · expires{" "}
                          {formatRelativeTime(inv.expires_at).replace(" ago", "")}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => copy(inv)}
                        aria-label={`Copy invite link for ${inv.email}`}
                        className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-edge px-2.5 text-[12.5px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-primary"
                      >
                        {copiedId === inv.id ? <Check size={13} className="text-[#10B981]" /> : <Copy size={13} />}
                        Copy link
                      </button>
                      <button
                        type="button"
                        onClick={() => revokeInvite(inv)}
                        aria-label={`Revoke invite for ${inv.email}`}
                        className="cursor-pointer rounded-lg p-2 text-ink-faint transition-colors duration-150 hover:bg-[#E2445C]/10 hover:text-[#E2445C]"
                      >
                        <Trash2 size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={!!removeTarget}
        title="Remove member?"
        message={`${removeTarget?.member_detail.name} will lose access to the workspace and all of its boards. Their past comments and assignments are kept.`}
        confirmLabel="Remove"
        onCancel={() => setRemoveTarget(null)}
        onConfirm={() => {
          const target = removeTarget!;
          setRemoveTarget(null);
          removeMember(target);
        }}
      />
      <BottomTabBar />
    </div>
  );
}
