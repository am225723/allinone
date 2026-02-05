'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/', icon: 'grid_view', label: 'Dashboard', color: 'blue' },
  { href: '/clients', icon: 'people', label: 'Clients', color: 'amber' },
  { href: '/patients', icon: 'clinical_notes', label: 'Patients', color: 'emerald' },
  { href: '/openphone', icon: 'sms', label: 'Quo', color: 'orange' },
  { href: '/gmail', icon: 'mail', label: 'Mail', color: 'red' },
  { href: '/tasks', icon: 'task_alt', label: 'Tasks', color: 'violet' },
  { href: '/noteai', icon: 'edit_note', label: 'Note AI', color: 'cyan' },
];

const bottomItems = [
  { href: '/settings', icon: 'settings', label: 'Settings', color: 'gray' },
];

const colorClasses: Record<string, { active: string; inactive: string; hover: string }> = {
  blue: { active: 'bg-blue-500/15 text-blue-600 dark:text-blue-400', inactive: 'text-blue-600/50 dark:text-blue-400/50', hover: 'hover:bg-blue-500/10 hover:text-blue-600 dark:hover:text-blue-400' },
  emerald: { active: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400', inactive: 'text-emerald-600/50 dark:text-emerald-400/50', hover: 'hover:bg-emerald-500/10 hover:text-emerald-600 dark:hover:text-emerald-400' },
  orange: { active: 'bg-orange-500/15 text-orange-600 dark:text-orange-400', inactive: 'text-orange-600/50 dark:text-orange-400/50', hover: 'hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400' },
  red: { active: 'bg-red-500/15 text-red-600 dark:text-red-400', inactive: 'text-red-600/50 dark:text-red-400/50', hover: 'hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400' },
  violet: { active: 'bg-violet-500/15 text-violet-600 dark:text-violet-400', inactive: 'text-violet-600/50 dark:text-violet-400/50', hover: 'hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-violet-400' },
  cyan: { active: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400', inactive: 'text-cyan-600/50 dark:text-cyan-400/50', hover: 'hover:bg-cyan-500/10 hover:text-cyan-600 dark:hover:text-cyan-400' },
  gray: { active: 'bg-gray-500/15 text-gray-600 dark:text-gray-400', inactive: 'text-gray-500', hover: 'hover:bg-gray-500/5 dark:hover:bg-white/5 hover:text-gray-700 dark:hover:text-gray-300' },
  amber: { active: 'bg-amber-500/15 text-amber-600 dark:text-amber-400', inactive: 'text-amber-600/70 dark:text-amber-500/70', hover: 'hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400' },
};

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    checkAdminAccess();
    const stored = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const initial = stored || (prefersDark ? 'dark' : 'light');
    setIsDarkMode(initial === 'dark');
    document.documentElement.classList.toggle('dark', initial === 'dark');
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

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/pin', { method: 'DELETE' });
    } catch (e) {
      console.error('Logout error:', e);
    }
    router.push('/login');
    router.refresh();
  };

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const toggleTheme = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    localStorage.setItem('theme', next ? 'dark' : 'light');
    document.documentElement.classList.toggle('dark', next);
  };

  const getNavClasses = (item: typeof navItems[0]) => {
    const colors = colorClasses[item.color] || colorClasses.gray;
    if (isActive(item.href)) {
      return colors.active;
    }
    return `${colors.inactive} ${colors.hover}`;
  };

  return (
    <aside className="hidden lg:flex flex-col w-16 hover:w-52 h-screen bg-white dark:bg-[#0d1117] border-r border-gray-200 dark:border-white/5 fixed left-0 top-0 z-40 transition-all duration-300 ease-in-out group overflow-hidden">
      {/* Logo */}
      <div className="p-3 flex items-center gap-3 border-b border-gray-200 dark:border-white/5 min-h-[64px]">
        <Link href="/" className="flex items-center gap-3">
          <img 
            src="/icons/icon-192x192.png" 
            alt="Command Center" 
            className="w-10 h-10 rounded-xl flex-shrink-0"
          />
          <span className="font-bold text-gray-900 dark:text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Command Center
          </span>
        </Link>
      </div>

      {/* Main Navigation */}
      <div className="flex-1 py-4 flex flex-col gap-1 px-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={`flex items-center gap-3 h-11 px-2.5 rounded-xl transition-all ${getNavClasses(item)}`}
          >
            <span className="material-symbols-outlined text-xl flex-shrink-0">{item.icon}</span>
            <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {item.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Bottom Navigation */}
      <div className="py-4 flex flex-col gap-2 px-2 border-t border-gray-200 dark:border-white/5">
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={`flex items-center gap-3 h-11 px-2.5 rounded-xl transition-all ${getNavClasses(item)}`}
          >
            <span className="material-symbols-outlined text-xl flex-shrink-0">{item.icon}</span>
            <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {item.label}
            </span>
          </Link>
        ))}

        {/* Dark/Light mode toggle */}
        <button
          onClick={toggleTheme}
          title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="flex items-center gap-3 h-11 px-2.5 rounded-xl text-indigo-600/50 dark:text-indigo-400/50 hover:bg-indigo-500/10 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all"
        >
          <span className="material-symbols-outlined text-xl flex-shrink-0">
            {isDarkMode ? 'dark_mode' : 'light_mode'}
          </span>
          <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {isDarkMode ? 'Dark Mode' : 'Light Mode'}
          </span>
        </button>

        {/* Profile Button */}
        <Link
          href="/settings"
          title="Profile"
          className={`flex items-center gap-3 h-11 px-2.5 rounded-xl transition-all ${
            isActive('/settings')
              ? colorClasses.violet.active
              : `${colorClasses.violet.inactive} ${colorClasses.violet.hover}`
          }`}
        >
          <span className="material-symbols-outlined text-xl flex-shrink-0">
            person
          </span>
          <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Profile
          </span>
        </Link>

        {/* Admin Panel - shown if user has admin role */}
        {isAdmin && (
          <Link
            href="/admin"
            title="Admin Panel"
            className={`flex items-center gap-3 h-11 px-2.5 rounded-xl transition-all ${
              isActive('/admin')
                ? colorClasses.amber.active
                : `${colorClasses.amber.inactive} ${colorClasses.amber.hover}`
            }`}
          >
            <span className="material-symbols-outlined text-xl flex-shrink-0">
              kid_star
            </span>
            <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Admin Panel
            </span>
          </Link>
        )}

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          title="Logout"
          className="flex items-center gap-3 h-11 px-2.5 rounded-xl text-red-600/50 dark:text-red-400/50 hover:bg-red-500/10 hover:text-red-600 dark:hover:text-red-400 transition-all"
        >
          <span className="material-symbols-outlined text-xl flex-shrink-0">
            logout
          </span>
          <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
}
