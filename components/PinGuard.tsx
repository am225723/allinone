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
    // Skip check for login page
    if (pathname === '/login') {
      setIsAuthenticated(true);
      return;
    }

    // Check cookie
    const isAuth = document.cookie.includes('pin_authenticated=true');
    setIsAuthenticated(isAuth);

    if (!isAuth) {
      router.push('/login');
    }
  }, [pathname, router]);

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
  if (!isAuthenticated && pathname !== '/login') {
    return null;
  }

  return <>{children}</>;
}
