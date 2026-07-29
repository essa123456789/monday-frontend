'use client';

import {cn} from '@/lib/utils';
import {useBoardStore} from '@/store/boardStore';
import {useLeaveStore} from '@/store/leaveStore';
import {
  CalendarDays,
  LayoutDashboard,
  LayoutGrid,
  ListTodo,
  Palmtree,
  User,
} from 'lucide-react';
import {usePathname, useRouter} from 'next/navigation';

const TABS = [
  {
    label: 'Overview',
    href: '/overview',
    icon: LayoutDashboard,
    match: (path: string) => path.startsWith('/overview'),
  },
  {
    label: 'My Work',
    href: '/mywork',
    icon: ListTodo,
    match: (path: string) => path.startsWith('/mywork'),
  },
  {
    label: 'Boards',
    href: '/boards',
    icon: LayoutGrid,
    match: (path: string) => path.startsWith('/boards') || path.startsWith('/board/'),
  },
  {
    label: 'Calendar',
    href: '/calendar',
    icon: CalendarDays,
    match: (path: string) => path.startsWith('/calendar'),
  },
  {
    label: 'Leave',
    href: '/leaves',
    icon: Palmtree,
    match: (path: string) => path.startsWith('/leaves'),
  },
  {
    label: 'Profile',
    href: '/profile',
    icon: User,
    match: (path: string) => path.startsWith('/profile'),
  },
];

/** Mobile-only bottom navigation, replacing the sidebar below the `md` breakpoint. */
export function BottomTabBar() {
  const router = useRouter();
  const pathname = usePathname() ?? '';

  const currentMember = useBoardStore((s) => s.currentMember);
  const isAdmin = currentMember?.role === 'admin';
  const pendingLeaves = useLeaveStore((s) => s.pendingCount);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-edge bg-surface pb-[env(safe-area-inset-bottom)] md:hidden">
      {TABS.map(({label, href, icon: Icon, match}) => {
        const active = match(pathname);
        return (
          <button
            key={href}
            type="button"
            onClick={() => router.push(href)}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 cursor-pointer flex-col items-center justify-center gap-1 text-[11px] transition-colors duration-150',
              active ? 'font-semibold text-primary' : 'font-medium text-ink-faint'
            )}>
            <span className="relative">
              <Icon size={20} />
              {label === 'Leave' && isAdmin && pendingLeaves > 0 && (
                <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-[#FDAB3D] ring-2 ring-surface" />
              )}
            </span>
            {label}
          </button>
        );
      })}
    </nav>
  );
}
