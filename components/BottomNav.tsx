'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/', icon: 'dashboard', label: 'Home', color: 'blue' },
  { href: '/clients', icon: 'people', label: 'Clients', color: 'amber' },
  { href: '/patients', icon: 'clinical_notes', label: 'Patients', color: 'emerald' },
  { href: '/openphone', icon: 'sms', label: 'Quo', color: 'orange' },
  { href: '/gmail', icon: 'mail', label: 'Mail', color: 'red' },
];

const colorClasses: Record<string, { active: string; inactive: string }> = {
  blue: { active: 'text-blue-600 dark:text-blue-400', inactive: 'text-blue-600/40 dark:text-blue-400/40' },
  emerald: { active: 'text-emerald-600 dark:text-emerald-400', inactive: 'text-emerald-600/40 dark:text-emerald-400/40' },
  cyan: { active: 'text-cyan-600 dark:text-cyan-400', inactive: 'text-cyan-600/40 dark:text-cyan-400/40' },
  violet: { active: 'text-violet-600 dark:text-violet-400', inactive: 'text-violet-600/40 dark:text-violet-400/40' },
  orange: { active: 'text-orange-600 dark:text-orange-400', inactive: 'text-orange-600/40 dark:text-orange-400/40' },
  red: { active: 'text-red-600 dark:text-red-400', inactive: 'text-red-600/40 dark:text-red-400/40' },
  amber: { active: 'text-amber-600 dark:text-amber-400', inactive: 'text-amber-600/40 dark:text-amber-400/40' },
  gray: { active: 'text-gray-600 dark:text-gray-400', inactive: 'text-gray-600/40 dark:text-gray-400/40' },
};

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [showMore, setShowMore] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
  }, []);

  async function checkAdminAccess() {
    try {
      const res = await fetch('/api/auth/check-role');
      const data = await res.json();
      if (data.ok && data.role === 'admin') {
        setIsAdmin(true);
      }
    } catch (e) {
      console.error('Error checking admin access:', e);
    }
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname.startsWith(href);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/pin', { method: 'DELETE' });
    } catch (e) {
      console.error('Logout error:', e);
    }
    router.push('/login');
    router.refresh();
  };

  return (
    <>
      {showMore && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setShowMore(false)}
        />
      )}

      {showMore && (
        <div className="fixed bottom-16 left-0 right-0 z-50 bg-white dark:bg-[#0d1117] border-t border-gray-200 dark:border-white/10 lg:hidden safe-area-bottom">
          <div className="flex flex-col p-2 gap-1">
            <Link
              href="/settings"
              onClick={() => setShowMore(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive('/settings') ? colorClasses.violet.active : colorClasses.violet.inactive
              }`}
            >
              <span className="material-symbols-outlined text-xl">person</span>
              <span className="text-sm font-medium">Profile</span>
            </Link>

            <Link
              href="/settings"
              onClick={() => setShowMore(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive('/settings') ? colorClasses.gray.active : colorClasses.gray.inactive
              }`}
            >
              <span className="material-symbols-outlined text-xl">settings</span>
              <span className="text-sm font-medium">Settings</span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setShowMore(false)}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                  isActive('/admin') ? colorClasses.amber.active : colorClasses.amber.inactive
                }`}
              >
                <span className="material-symbols-outlined text-xl">kid_star</span>
                <span className="text-sm font-medium">Admin Panel</span>
              </Link>
            )}

            <Link
              href="/tasks"
              onClick={() => setShowMore(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive('/tasks') ? colorClasses.violet.active : colorClasses.violet.inactive
              }`}
            >
              <span className="material-symbols-outlined text-xl">task_alt</span>
              <span className="text-sm font-medium">Tasks</span>
            </Link>

            <Link
              href="/noteai"
              onClick={() => setShowMore(false)}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                isActive('/noteai') ? colorClasses.cyan.active : colorClasses.cyan.inactive
              }`}
            >
              <span className="material-symbols-outlined text-xl">edit_note</span>
              <span className="text-sm font-medium">Note AI</span>
            </Link>

            <button
              onClick={() => {
                setShowMore(false);
                handleLogout();
              }}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-red-600/60 dark:text-red-400/60 hover:text-red-600 dark:hover:text-red-400 transition-colors"
            >
              <span className="material-symbols-outlined text-xl">logout</span>
              <span className="text-sm font-medium">Logout</span>
            </button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-[#0d1117]/95 backdrop-blur-lg border-t border-gray-200 dark:border-white/10 lg:hidden safe-area-bottom">
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
          
          <button
            onClick={() => setShowMore(!showMore)}
            className={`flex flex-col items-center justify-center flex-1 h-full transition-colors ${
              showMore ? 'text-violet-600 dark:text-violet-400' : 'text-gray-600/60 dark:text-gray-400/60'
            }`}
          >
            <span className="material-symbols-outlined text-xl">
              {showMore ? 'close' : 'more_horiz'}
            </span>
            <span className="text-[9px] mt-0.5 font-medium">More</span>
          </button>
        </div>
      </nav>
    </>
  );
}
