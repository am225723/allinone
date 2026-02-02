'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface SidebarItem {
  href: string;
  icon: string;
  label: string;
  badge?: number;
}

const mainNavItems: SidebarItem[] = [
  { href: '/', icon: 'dashboard', label: 'Dashboard' },
  { href: '/patients', icon: 'clinical_notes', label: 'Patients' },
  { href: '/openphone', icon: 'sms', label: 'Quo' },
  { href: '/gmail', icon: 'mail', label: 'Mail' },
  { href: '/tasks', icon: 'task_alt', label: 'Tasks' },
  { href: '/search', icon: 'search', label: 'Search' },
];

const secondaryNavItems: SidebarItem[] = [
  { href: '/admin', icon: 'admin_panel_settings', label: 'Admin Panel' },
  { href: '/settings', icon: 'settings', label: 'Settings' },
];

const toolsNavItems: SidebarItem[] = [
  { href: '/openphone/review', icon: 'rate_review', label: 'Review Drafts' },
  { href: '/gmail/triage', icon: 'filter_alt', label: 'Email Triage' },
  { href: '/openphone/summaries', icon: 'summarize', label: 'Summaries' },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const NavItem = ({ item }: { item: SidebarItem }) => (
    <Link
      href={item.href}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
        isActive(item.href)
          ? 'bg-primary/15 text-primary border border-primary/20'
          : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
      }`}
    >
      <span className="material-symbols-outlined text-xl">{item.icon}</span>
      <span className="text-sm font-medium">{item.label}</span>
      {item.badge !== undefined && item.badge > 0 && (
        <span className="ml-auto px-2 py-0.5 text-xs rounded-full bg-primary/20 text-primary">
          {item.badge}
        </span>
      )}
    </Link>
  );

  return (
    <aside className="hidden lg:flex flex-col w-64 h-screen bg-[#141414] border-r border-white/5 fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-4 border-b border-white/5">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">CC</span>
          </div>
          <div>
            <h1 className="font-bold text-white">Command Center</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider">Unified Comms</p>
          </div>
        </Link>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 overflow-y-auto py-4 px-3">
        <div className="space-y-1">
          {mainNavItems.map((item) => (
            <NavItem key={item.href} item={item} />
          ))}
        </div>

        {/* Tools Section */}
        <div className="mt-6">
          <p className="px-3 text-[10px] uppercase tracking-wider text-gray-600 font-semibold mb-2">
            Quick Actions
          </p>
          <div className="space-y-1">
            {toolsNavItems.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </div>
        </div>

        {/* Settings Section */}
        <div className="mt-6">
          <p className="px-3 text-[10px] uppercase tracking-wider text-gray-600 font-semibold mb-2">
            System
          </p>
          <div className="space-y-1">
            {secondaryNavItems.map((item) => (
              <NavItem key={item.href} item={item} />
            ))}
          </div>
        </div>
      </div>

      {/* User Section */}
      <div className="p-3 border-t border-white/5">
        <Link 
          href="/settings/profile"
          className="flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-orange-400 p-[2px]">
            <div className="w-full h-full rounded-full bg-[#141414] flex items-center justify-center text-sm font-bold text-white">
              A
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">Admin</p>
            <p className="text-xs text-gray-500">View profile</p>
          </div>
        </Link>
      </div>
    </aside>
  );
}
