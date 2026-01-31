'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import NotificationCenter from '@/components/NotificationCenter';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();

  // Don't show nav on login page
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      {/* Top Navigation Bar */}
      <header className="topbar">
        <div className="container topbar-inner">
          {/* Brand */}
          <Link href="/" className="brand">
            <img src="/icons/icon-192x192.png" alt="Integrative Psychiatry" className="brand-logo-img" />
            <div className="brand-title">
              <strong>Unified Comms</strong>
              <span>Command Center</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="nav-links">
            <Link href="/" className="nav-link">
              <span className="material-symbols-outlined icon">dashboard</span>
              Dashboard
            </Link>
            
            {/* OpenPhone Section */}
            <div className="relative group">
              <Link href="/openphone" className="nav-link">
                <span className="material-symbols-outlined icon">sms</span>
                OpenPhone
              </Link>
            </div>

            {/* Gmail Section */}
            <div className="relative group">
              <Link href="/gmail" className="nav-link">
                <span className="material-symbols-outlined icon">mail</span>
                Gmail
              </Link>
            </div>

            <Link href="/tasks" className="nav-link">
              <span className="material-symbols-outlined icon">task_alt</span>
              Tasks
            </Link>
            <Link href="/search" className="nav-link">
              <span className="material-symbols-outlined icon">search</span>
              Search
            </Link>
            <Link href="/settings" className="nav-link">
              <span className="material-symbols-outlined icon">settings</span>
              Settings
            </Link>
          </nav>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <NotificationCenter />
            <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-orange-400 p-[2px]">
              <div className="w-full h-full rounded-full bg-background-dark flex items-center justify-center text-sm font-bold">
                A
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pb-16">
        {children}
      </main>
    </div>
  );
}
