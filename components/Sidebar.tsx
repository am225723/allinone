'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', icon: 'grid_view', label: 'Dashboard' },
  { href: '/patients', icon: 'clinical_notes', label: 'Patients' },
  { href: '/openphone', icon: 'sms', label: 'Quo' },
  { href: '/gmail', icon: 'mail', label: 'Mail' },
  { href: '/tasks', icon: 'task_alt', label: 'Tasks' },
  { href: '/search', icon: 'search', label: 'Search' },
];

const bottomItems = [
  { href: '/settings', icon: 'settings', label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  return (
    <aside className="hidden lg:flex flex-col w-16 h-screen bg-[#141414] border-r border-white/5 fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-3 flex justify-center border-b border-white/5">
        <Link href="/" className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center">
          <span className="text-white font-bold text-lg">C</span>
        </Link>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 py-4 flex flex-col items-center gap-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isActive(item.href)
                ? 'bg-primary/15 text-primary'
                : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
            }`}
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
          </Link>
        ))}
      </div>

      {/* Bottom Navigation */}
      <div className="py-4 flex flex-col items-center gap-2 border-t border-white/5">
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
              isActive(item.href)
                ? 'bg-primary/15 text-primary'
                : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
            }`}
          >
            <span className="material-symbols-outlined text-xl">{item.icon}</span>
          </Link>
        ))}
        {/* Dark mode toggle */}
        <button
          title="Toggle theme"
          className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-all"
        >
          <span className="material-symbols-outlined text-xl">dark_mode</span>
        </button>
      </div>
    </aside>
  );
}
