import { cn } from "@/lib/utils";
import type { Member } from "@/lib/types";

export function Avatar({ member, size = 28, className }: { member: Member; size?: number; className?: string }) {
  if (member.avatar) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- avatars come from the API host, not the Next image loader
      <img
        src={member.avatar}
        alt={member.name}
        title={member.name}
        className={cn("inline-block shrink-0 select-none rounded-full object-cover ring-2 ring-surface-raised bg-[#E8EBEE]", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      title={member.name}
      className={cn(
        "inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ring-2 ring-surface-raised",
        className
      )}
      style={{ width: size, height: size, backgroundColor: member.color, fontSize: size * 0.38 }}
    >
      {member.initials}
    </span>
  );
}

export function AvatarStack({ members, size = 26, max = 3 }: { members: Member[]; size?: number; max?: number }) {
  if (members.length === 0) return null;
  const visible = members.slice(0, max);
  const extra = members.length - visible.length;
  return (
    <span className="flex items-center -space-x-1.5 bg-[#E8EBEE] rounded-full">
      {visible.map((m) => (
        <Avatar key={m.id} member={m} size={size} />
      ))}
      {extra > 0 && (
        <span
          className="inline-flex items-center justify-center rounded-full bg-surface-sunken font-semibold text-ink-muted ring-2 ring-surface-raised"
          style={{ width: size, height: size, fontSize: size * 0.36 }}
        >
          +{extra}
        </span>
      )}
    </span>
  );
}
