'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    OneSignalDeferred: any[];
    OneSignal: any;
    __oneSignalInitialized?: boolean;
  }
}

export default function OneSignalInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Prevent duplicate initialization (especially in React Strict Mode)
    if (window.__oneSignalInitialized) {
      return;
    }
    window.__oneSignalInitialized = true;

    // Check if script already exists
    const existingScript = document.querySelector('script[src*="OneSignalSDK"]');
    if (existingScript) {
      return;
    }

    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function(OneSignal: any) {
      try {
        await OneSignal.init({
          appId: "a826fa27-5eaf-46ef-8a58-118e8dd2820c",
          allowLocalhostAsSecureOrigin: true,
        });
      } catch (initError: any) {
        // Known non-critical errors - log once and stop
        if (initError?.message?.includes('Can only be used on')) {
          console.info('OneSignal: Push notifications disabled (domain not configured)');
        } else if (initError?.message?.includes('indexedDB')) {
          console.info('OneSignal: Push notifications disabled (storage unavailable)');
        } else {
          console.warn('OneSignal init failed (non-critical):', initError);
        }
      }
    });

    const script = document.createElement('script');
    script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    script.defer = true;
    script.onerror = () => {
      console.info('OneSignal: SDK failed to load (push notifications disabled)');
    };
    document.head.appendChild(script);

    return () => {
      // Cleanup on unmount
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      // Reset initialization flag
      window.__oneSignalInitialized = false;
    };
  }, []);

  return null;
}
