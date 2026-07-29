"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Slack, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { SlackChannel, WorkspaceSlackStatus } from "@/lib/types";

/**
 * Workspace-level Slack settings (leave notifications). Mirrors the per-board
 * SlackModal but targets /workspaces/{id}/slack/* and a single "leave" event.
 */
export function WorkspaceSlackModal({
  open,
  onClose,
  workspaceId,
}: {
  open: boolean;
  onClose: () => void;
  workspaceId: number;
}) {
  const [status, setStatus] = useState<WorkspaceSlackStatus | null>(null);
  const [channels, setChannels] = useState<SlackChannel[]>([]);
  const [loading, setLoading] = useState(false);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [channelId, setChannelId] = useState("");
  const [notifyLeave, setNotifyLeave] = useState(true);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get<WorkspaceSlackStatus>(`/workspaces/${workspaceId}/slack/`);
      setStatus(data);
      if (data.channel) {
        setChannelId(data.channel.channel_id);
        setNotifyLeave(data.channel.notify_leave);
      }
      if (data.workspace_connected && data.can_manage) {
        setChannelsLoading(true);
        try {
          const res = await api.get<{ channels: SlackChannel[] }>(
            `/workspaces/${workspaceId}/slack/channels/`
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
  }, [workspaceId]);

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
        `/slack/oauth/url/?workspace=${workspaceId}&return_to=${encodeURIComponent("/leaves")}`
      );
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
      await api.post(`/workspaces/${workspaceId}/slack/channel/`, {
        channel_id: channelId,
        channel_name: chosen?.name ?? "",
        notify_leave: notifyLeave,
        active: true,
      });
      toast.success("Slack leave notifications saved");
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
      await api.delete(`/workspaces/${workspaceId}/slack/channel/`);
      toast.success("Channel disconnected");
      onClose();
    } catch {
      toast.error("Couldn't disconnect");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Slack leave notifications"
    >
      <div
        className="w-full max-w-md animate-pop-in rounded-xl border border-edge bg-surface-raised p-5 shadow-pop"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-[15.5px] font-bold text-ink">
            <Slack size={17} /> Leave notifications
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
          Post a message to a Slack channel whenever someone requests time off.
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
                Connect your Slack workspace to start posting leave requests.
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
                    ? `Leave requests are posted to #${status.channel.channel_name}.`
                    : "Leave requests aren't posted to any channel yet."}
                  <br />
                  Only a workspace admin can change Slack settings.
                </p>
              ) : (
                <>
                  <label className="block">
                    <span className="mb-1.5 block text-[12.5px] font-medium text-ink-muted">
                      Channel
                    </span>
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
                    <p className="mt-1.5 text-[11.5px] text-ink-faint">
                      For a private channel, invite the app with{" "}
                      <code className="rounded bg-surface-sunken px-1">/invite @HQ Baboons</code> first.
                    </p>
                  </label>

                  <div className="mt-4">
                    <button
                      type="button"
                      onClick={() => setNotifyLeave((v) => !v)}
                      className="flex w-full items-center gap-2.5 rounded-lg border border-edge px-3 py-2 text-left transition-colors duration-150 hover:bg-surface-sunken"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12.5px] font-semibold text-ink">
                          Leave requests
                        </span>
                        <span className="block text-[11px] text-ink-faint">
                          When someone requests time off.
                        </span>
                      </span>
                      <span
                        className={cn(
                          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-md border transition-colors duration-150",
                          notifyLeave ? "border-primary bg-primary text-white" : "border-edge text-transparent"
                        )}
                      >
                        <Check size={12} />
                      </span>
                    </button>
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
