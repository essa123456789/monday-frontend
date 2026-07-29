'use client';

import {WorkspaceBoardList} from '@/components/layout/WorkspaceBoardList';
import {cn} from '@/lib/utils';
import {useBoardStore} from '@/store/boardStore';
import {useLeaveStore} from '@/store/leaveStore';
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Globe,
  LayoutDashboard,
  LayoutGrid,
  ListTodo,
  Lock,
  Palmtree,
  ShieldCheck,
} from 'lucide-react';
import {useParams, usePathname, useRouter} from 'next/navigation';
import {useEffect, useState} from 'react';

export function Sidebar() {
  const router = useRouter();
  const params = useParams<{id?: string}>();
  const pathname = usePathname();
  const activeBoardId = params?.id ? Number(params.id) : null;
  const onOverview = pathname?.startsWith('/overview') ?? false;
  const onMyWork = pathname?.startsWith('/mywork') ?? false;
  const onCalendar = pathname?.startsWith('/calendar') ?? false;
  const onLeaves = pathname?.startsWith('/leaves') ?? false;
  const onTeam = pathname?.startsWith('/team') ?? false;

  const workspaces = useBoardStore((s) => s.workspaces);
  const currentMember = useBoardStore((s) => s.currentMember);

  const [collapsed, setCollapsed] = useState(false);

  const isAdmin = currentMember?.role === 'admin';
  const pendingLeaves = useLeaveStore((s) => s.pendingCount);

  useEffect(() => {
    if (isAdmin) useLeaveStore.getState().refresh();
  }, [isAdmin]);

  const ws = workspaces[0];

  return (
    <aside
      className={cn(
        // Sidebar is a desktop-only affordance; on small screens navigation
        // moves to the BottomTabBar and boards live on the dedicated /boards page.
        'relative z-30 hidden h-full shrink-0 flex-col rounded-2xl bg-surface transition-[width] duration-300 ease-in-out border-[1px] border-[#E7E9EB] dark:border-[#1E2128] md:flex',
        collapsed ? 'w-[56px]' : 'w-[275px]'
      )}>
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        className="absolute -right-3 top-6 z-40 flex h-6 w-6 cursor-pointer items-center justify-center rounded-full border border-edge bg-surface-raised text-ink-muted shadow-card transition-colors duration-150 hover:bg-primary hover:text-white">
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      <div className="flex items-center gap-2.5 px-4 pb-2 pt-5">
        {/* The company's own mark once an admin uploads one; the default
            WorkBoard badge until then. */}
        {ws?.logo ? (
          // eslint-disable-next-line @next/next/no-img-element -- logos come from the API host, not the Next image loader
          <img
            src={ws.logo}
            alt={ws.name}
            className="h-8 w-8 shrink-0 rounded-lg object-contain"
          />
        ) : (
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-white">
            <LayoutGrid size={17} />
          </span>
        )}
        {!collapsed && (
          <span className="truncate text-[16px] font-bold text-ink">
            {ws?.brand_name || 'WorkBoard'}
          </span>
        )}
      </div>

      <nav className="mt-2 flex-1 overflow-y-auto px-2 nice-scroll">
        <button
          type="button"
          onClick={() => router.push('/overview')}
          className={cn(
            'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors duration-150',
            collapsed && 'justify-center',
            onOverview
              ? 'bg-primary-soft font-semibold text-primary dark:bg-primary/20'
              : 'font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink'
          )}>
          <LayoutDashboard size={17} className="shrink-0" />
          {!collapsed && 'Overview'}
        </button>

        <button
          type="button"
          onClick={() => router.push('/mywork')}
          className={cn(
            'mt-0.5 flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors duration-150',
            collapsed && 'justify-center',
            onMyWork
              ? 'bg-primary-soft font-semibold text-primary dark:bg-primary/20'
              : 'font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink'
          )}>
          <ListTodo size={17} className="shrink-0" />
          {!collapsed && 'My Work'}
        </button>

        <button
          type="button"
          onClick={() => router.push('/calendar')}
          className={cn(
            'mt-0.5 flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors duration-150',
            collapsed && 'justify-center',
            onCalendar
              ? 'bg-primary-soft font-semibold text-primary dark:bg-primary/20'
              : 'font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink'
          )}>
          <CalendarDays size={17} className="shrink-0" />
          {!collapsed && 'Calendar'}
        </button>

        <button
          type="button"
          onClick={() => router.push('/leaves')}
          className={cn(
            'mt-0.5 flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors duration-150',
            collapsed && 'justify-center',
            onLeaves
              ? 'bg-primary-soft font-semibold text-primary dark:bg-primary/20'
              : 'font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink'
          )}>
          <span className="relative shrink-0">
            <Palmtree size={17} />
            {isAdmin && pendingLeaves > 0 && collapsed && (
              <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#FDAB3D] ring-2 ring-surface" />
            )}
          </span>
          {!collapsed && <span className="flex-1 truncate text-left">Leave</span>}
          {!collapsed && isAdmin && pendingLeaves > 0 && (
            <span
              title={`${pendingLeaves} pending leave request${pendingLeaves === 1 ? '' : 's'}`}
              className="flex h-[18px] min-w-[18px] shrink-0 items-center justify-center rounded-full bg-[#E2445C] px-1.5 text-[10.5px] font-bold leading-none text-white">
              {pendingLeaves}
            </span>
          )}
        </button>

        {currentMember?.role === 'admin' && (
          <button
            type="button"
            onClick={() => router.push('/team')}
            className={cn(
              'mt-0.5 flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors duration-150',
              collapsed && 'justify-center',
              onTeam
                ? 'bg-primary-soft font-semibold text-primary dark:bg-primary/20'
                : 'font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink'
            )}>
            <ShieldCheck size={17} className="shrink-0" />
            {!collapsed && 'Administration'}
          </button>
        )}

        {!collapsed && <WorkspaceBoardList />}

        {collapsed && (
          <div className="mt-4">
            <ul className="space-y-0.5">
              {(ws?.boards ?? []).map((board) => (
                <li key={board.id} className="group relative">
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/board/${board.id}`)}
                    onKeyDown={(e) => e.key === 'Enter' && router.push(`/board/${board.id}`)}
                    className={cn(
                      'flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] transition-colors duration-150',
                      activeBoardId === board.id
                        ? 'bg-primary-soft font-semibold text-primary dark:bg-primary/20'
                        : 'font-medium text-ink-muted hover:bg-surface-sunken hover:text-ink'
                    )}
                    title={board.name}>
                    {board.visibility === 'private' ? (
                      <Lock size={17} className="shrink-0" aria-label="Private board" />
                    ) : (
                      <Globe size={17} className="shrink-0" aria-label="Public board" />
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </nav>
    </aside>
  );
}
