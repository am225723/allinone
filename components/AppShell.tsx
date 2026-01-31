'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import NotificationCenter from '@/components/NotificationCenter';

interface AppShellProps {
  children: React.ReactNode;
}

export default function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    document.cookie = 'pin_authenticated=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT';
    router.push('/login');
  };

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
            <div className="avatar-dropdown" ref={dropdownRef}>
              <button 
                className="avatar-btn"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-orange-400 p-[2px]">
                  <div className="w-full h-full rounded-full bg-background-dark flex items-center justify-center text-sm font-bold">
                    A
                  </div>
                </div>
              </button>
              {showDropdown && (
                <div className="dropdown-menu">
                  <Link href="/settings" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                    <span className="material-symbols-outlined">person</span>
                    Profile
                  </Link>
                  <Link href="/settings" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                    <span className="material-symbols-outlined">settings</span>
                    Settings
                  </Link>
                  <Link href="/admin" className="dropdown-item" onClick={() => setShowDropdown(false)}>
                    <span className="material-symbols-outlined">admin_panel_settings</span>
                    Admin Panel
                  </Link>
                  <div className="dropdown-divider"></div>
                  <button className="dropdown-item logout-item" onClick={handleLogout}>
                    <span className="material-symbols-outlined">logout</span>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <style jsx>{`
        .avatar-dropdown {
          position: relative;
        }
        .avatar-btn {
          background: none;
          border: none;
          cursor: pointer;
          padding: 0;
        }
        .dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 200px;
          background: var(--background-dark, #1a1a1a);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 8px;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
          z-index: 100;
        }
        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          color: rgba(255, 255, 255, 0.8);
          text-decoration: none;
          border-radius: 8px;
          font-size: 14px;
          transition: background 0.2s;
          width: 100%;
          border: none;
          background: none;
          cursor: pointer;
          text-align: left;
        }
        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.05);
          color: white;
        }
        .dropdown-item :global(.material-symbols-outlined) {
          font-size: 20px;
          opacity: 0.7;
        }
        .dropdown-divider {
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
          margin: 8px 0;
        }
        .logout-item {
          color: #ef4444;
        }
        .logout-item:hover {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
        }
      `}</style>

      {/* Main Content */}
      <main className="pb-16">
        {children}
      </main>
    </div>
  );
}
