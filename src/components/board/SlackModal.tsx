"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Slack, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { SlackChannel, SlackStatus } from "@/lib/types";

type EventKey = "notify_status" | "notify_comment" | "notify_description" | "notify_assignee";

const EVENTS: { key: EventKey; label: string; hint: string }[] = [
  { key: "notify_status", label: "Moved to In Review", hint: "When a task moves into In Review." },
  { key: "notify_assignee", label: "Owner added", hint: "When someone is added as a task owner." },
  { key: "notify_comment", label: "New updates", hint: "DM the task's owners when someone posts an update." },
  { key: "notify_description", label: "Description edits", hint: "When a task description is updated." },
];

export function SlackModal({
  open,
  onClose,
  boardId,
  workspaceId,
  boardName,
}: {
  open: boolean;
  onClose: () => void;
  boardId: number;
  workspaceId: number;
  boardName: string;
}) {
  const [status, setStatus] = useState<SlackStatus | null>(null);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Local, editable copy of the settings.
  const [channelId, setChannelId] = useState("");
  const [events, setEvents] = useState<Record<EventKey, boolean>>({
    notify_status: true,
    notify_comment: true,
    notify_description: true,
    notify_assignee: true,
  });

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<SlackStatus>(`/boards/${boardId}/slack/`);
      setStatus(data);
      if (data.channel) {
        setChannelId(data.channel.channel_id);
        setEvents({
          notify_status: data.channel.notify_status,
          notify_comment: data.channel.notify_comment,
          notify_description: data.channel.notify_description,
          notify_assignee: data.channel.notify_assignee,
        });
      }
      // Only admins can list channels (the token lives server-side).
      if (data.workspace_connected && data.can_manage) {
        setChannelsLoading(true);
        try {
          const res = await api.get<{ channels: SlackChannel[] }>(
            `/boards/${boardId}/slack/channels/`
          );
          setChannels(res.channels);
        } catch {
          toast.error("Couldn't load Slack channels");
        } finally {
          setChannelsLoading(false);
        }
      }
    } catch {
      toast.error("Couldn't load Slack settings");
    } finally {
      setLoading(false);
    }
  }, [boardId]);

  useEffect(() => {
    if (open) loadStatus();
  }, [open, loadStatus]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const connect = async () => {
    try {
      const { url } = await api.get<{ url: string }>(
        `/slack/oauth/url/?workspace=${workspaceId}&board=${boardId}`
      );
      // Full-page navigation to Slack's consent screen; it redirects back to
      // the board with ?slack=connected, which the board page toasts on.
      window.location.href = url;
    } catch {
      toast.error("Couldn't start the Slack connection");
    }
  };

  const save = async () => {
    if (!channelId) {
      toast.error("Pick a channel first");
      return;
    }
    setSaving(true);
    try {
      const chosen = channels.find((c) => c.id === channelId);
      await api.post(`/boards/${boardId}/slack/channel/`, {
        channel_id: channelId,
        channel_name: chosen?.name ?? "",
        ...events,
        active: true,
      });
      toast.success("Slack notifications saved");
      onClose();
    } catch {
      toast.error("Couldn't save Slack settings");
    } finally {
      setSaving(false);
    }
  };

  const disconnect = async () => {
    setSaving(true);
    try {
      await api.delete(`/boards/${boardId}/slack/channel/`);
      toast.success("Channel disconnected");
      onClose();
    } catch {
      toast.error("Couldn't disconnect");
    } finally {
      setSaving(false);
    }
  };

  const toggle = (key: EventKey) => setEvents((e) => ({ ...e, [key]: !e[key] }));

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Slack notifications"
    >
      <div
        className="w-full max-w-md animate-pop-in rounded-xl border border-edge bg-surface-raised p-5 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[15.5px] font-bold text-ink">
            <Slack size={17} /> Slack notifications
          </h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="cursor-pointer rounded-md p-1 text-ink-faint transition-colors duration-150 hover:bg-surface-sunken hover:text-ink"
          >
            <X size={16} />
          </button>
        </div>
        <p className="mt-0.5 text-[12.5px] text-ink-muted">
          Post updates from <span className="font-semibold text-ink">{boardName}</span> to a Slack channel.
        </p>

        <div className="mt-4">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-ink-faint">
              <Loader2 size={18} className="animate-spin" />
            </div>
          ) : !status?.configured ? (
            <p className="rounded-lg border border-edge bg-surface-sunken px-3 py-3 text-[12.5px] text-ink-muted">
              Slack isn&apos;t set up on the server yet. Ask an administrator to add the Slack app
              credentials.
            </p>
          ) : !status.workspace_connected ? (
            <div className="rounded-lg border border-edge bg-surface-sunken px-3 py-4 text-center">
              <p className="text-[12.5px] text-ink-muted">
                Connect your Slack workspace once, then any board can post to a channel.
              </p>
              {status.can_manage ? (
                <button
                  type="button"
                  onClick={connect}
                  className="mx-auto mt-3 flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover"
                >
                  <Slack size={15} /> Connect Slack
                </button>
              ) : (
                <p className="mt-2 text-[11.5px] text-ink-faint">
                  Only a workspace admin can connect Slack.
                </p>
              )}
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center gap-1.5 text-[12px] text-ink-muted">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
                Connected to{" "}
                <span className="font-semibold text-ink">{status.team_name || "Slack"}</span>
              </div>

              {!status.can_manage ? (
                <p className="rounded-lg border border-edge bg-surface-sunken px-3 py-3 text-[12.5px] text-ink-muted">
                  {status.channel
                    ? `This board posts to #${status.channel.channel_name}.`
                    : "This board isn't posting to any channel yet."}
                  <br />
                  Only a workspace admin can change Slack settings.
                </p>
              ) : (
                <>
                  <label className="block">
                    <span className="mb-1.5 block text-[12.5px] font-medium text-ink-muted">
                      Channel
                    </span>
                    <div className="relative">
                      <select
                        value={channelId}
                        onChange={(e) => setChannelId(e.target.value)}
                        disabled={channelsLoading}
                        className="h-10 w-full cursor-pointer appearance-none rounded-lg border border-edge bg-surface-sunken px-3 text-[13.5px] text-ink outline-none transition-colors duration-150 focus:border-primary disabled:opacity-60"
                      >
                        <option value="">
                          {channelsLoading ? "Loading channels…" : "Select a channel…"}
                        </option>
                        {channels.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.is_private ? "🔒 " : "# "}
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="mt-1.5 text-[11.5px] text-ink-faint">
                      For a private channel, invite the app with{" "}
                      <code className="rounded bg-surface-sunken px-1">/invite @HQ Baboons</code> first.
                    </p>
                  </label>

                  <div className="mt-4">
                    <span className="mb-1.5 block text-[12.5px] font-medium text-ink-muted">
                      Notify on
                    </span>
                    <div className="space-y-1.5">
                      {EVENTS.map((ev) => {
                        const on = events[ev.key];
                        return (
                          <button
                            key={ev.key}
                            type="button"
                            onClick={() => toggle(ev.key)}
                            className="flex w-full items-center gap-2.5 rounded-lg border border-edge px-3 py-2 text-left transition-colors duration-150 hover:bg-surface-sunken"
                          >
                            <span className="min-w-0 flex-1">
                              <span className="block text-[12.5px] font-semibold text-ink">
                                {ev.label}
                              </span>
                              <span className="block text-[11px] text-ink-faint">{ev.hint}</span>
                            </span>
                            <span
                              className={cn(
                                "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-colors duration-150",
                                on ? "border-primary bg-primary text-white" : "border-edge text-transparent"
                              )}
                            >
                              <Check size={12} />
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {status?.workspace_connected && status.can_manage && (
          <div className="mt-5 flex items-center gap-2">
            {status.channel && (
              <button
                type="button"
                onClick={disconnect}
                disabled={saving}
                className="flex h-10 cursor-pointer items-center gap-1.5 rounded-lg px-3 text-[13px] font-medium text-[#E2445C] transition-colors duration-150 hover:bg-[#E2445C]/10 disabled:opacity-50"
              >
                <Trash2 size={14} /> Disconnect
              </button>
            )}
            <span className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="h-10 cursor-pointer rounded-lg px-4 text-[13px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-sunken"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={saving || !channelId}
              className="flex h-10 cursor-pointer items-center gap-2 rounded-lg bg-primary px-4 text-[13px] font-semibold text-white transition-colors duration-150 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
              Save
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
