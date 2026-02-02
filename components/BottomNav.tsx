'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', icon: 'grid_view', label: 'Home' },
  { href: '/search', icon: 'inbox', label: 'Inbox' },
  { href: '/tasks', icon: 'task_alt', label: 'Tasks' },
  { href: '/settings', icon: 'settings', label: 'Settings' },
];

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#1a1a1a] border-t border-white/5 safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center w-16 h-full transition-colors ${
              isActive(item.href)
                ? 'text-primary'
                : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            <span className="material-symbols-outlined text-2xl">{item.icon}</span>
            <span className="text-[10px] mt-0.5 font-medium">{item.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
