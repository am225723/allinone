'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', icon: 'dashboard', label: 'Home', color: 'blue' },
  { href: '/patients', icon: 'clinical_notes', label: 'Patients', color: 'emerald' },
  { href: '/notes', icon: 'description', label: 'Notes', color: 'cyan' },
  { href: '/tasks', icon: 'task_alt', label: 'Tasks', color: 'violet' },
  { href: '/openphone', icon: 'sms', label: 'Quo', color: 'orange' },
  { href: '/gmail', icon: 'mail', label: 'Mail', color: 'red' },
];

const colorClasses: Record<string, { active: string; inactive: string }> = {
  blue: { active: 'text-blue-400', inactive: 'text-blue-400/40' },
  emerald: { active: 'text-emerald-400', inactive: 'text-emerald-400/40' },
  cyan: { active: 'text-cyan-400', inactive: 'text-cyan-400/40' },
  violet: { active: 'text-violet-400', inactive: 'text-violet-400/40' },
  orange: { active: 'text-orange-400', inactive: 'text-orange-400/40' },
  red: { active: 'text-red-400', inactive: 'text-red-400/40' },
};

export default function BottomNav() {
  const pathname = usePathname();

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0d1117]/95 backdrop-blur-lg border-t border-white/10 lg:hidden safe-area-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const colors = colorClasses[item.color];
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
                isActive(item.href) ? colors.active : colors.inactive
              }`}
            >
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
              <span className="text-[9px] mt-0.5 font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
