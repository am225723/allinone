'use client';

import { useEffect } from 'react';

export default function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;

    navigator.serviceWorker
      .register('/OneSignalSDKWorker.js', { scope: '/' })
      .catch(() => {
        // OneSignal init has its own fallback/error logging; avoid duplicate noise.
      });
  }, []);

  return null;
}
