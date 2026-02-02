'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useRef, useEffect } from 'react';
import NotificationCenter from '@/components/NotificationCenter';
import Sidebar from '@/components/Sidebar';
import BottomNav from '@/components/BottomNav';

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

  const handleLogout = async () => {
    await fetch('/api/auth/pin', { method: 'DELETE' });
    document.cookie = 'pin_authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    document.cookie = 'pin_authenticated=; Path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    window.location.href = '/login';
  };

  // Don't show nav on login page
  if (pathname === '/login') {
    return <>{children}</>;
  }

  return (
    <div className="app-shell">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Mobile Top Header */}
      <header className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[#1a1a1a] border-b border-white/5 h-14">
        <div className="flex items-center justify-between h-full px-4">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-orange-600 flex items-center justify-center">
              <span className="text-white font-bold text-sm">CC</span>
            </div>
            <span className="font-bold text-white">Command Center</span>
          </Link>

          {/* Right Actions */}
          <div className="flex items-center gap-2">
            <Link
              href="/search"
              className="p-2 hover:bg-white/5 rounded-lg transition-colors"
            >
              <span className="material-symbols-outlined text-gray-400">search</span>
            </Link>
            <NotificationCenter />
            <div className="avatar-dropdown" ref={dropdownRef}>
              <button 
                className="avatar-btn"
                onClick={() => setShowDropdown(!showDropdown)}
              >
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary to-orange-400 p-[2px]">
                  <div className="w-full h-full rounded-full bg-[#1a1a1a] flex items-center justify-center text-xs font-bold">
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
          background: #1a1a1a;
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
      <main className="pt-14 pb-20 lg:pt-0 lg:pb-0 lg:pl-64">
        {children}
      </main>

      {/* Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
