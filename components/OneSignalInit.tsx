'use client';

import { useEffect } from 'react';

declare global {
  interface Window {
    OneSignalDeferred: any[];
    OneSignal: any;
  }
}

export default function OneSignalInit() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const initOneSignal = async () => {
      try {
        window.OneSignalDeferred = window.OneSignalDeferred || [];
        window.OneSignalDeferred.push(async function(OneSignal: any) {
          try {
            await OneSignal.init({
              appId: "a826fa27-5eaf-46ef-8a58-118e8dd2820c",
              allowLocalhostAsSecureOrigin: true,
            });
          } catch (initError) {
            console.warn('OneSignal init failed (non-critical):', initError);
          }
        });

        const script = document.createElement('script');
        script.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
        script.defer = true;
        script.onerror = () => {
          console.warn('Failed to load OneSignal SDK (non-critical)');
        };
        document.head.appendChild(script);

        return () => {
          if (script.parentNode) {
            script.parentNode.removeChild(script);
          }
        };
      } catch (error) {
        console.warn('OneSignal setup failed (non-critical):', error);
      }
    };

    initOneSignal();
  }, []);

  return null;
}
