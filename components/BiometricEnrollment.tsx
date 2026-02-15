'use client';

import { useState, useEffect } from 'react';
import { startRegistration, browserSupportsWebAuthn } from '@simplewebauthn/browser';

interface BiometricEnrollmentProps {
  onComplete?: () => void;
  onSkip?: () => void;
}

export default function BiometricEnrollment({ onComplete, onSkip }: BiometricEnrollmentProps) {
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const checkBiometricStatus = async () => {
      if (!browserSupportsWebAuthn()) return;

      const dismissed = localStorage.getItem('biometric_prompt_dismissed');
      if (dismissed) return;

      try {
        const res = await fetch('/api/auth/webauthn/credentials');
        const data = await res.json();
        // Don't show for default user or if credentials already exist
        if (!data.isDefaultUser && data.credentials?.length === 0) {
          setTimeout(() => setShow(true), 1000);
        }
      } catch {
        // Silently fail
      }
    };

    checkBiometricStatus();
  }, []);

  const handleEnroll = async () => {
    setLoading(true);
    setError('');

    try {
      const optionsRes = await fetch('/api/auth/webauthn/register');
      const options = await optionsRes.json();

      if (optionsRes.status !== 200) {
        throw new Error(options.error || 'Failed to get registration options');
      }

      const { sessionId, ...optionsJSON } = options;
      const credential = await startRegistration({ optionsJSON });

      const verifyRes = await fetch('/api/auth/webauthn/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          response: credential,
          deviceName: getDeviceName(),
          sessionId,
        }),
      });

      const result = await verifyRes.json();

      if (result.success) {
        setSuccess(true);
        localStorage.setItem('biometric_prompt_dismissed', 'true');
        setTimeout(() => {
          setShow(false);
          onComplete?.();
        }, 2000);
      } else {
        setError(result.error || 'Failed to register biometric');
        // If error indicates default user, don't show prompt again
        if (result.error?.includes('proper user account')) {
          setTimeout(() => {
            setShow(false);
            onSkip?.();
          }, 3000);
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'NotAllowedError') {
        setError('Biometric registration was cancelled');
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError('Failed to register biometric');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    localStorage.setItem('biometric_prompt_dismissed', 'true');
    setShow(false);
    onSkip?.();
  };

  const getDeviceName = () => {
    const ua = navigator.userAgent;
    if (/iPhone/.test(ua)) return 'iPhone';
    if (/iPad/.test(ua)) return 'iPad';
    if (/Mac/.test(ua)) return 'Mac';
    if (/Windows/.test(ua)) return 'Windows PC';
    if (/Android/.test(ua)) return 'Android Device';
    return 'Unknown Device';
  };

  if (!show) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[var(--surface)] dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-sm w-full p-6 border border-[var(--border)]">
        {success ? (
          <div className="text-center py-4">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <span className="material-symbols-outlined text-emerald-500 text-3xl">check_circle</span>
            </div>
            <h3 className="text-lg font-semibold text-[var(--text)] mb-2">All Set!</h3>
            <p className="text-[var(--text-muted)] text-sm">
              You can now use biometrics to log in quickly.
            </p>
          </div>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-orange-500/20 flex items-center justify-center">
                <span className="material-symbols-outlined text-orange-500 text-3xl">fingerprint</span>
              </div>
              <h3 className="text-lg font-semibold text-[var(--text)] mb-2">Enable Quick Login</h3>
              <p className="text-[var(--text-muted)] text-sm">
                Use Face ID or fingerprint for faster, more secure logins on this device.
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center">
                {error}
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={handleEnroll}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-medium text-white bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <span className="material-symbols-outlined animate-spin text-xl">progress_activity</span>
                    Setting up...
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-xl">fingerprint</span>
                    Enable Biometrics
                  </>
                )}
              </button>

              <button
                onClick={handleSkip}
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl font-medium text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--bg-darker)] transition-all"
              >
                Maybe Later
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
