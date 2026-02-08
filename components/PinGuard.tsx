'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface PinGuardProps {
  children: React.ReactNode;
}

const SESSION_CHECK_INTERVAL = 5 * 60 * 1000; // 5 minutes
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'];

export default function PinGuard({ children }: PinGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const lastActivityRef = useRef(Date.now());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    fetch('/api/auth/pin', { method: 'DELETE' }).catch(() => {});
    router.push('/login');
  }, [router]);

  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/check-role');
      const data = await res.json();
      if (data.ok) {
        setIsAuthenticated(true);
      } else {
        handleLogout();
      }
    } catch (e) {
      handleLogout();
    }
  }, [handleLogout]);

  useEffect(() => {
    const trackActivity = () => {
      lastActivityRef.current = Date.now();
    };

    if (pathname !== '/login' && isAuthenticated) {
      ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, trackActivity, { passive: true }));
      return () => {
        ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, trackActivity));
      };
    }
  }, [pathname, isAuthenticated]);

  useEffect(() => {
    if (pathname === '/login') {
      setIsAuthenticated(null);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      return;
    }

    if (isAuthenticated === true) {
      if (!checkIntervalRef.current) {
        checkIntervalRef.current = setInterval(() => {
          const inactiveDuration = Date.now() - lastActivityRef.current;
          if (inactiveDuration > 30 * 60 * 1000) {
            handleLogout();
          } else {
            checkAuth();
          }
        }, SESSION_CHECK_INTERVAL);
      }
      return;
    }

    checkAuth();
  }, [pathname, router, isAuthenticated, checkAuth, handleLogout]);

  useEffect(() => {
    return () => {
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
      }
    };
  }, []);

  if (pathname === '/login') {
    return <>{children}</>;
  }

  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin text-primary">
          <span className="material-symbols-outlined text-4xl">progress_activity</span>
        </div>
      </div>
    );
  }

  if (isAuthenticated === false) {
    return null;
  }

  return <>{children}</>;
}
