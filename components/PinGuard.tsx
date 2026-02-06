'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface PinGuardProps {
  children: React.ReactNode;
}

export default function PinGuard({ children }: PinGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // If we are on the login page, we reset the auth state because we shouldn't
    // assume we are authenticated if we are looking at the login screen.
    if (pathname === '/login') {
      setIsAuthenticated(null);
      return;
    }

    // Optimization: If we are already authenticated, don't re-check on every navigation.
    if (isAuthenticated === true) {
      return;
    }

    // Check auth via API (httpOnly cookies can't be read by JavaScript)
    const checkAuth = async () => {
      try {
        const res = await fetch('/api/auth/check-role');
        const data = await res.json();
        if (data.ok) {
          setIsAuthenticated(true);
        } else {
          setIsAuthenticated(false);
          router.push('/login');
        }
      } catch (e) {
        setIsAuthenticated(false);
        router.push('/login');
      }
    };

    checkAuth();
  }, [pathname, router, isAuthenticated]);

  // If on login page, render children immediately (login form)
  if (pathname === '/login') {
    return <>{children}</>;
  }

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin text-primary">
          <span className="material-symbols-outlined text-4xl">progress_activity</span>
        </div>
      </div>
    );
  }

  // If not authenticated and not on login page, show nothing (will redirect)
  if (isAuthenticated === false) {
    return null;
  }

  return <>{children}</>;
}
