"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Check, KeyRound, Loader2, LogOut, Slack, Trash2, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { clearSession, getSession, logout, saveSession, updateSessionMember } from "@/lib/auth";
import { useBoardStore } from "@/store/boardStore";
import { Sidebar } from "@/components/layout/Sidebar";
import { BottomTabBar } from "@/components/layout/BottomTabBar";
import { ThemeToggle } from "@/components/layout/TopBar";
import { NotificationsBell } from "@/components/layout/NotificationsBell";
import { RealtimeClient } from "@/components/layout/RealtimeClient";
import { Avatar } from "@/components/ui/Avatar";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { SearchSelect } from "@/components/ui/SearchSelect";
import {
  countryOptions,
  detectTimezone,
  timezoneLocalTime,
  timezoneOffsetLabel,
  timezoneOptions,
} from "@/lib/locations";
import type { AuthSession } from "@/lib/auth";
import type { Member } from "@/lib/types";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

/** Pull the first useful message out of an API error body. */
function fieldError(err: unknown, fallback: string): string {
  if (err instanceof Error) {
    const match = /"(?:detail|name|email|avatar|country|timezone|current_password|new_password)"\s*:\s*"?\[?"?([^"\]]+)/.exec(
      err.message
    );
    if (match) return match[1];
  }
  return fallback;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium text-ink-muted">{label}</span>
      {children}
    </label>
  );
}

const inputClass =
  "h-10 w-full rounded-lg border border-edge bg-surface-sunken px-3 text-[13.5px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint focus:border-primary";

export default function ProfilePage() {
  const router = useRouter();
  const init = useBoardStore((s) => s.init);
  const workspaces = useBoardStore((s) => s.workspaces);
  const currentMember = useBoardStore((s) => s.currentMember);
  const setCurrentMember = useBoardStore((s) => s.setCurrentMember);

  const [authed, setAuthed] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  // Built from Intl, so they only need computing once per mount.
  const countryChoices = useMemo(
    () =>
      countryOptions().map((c) => ({
        value: c.code,
        label: c.name,
        prefix: <span className="shrink-0 text-[15px] leading-none">{c.flag}</span>,
        keywords: c.code,
      })),
    []
  );
  const zoneChoices = useMemo(
    () => timezoneOptions().map((z) => ({ value: z.zone, label: z.label, hint: z.offset })),
    []
  );
  const detectedZone = useMemo(() => detectTimezone(), []);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState("");
  const [zone, setZone] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const [slackBusy, setSlackBusy] = useState(false);

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

  // Seed the form once the profile arrives.
  useEffect(() => {
    if (currentMember) {
      setName(currentMember.name);
      setEmail(currentMember.email);
      setBirthday(currentMember.birthday ?? "");
      setPhone(currentMember.phone ?? "");
      setCountry(currentMember.country ?? "");
      setZone(currentMember.timezone ?? "");
    }
  }, [currentMember]);

  // Handle the return trip from the per-user "Connect Slack" flow.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const result = new URLSearchParams(window.location.search).get("slack");
    if (!result) return;
    const messages: Record<string, () => void> = {
      user_connected: () => toast.success("Slack connected — check your DMs 👋"),
      email_mismatch: () =>
        toast.error("That Slack account's email doesn't match your account email"),
      already_linked: () => toast.error("That Slack account is already linked to another member"),
      denied: () => toast.error("Slack connection was cancelled"),
      error: () => toast.error("Slack connection failed — please try again"),
    };
    (messages[result] ?? (() => {}))();
    // Refresh the profile so the connected state reflects the change.
    api
      .get<Member>("/auth/me/")
      .then((m) => {
        setCurrentMember(m);
        updateSessionMember(m);
      })
      .catch(() => {});
    router.replace("/profile");
  }, [router, setCurrentMember]);

  if (!authed || !currentMember) return null;

  const applyMember = (member: Member) => {
    setCurrentMember(member);
    updateSessionMember(member);
  };

  const dirty =
    name.trim() !== currentMember.name ||
    birthday !== (currentMember.birthday ?? "") ||
    phone.trim() !== (currentMember.phone ?? "") ||
    country !== (currentMember.country ?? "") ||
    zone !== (currentMember.timezone ?? "");

  const saveProfile = async () => {
    if (!dirty || savingProfile) return;
    setSavingProfile(true);
    try {
      const updated = await api.patch<Member>("/auth/me/", {
        name: name.trim(),
        birthday,
        phone: phone.trim(),
        country,
        timezone: zone,
      });
      applyMember(updated);
      toast.success("Profile updated");
    } catch (err) {
      toast.error(fieldError(err, "Could not save your profile"));
    }
    setSavingProfile(false);
  };

  const uploadAvatar = async (file: File) => {
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const form = new FormData();
      form.append("avatar", file);
      const updated = await api.patchForm<Member>("/auth/me/", form);
      applyMember(updated);
      toast.success("Profile picture updated");
    } catch (err) {
      toast.error(fieldError(err, "Could not upload that image"));
    }
    setUploading(false);
    if (fileInput.current) fileInput.current.value = "";
  };

  const removeAvatar = async () => {
    setUploading(true);
    try {
      const updated = await api.patch<Member>("/auth/me/", { remove_avatar: true });
      applyMember(updated);
      toast.success("Profile picture removed");
    } catch (err) {
      toast.error(fieldError(err, "Could not remove the picture"));
    }
    setUploading(false);
  };

  const changePassword = async () => {
    if (savingPassword) return;
    if (newPassword.length < 8) {
      toast.error("New password must be at least 8 characters");
      return;
    }
    setSavingPassword(true);
    try {
      // The API hands back a fresh token pair so the session survives the change.
      const session = await api.post<AuthSession>("/auth/change-password/", {
        current_password: currentPassword,
        new_password: newPassword,
      });
      if (session.access) saveSession(session);
      setCurrentPassword("");
      setNewPassword("");
      toast.success("Password changed");
    } catch (err) {
      toast.error(fieldError(err, "Could not change your password"));
    }
    setSavingPassword(false);
  };

  const connectSlack = async () => {
    setSlackBusy(true);
    try {
      const { url } = await api.get<{ url: string }>(
        `/slack/user/url/?return_to=${encodeURIComponent("/profile")}`
      );
      window.location.href = url;
    } catch {
      setSlackBusy(false);
      toast.error("Couldn't start the Slack connection");
    }
  };

  const disconnectSlack = async () => {
    setSlackBusy(true);
    try {
      await api.delete("/slack/user/");
      applyMember({ ...currentMember, slack_connected: false });
      toast.success("Slack disconnected");
    } catch {
      toast.error("Couldn't disconnect Slack");
    }
    setSlackBusy(false);
  };

  const deleteAccount = async () => {
    setDeleting(true);
    try {
      await api.delete("/auth/me/");
      clearSession();
      toast.success("Your account has been deleted");
      window.location.href = "/";
    } catch (err) {
      setDeleting(false);
      setConfirmDelete(false);
      toast.error(fieldError(err, "Could not delete your account"));
    }
  };

  return (
    <div className="flex h-screen overflow-hidden p-3 pb-20 gap-3 md:p-6 md:gap-6">
      <RealtimeClient />
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-20 shrink-0 items-center gap-3 border-b border-edge bg-surface px-4 md:px-6 rounded-2xl border-[1px] border-[#E7E9EB] dark:border-[#1E2128]">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary dark:bg-primary/20">
            <UserIcon size={17} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-[17px] font-bold text-ink">Profile</h1>
            <p className="hidden truncate text-[12px] text-ink-faint md:block">
              Manage your account details and password
            </p>
          </div>
          <NotificationsBell />
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-y-auto nice-scroll p-4 md:p-6">
          <div className="mx-auto max-w-2xl space-y-4">
            {/* Identity */}
            <section className="rounded-2xl border border-edge bg-surface-raised p-5 shadow-card">
              <div className="flex items-center gap-4">
                <Avatar member={currentMember} size={68} />
                <div className="min-w-0">
                  <p className="truncate text-[15px] font-semibold text-ink">{currentMember.name}</p>
                  <p className="truncate text-[12.5px] text-ink-faint">{currentMember.email}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInput.current?.click()}
                      disabled={uploading}
                      className="flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-edge px-2.5 text-[12.5px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {uploading ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
                      {currentMember.avatar ? "Change picture" : "Upload picture"}
                    </button>
                    {currentMember.avatar && (
                      <button
                        type="button"
                        onClick={removeAvatar}
                        disabled={uploading}
                        className="h-8 cursor-pointer rounded-lg px-2 text-[12.5px] font-medium text-ink-faint transition-colors duration-150 hover:text-[#E2445C] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInput}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadAvatar(file);
                    }}
                  />
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Field label="Name">
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={inputClass}
                    placeholder="Your name"
                  />
                </Field>
                <Field label="Email">
                  <input
                    value={email}
                    type="email"
                    readOnly
                    disabled
                    className={`${inputClass} cursor-not-allowed opacity-70`}
                    placeholder="you@company.com"
                  />
                </Field>
                <Field label="Birthday">
                  <input
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    type="date"
                    className={inputClass}
                  />
                </Field>
                <Field label="Phone number">
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    type="tel"
                    className={inputClass}
                    placeholder="+1 555 123 4567"
                  />
                </Field>
                <Field label="Country">
                  <SearchSelect
                    value={country}
                    onChange={setCountry}
                    options={countryChoices}
                    placeholder="Select your country"
                    searchPlaceholder="Search countries…"
                    emptyText="No country matches that"
                    ariaLabel="Country"
                  />
                </Field>
                <Field label="Time zone">
                  <SearchSelect
                    value={zone}
                    onChange={setZone}
                    options={zoneChoices}
                    placeholder="Select your time zone"
                    searchPlaceholder="Search time zones…"
                    emptyText="No time zone matches that"
                    ariaLabel="Time zone"
                  />
                </Field>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] text-ink-faint">
                {zone ? (
                  <span>
                    Local time for you is{" "}
                    <span className="font-semibold text-ink-muted">{timezoneLocalTime(zone)}</span>{" "}
                    ({timezoneOffsetLabel(zone)}).
                  </span>
                ) : (
                  <span>Set your time zone so teammates can tell when you&apos;re around.</span>
                )}
                {zone !== detectedZone && (
                  <button
                    type="button"
                    onClick={() => setZone(detectedZone)}
                    className="cursor-pointer font-semibold text-primary transition-colors duration-150 hover:underline"
                  >
                    Use this device&apos;s zone ({detectedZone.replace(/_/g, " ")})
                  </button>
                )}
              </div>
              <p className="mt-2 text-[11.5px] text-ink-faint">
                Your email is your login and can&apos;t be changed — it stays the address you were invited with.
              </p>

              <button
                type="button"
                onClick={saveProfile}
                disabled={!dirty || !name.trim() || savingProfile}
                className="mt-4 flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingProfile && <Loader2 size={14} className="animate-spin" />}
                Save changes
              </button>
            </section>

            {/* Password */}
            <section className="rounded-2xl border border-edge bg-surface-raised p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                <KeyRound size={16} className="text-ink-faint" /> Password
              </h2>
              <p className="mt-0.5 text-[12.5px] text-ink-muted">
                Use at least 8 characters. You&apos;ll stay signed in on this device.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Field label="Current password">
                  <input
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    type="password"
                    autoComplete="current-password"
                    className={inputClass}
                    placeholder="••••••••"
                  />
                </Field>
                <Field label="New password">
                  <input
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && changePassword()}
                    type="password"
                    autoComplete="new-password"
                    className={inputClass}
                    placeholder="••••••••"
                  />
                </Field>
              </div>
              <button
                type="button"
                onClick={changePassword}
                disabled={!currentPassword || !newPassword || savingPassword}
                className="mt-4 flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingPassword && <Loader2 size={14} className="animate-spin" />}
                Update password
              </button>
            </section>

            {/* Slack */}
            <section className="rounded-2xl border border-edge bg-surface-raised p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                <Slack size={16} className="text-ink-faint" /> Slack
              </h2>
              <p className="mt-0.5 text-[12.5px] text-ink-muted">
                Connect your own Slack account to get your task and mention notifications as
                direct messages.
              </p>
              {currentMember.slack_connected ? (
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/10 px-2.5 py-1 text-[12.5px] font-medium text-emerald-600 dark:text-emerald-400">
                    <Check size={13} /> Connected
                  </span>
                  <button
                    type="button"
                    onClick={disconnectSlack}
                    disabled={slackBusy}
                    className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-edge px-3 text-[12.5px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {slackBusy && <Loader2 size={13} className="animate-spin" />}
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={connectSlack}
                  disabled={slackBusy}
                  className="mt-3 flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {slackBusy ? <Loader2 size={14} className="animate-spin" /> : <Slack size={15} />}
                  Connect Slack
                </button>
              )}
              <p className="mt-2 text-[11.5px] text-ink-faint">
                We only read your Slack identity to match it with your account email — you can only
                connect the Slack account that shares your email. Disconnect anytime.
              </p>
            </section>

            {/* Session */}
            <section className="rounded-2xl border border-edge bg-surface-raised p-5 shadow-card">
              <h2 className="text-[15px] font-semibold text-ink">Session</h2>
              <p className="mt-0.5 text-[12.5px] text-ink-muted">
                Sign out of WorkBoard on this device.
              </p>
              <button
                type="button"
                onClick={() => logout()}
                className="mt-3 flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-edge px-4 text-[13px] font-semibold text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
              >
                <LogOut size={14} /> Log out
              </button>
            </section>

            {/* Danger zone */}
            <section className="rounded-2xl border border-[#E2445C]/30 bg-surface-raised p-5 shadow-card">
              <h2 className="flex items-center gap-2 text-[15px] font-semibold text-[#E2445C]">
                <Trash2 size={16} /> Delete account
              </h2>
              <p className="mt-0.5 text-[12.5px] text-ink-muted">
                Permanently deletes your account, your profile and the comments you&apos;ve written.
                Boards and tasks stay with the workspace. This can&apos;t be undone.
              </p>
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="mt-3 flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-[#E2445C] px-4 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-[#c93b50]"
              >
                Delete my account
              </button>
            </section>
          </div>
        </main>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete your account?"
        message={`This permanently deletes ${currentMember.email}, your profile picture and your comments. This can't be undone.`}
        confirmLabel={deleting ? "Deleting…" : "Delete account"}
        onConfirm={deleteAccount}
        onCancel={() => setConfirmDelete(false)}
      />
      <BottomTabBar />
    </div>
  );
}
