import { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <span className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary-soft text-primary dark:bg-primary/15">
        {icon}
      </span>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <p className="mt-1 max-w-xs text-[13px] leading-relaxed text-ink-muted">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
