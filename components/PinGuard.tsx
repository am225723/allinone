'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface PinGuardProps {
  children: React.ReactNode;
}

const SESSION_CHECK_INTERVAL = 60 * 1000;
const INACTIVITY_TIMEOUT = 30 * 60 * 1000;
const WARNING_BEFORE_LOGOUT = 2 * 60 * 1000;
const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll', 'mousemove', 'click'];

export default function PinGuard({ children }: PinGuardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const router = useRouter();
  const pathname = usePathname();
  const lastActivityRef = useRef(Date.now());
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const warningDismissedRef = useRef(false);

  const handleLogout = useCallback(() => {
    setIsAuthenticated(false);
    setShowWarning(false);
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    fetch('/api/auth/pin', { method: 'DELETE' }).catch(() => {});
    router.push('/login');
  }, [router]);

  const handleStayLoggedIn = useCallback(() => {
    lastActivityRef.current = Date.now();
    setShowWarning(false);
    warningDismissedRef.current = true;
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    fetch('/api/auth/check-role').catch(() => {});
  }, []);

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
      if (showWarning) {
        handleStayLoggedIn();
      }
      warningDismissedRef.current = false;
    };

    if (pathname !== '/login' && isAuthenticated) {
      ACTIVITY_EVENTS.forEach(e => window.addEventListener(e, trackActivity, { passive: true }));
      return () => {
        ACTIVITY_EVENTS.forEach(e => window.removeEventListener(e, trackActivity));
      };
    }
  }, [pathname, isAuthenticated, showWarning, handleStayLoggedIn]);

  useEffect(() => {
    if (pathname === '/login') {
      setIsAuthenticated(null);
      setShowWarning(false);
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        checkIntervalRef.current = null;
      }
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
      return;
    }

    if (isAuthenticated === true) {
      if (!checkIntervalRef.current) {
        checkIntervalRef.current = setInterval(() => {
          const inactiveDuration = Date.now() - lastActivityRef.current;

          if (inactiveDuration >= INACTIVITY_TIMEOUT) {
            handleLogout();
            return;
          }

          const timeUntilLogout = INACTIVITY_TIMEOUT - inactiveDuration;
          if (timeUntilLogout <= WARNING_BEFORE_LOGOUT && !warningDismissedRef.current) {
            setShowWarning(true);
            setSecondsLeft(Math.ceil(timeUntilLogout / 1000));

            if (!countdownRef.current) {
              countdownRef.current = setInterval(() => {
                const remaining = INACTIVITY_TIMEOUT - (Date.now() - lastActivityRef.current);
                if (remaining <= 0) {
                  handleLogout();
                } else {
                  setSecondsLeft(Math.ceil(remaining / 1000));
                }
              }, 1000);
            }
          } else if (timeUntilLogout > WARNING_BEFORE_LOGOUT) {
            setShowWarning(false);
            if (countdownRef.current) {
              clearInterval(countdownRef.current);
              countdownRef.current = null;
            }
          }

          if (inactiveDuration < INACTIVITY_TIMEOUT - WARNING_BEFORE_LOGOUT) {
            fetch('/api/auth/activity', { method: 'POST' }).catch(() => {});
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
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated || pathname === '/login') return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const inactiveDuration = Date.now() - lastActivityRef.current;
        if (inactiveDuration >= INACTIVITY_TIMEOUT) {
          handleLogout();
        } else {
          checkAuth();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isAuthenticated, pathname, handleLogout, checkAuth]);

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

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return m > 0 ? `${m}:${s.toString().padStart(2, '0')}` : `${s}s`;
  };

  return (
    <>
      {showWarning && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-card border border-border rounded-2xl shadow-2xl p-6 mx-4 max-w-sm w-full text-center">
            <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-500/15 flex items-center justify-center">
              <span className="material-symbols-outlined text-amber-500 text-3xl">timer</span>
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Session Expiring</h3>
            <p className="text-sm text-muted-foreground mb-1">
              You&apos;ll be logged out in
            </p>
            <p className="text-3xl font-bold text-amber-500 mb-4 font-mono">
              {formatTime(secondsLeft)}
            </p>
            <p className="text-xs text-muted-foreground mb-5">
              due to inactivity
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleLogout}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border text-sm font-medium text-muted-foreground hover:bg-muted/50 transition-colors"
              >
                Log Out
              </button>
              <button
                onClick={handleStayLoggedIn}
                className="flex-1 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Stay Logged In
              </button>
            </div>
          </div>
        </div>
      )}
      {children}
    </>
  );
}
