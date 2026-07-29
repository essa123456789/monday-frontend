import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-ink-faint/15", className)} />;
}

export function BoardSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden p-6">
      {[0, 1, 2, 3].map((col) => (
        <div key={col} className="w-[320px] shrink-0 space-y-3">
          <Skeleton className="h-9 w-full rounded-lg" />
          {Array.from({ length: 3 - (col % 2) }).map((_, i) => (
            <Skeleton key={i} className="h-[120px] w-full rounded-2xl" />
          ))}
        </div>
      ))}
    </div>
  );
}
