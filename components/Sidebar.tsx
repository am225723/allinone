'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

const navItems = [
  { href: '/', icon: 'grid_view', label: 'Dashboard' },
  { href: '/patients', icon: 'clinical_notes', label: 'Patients' },
  { href: '/openphone', icon: 'sms', label: 'Quo' },
  { href: '/gmail', icon: 'mail', label: 'Mail' },
  { href: '/tasks', icon: 'task_alt', label: 'Tasks' },
];

const bottomItems = [
  { href: '/settings', icon: 'settings', label: 'Settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Check if user has admin access (auto-login based on role)
    checkAdminAccess();
  }, []);

  async function checkAdminAccess() {
    try {
      // Check if admin cookie exists or if user has admin role
      const adminCookie = document.cookie.split(';').find(c => c.trim().startsWith('admin_authenticated='));
      if (adminCookie?.includes('true')) {
        setIsAdmin(true);
        return;
      }

      // Check user role from API
      const res = await fetch('/api/auth/check-role');
      const data = await res.json();
      if (data.ok && data.role === 'admin') {
        setIsAdmin(true);
        // Auto-set admin cookie for admin users
        document.cookie = 'admin_authenticated=true; path=/; max-age=86400';
      }
    } catch (e) {
      console.error('Error checking admin access:', e);
    }
  }

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/';
    return pathname === href || pathname.startsWith(href + '/');
  };

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <aside className="hidden lg:flex flex-col w-16 hover:w-52 h-screen bg-[#0d1117] border-r border-white/5 fixed left-0 top-0 z-40 transition-all duration-300 ease-in-out group overflow-hidden">
      {/* Logo */}
      <div className="p-3 flex items-center gap-3 border-b border-white/5 min-h-[64px]">
        <Link href="/" className="flex items-center gap-3">
          <img 
            src="/icons/icon-192x192.png" 
            alt="Command Center" 
            className="w-10 h-10 rounded-xl flex-shrink-0"
          />
          <span className="font-bold text-white whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
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
            className={`flex items-center gap-3 h-11 px-2.5 rounded-xl transition-all ${
              isActive(item.href)
                ? 'bg-blue-500/15 text-blue-400'
                : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
            }`}
          >
            <span className="material-symbols-outlined text-xl flex-shrink-0">{item.icon}</span>
            <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              {item.label}
            </span>
          </Link>
        ))}
      </div>

      {/* Bottom Navigation */}
      <div className="py-4 flex flex-col gap-2 px-2 border-t border-white/5">
        {bottomItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            title={item.label}
            className={`flex items-center gap-3 h-11 px-2.5 rounded-xl transition-all ${
              isActive(item.href)
                ? 'bg-blue-500/15 text-blue-400'
                : 'text-gray-500 hover:bg-white/5 hover:text-gray-300'
            }`}
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
          className="flex items-center gap-3 h-11 px-2.5 rounded-xl text-gray-500 hover:bg-white/5 hover:text-gray-300 transition-all"
        >
          <span className="material-symbols-outlined text-xl flex-shrink-0">
            {isDarkMode ? 'dark_mode' : 'light_mode'}
          </span>
          <span className="text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            {isDarkMode ? 'Dark Mode' : 'Light Mode'}
          </span>
        </button>

        {/* Admin Panel - shown if user has admin access */}
        {isAdmin && (
          <Link
            href="/admin"
            title="Admin Panel"
            className={`flex items-center gap-3 h-11 px-2.5 rounded-xl transition-all ${
              isActive('/admin')
                ? 'bg-amber-500/15 text-amber-400'
                : 'text-amber-500/70 hover:bg-amber-500/10 hover:text-amber-400'
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
      </div>
    </aside>
  );
}
