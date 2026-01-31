'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [pin, setPin] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pinLength, setPinLength] = useState(6);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  useEffect(() => {
    // Check if already authenticated
    const isAuth = document.cookie.includes('pin_authenticated=true');
    if (isAuth) {
      router.push('/');
    }
    // Focus first input
    inputRefs.current[0]?.focus();
  }, [router]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits entered
    const fullPin = newPin.join('');
    if (fullPin.length >= 4 && newPin.slice(0, fullPin.length).every(d => d !== '')) {
      // Check if we have 4, 5, or 6 digits filled
      const filledCount = newPin.filter(d => d !== '').length;
      if (filledCount >= 4 && index === filledCount - 1) {
        // Small delay to show the last digit
        setTimeout(() => handleSubmit(newPin.slice(0, filledCount).join('')), 150);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      const fullPin = pin.filter(d => d !== '').join('');
      if (fullPin.length >= 4) {
        handleSubmit(fullPin);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      const newPin = [...pin];
      for (let i = 0; i < pastedData.length && i < 6; i++) {
        newPin[i] = pastedData[i];
      }
      setPin(newPin);
      if (pastedData.length >= 4) {
        setTimeout(() => handleSubmit(pastedData), 150);
      }
    }
  };

  const handleSubmit = async (pinCode?: string) => {
    const code = pinCode || pin.filter(d => d !== '').join('');
    if (code.length < 4) {
      setError('Please enter at least 4 digits');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin: code }),
      });

      const data = await res.json();

      if (data.ok) {
        router.push('/');
        router.refresh();
      } else {
        setError(data.error || 'Invalid PIN');
        setPin(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError('Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="card p-8">
          <div className="text-center mb-8">
            <img 
              src="/icons/icon-192x192.png" 
              alt="Integrative Psychiatry" 
              className="w-20 h-20 mx-auto mb-4 rounded-2xl"
            />
            <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-gray-400">Enter your PIN to continue</p>
          </div>

          <div className="flex justify-center gap-3 mb-6" onPaste={handlePaste}>
            {pin.map((digit, index) => (
              <input
                key={index}
                ref={el => { inputRefs.current[index] = el; }}
                type="tel"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={e => handleChange(index, e.target.value)}
                onKeyDown={e => handleKeyDown(index, e)}
                className={`w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 bg-black/30 text-white
                  ${error ? 'border-red-500' : 'border-gray-600 focus:border-primary'}
                  focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all`}
                disabled={loading}
                autoComplete="off"
              />
            ))}
          </div>

          {error && (
            <div className="text-center text-red-400 text-sm mb-4 flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-lg">error</span>
              {error}
            </div>
          )}

          <button
            onClick={() => handleSubmit()}
            disabled={loading || pin.filter(d => d !== '').length < 4}
            className="btn btn-primary w-full py-3 text-lg font-semibold"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Verifying...
              </span>
            ) : (
              'Unlock'
            )}
          </button>

          <p className="text-center text-gray-500 text-xs mt-6">
            Enter 4-6 digit PIN to access the dashboard
          </p>
        </div>
      </div>
    </div>
  );
}
