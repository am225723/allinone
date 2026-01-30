'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface AdminGuardProps {
  children: React.ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [adminEmail, setAdminEmail] = useState<string>('');

  useEffect(() => {
    checkAuth();
  }, [pathname]);

  async function checkAuth() {
    try {
      const res = await fetch('/api/admin/auth');
      const data = await res.json();
      
      setIsAdmin(data.isAdmin);
      setAdminEmail(data.email || '');
      
      if (!data.isAdmin && pathname !== '/admin/login') {
        router.push('/admin/login');
      }
    } catch {
      setIsAdmin(false);
      if (pathname !== '/admin/login') {
        router.push('/admin/login');
      }
    }
  }

  async function handleLogout() {
    await fetch('/api/admin/auth', { method: 'DELETE' });
    router.push('/admin/login');
  }

  if (isAdmin === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <span className="material-symbols-outlined text-4xl animate-spin text-primary">progress_activity</span>
          <p className="mt-4 text-gray-400">Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (pathname === '/admin/login') {
    return <>{children}</>;
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div>
      <div className="bg-primary/10 border-b border-primary/20 px-4 py-2">
        <div className="container flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm">
            <span className="material-symbols-outlined text-primary">admin_panel_settings</span>
            <span className="text-gray-400">Admin Mode</span>
            {adminEmail && <span className="text-gray-500">| {adminEmail}</span>}
          </div>
          <button 
            onClick={handleLogout}
            className="text-sm text-gray-400 hover:text-white flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">logout</span>
            Logout
          </button>
        </div>
      </div>
      {children}
    </div>
  );
}
