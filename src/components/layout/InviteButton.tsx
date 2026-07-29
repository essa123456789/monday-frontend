"use client";

import { useState } from "react";
import { Check, Copy, Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useBoardStore } from "@/store/boardStore";
import { Dropdown } from "@/components/ui/Dropdown";
import { cn, formatRelativeTime } from "@/lib/utils";
import type { Invite } from "@/lib/types";

function inviteLink(token: string): string {
  return `${window.location.origin}/register?token=${token}`;
}

export function InviteButton() {
  const currentMember = useBoardStore((s) => s.currentMember);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"member" | "admin">("member");
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  if (currentMember?.role !== "admin") return null;

  const loadInvites = async () => {
    try {
      setInvites(await api.get<Invite[]>("/invites/"));
    } catch {
      /* non-critical */
    }
  };

  const copy = async (invite: Invite, message = "Invite link copied") => {
    try {
      await navigator.clipboard.writeText(inviteLink(invite.token));
      setCopiedId(invite.id);
      setTimeout(() => setCopiedId(null), 1500);
      toast.success(message);
    } catch {
      toast.error("Could not copy — copy it manually: " + inviteLink(invite.token));
    }
  };

  const submit = async () => {
    const e = email.trim().toLowerCase();
    if (!e || !e.includes("@") || sending) return;
    setSending(true);
    try {
      const invite = await api.post<Invite>("/invites/", { email: e, role });
      setEmail("");
      setInvites((prev) => [invite, ...prev.filter((i) => i.id !== invite.id)]);
      if (invite.emailed) {
        toast.success(`Invite sent to ${e}`);
      } else {
        // Mail didn't go out — fall back to the link so the invite isn't stranded.
        await copy(invite, "Couldn't send the email — invite link copied instead");
      }
    } catch (err) {
      const msg = err instanceof Error && err.message.includes("already a member")
        ? "This person is already a member."
        : "Failed to create invite";
      toast.error(msg);
    }
    setSending(false);
  };

  const revoke = async (invite: Invite) => {
    setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    try {
      await api.delete(`/invites/${invite.id}/`);
      toast.success("Invite revoked");
    } catch {
      loadInvites();
      toast.error("Failed to revoke invite");
    }
  };

  return (
    <Dropdown
      align="right"
      width={340}
      onOpenChange={(open) => open && loadInvites()}
      trigger={
        <button
          type="button"
          className="flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-edge px-3 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
        >
          <UserPlus size={15} /> <span className="hidden sm:inline">Invite</span>
        </button>
      }
    >
      <div className="p-1">
        <p className="px-1.5 pt-0.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
          Invite to workspace
        </p>
        <p className="px-1.5 pb-2 pt-1 text-[11.5px] text-ink-muted">
          We&apos;ll email them a single-use invite link, valid for 7 days.
        </p>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          type="email"
          placeholder="teammate@company.com"
          aria-label="Invite email"
          className="mb-2 h-9 w-full rounded-lg border border-edge bg-surface-sunken px-2.5 text-[13px] text-ink outline-none transition-colors duration-150 placeholder:text-ink-faint focus:border-primary"
        />
        <div className="mb-2 flex gap-1 rounded-lg bg-surface-sunken p-1">
          {(["member", "admin"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRole(r)}
              className={cn(
                "flex-1 cursor-pointer rounded-md py-1 text-[12px] font-medium capitalize transition-colors duration-150",
                role === r ? "bg-surface-raised text-ink shadow-card" : "text-ink-muted hover:text-ink"
              )}
            >
              {r}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!email.trim() || sending}
          className="h-9 w-full cursor-pointer rounded-lg bg-primary text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? "Sending…" : "Send invite"}
        </button>

        {invites.length > 0 && (
          <>
            <p className="px-1.5 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              Pending invites
            </p>
            <ul className="max-h-48 space-y-1 overflow-y-auto nice-scroll">
              {invites.map((inv) => (
                <li key={inv.id} className="flex items-center gap-2 rounded-md px-1.5 py-1.5 hover:bg-surface-sunken">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12.5px] font-medium text-ink">{inv.email}</p>
                    <p className="text-[11px] text-ink-faint">
                      {inv.role} · expires {formatRelativeTime(inv.expires_at).replace(" ago", "")}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => copy(inv)}
                    aria-label={`Copy invite link for ${inv.email}`}
                    className="cursor-pointer rounded-md p-1.5 text-ink-faint transition-colors duration-150 hover:bg-edge hover:text-primary"
                  >
                    {copiedId === inv.id ? <Check size={14} className="text-[#10B981]" /> : <Copy size={14} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => revoke(inv)}
                    aria-label={`Revoke invite for ${inv.email}`}
                    className="cursor-pointer rounded-md p-1.5 text-ink-faint transition-colors duration-150 hover:bg-[#E2445C]/10 hover:text-[#E2445C]"
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Dropdown>
  );
}
