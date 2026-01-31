'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const [pin, setPin] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const router = useRouter();

  useEffect(() => {
    const isAuth = document.cookie.includes('pin_authenticated=true');
    if (isAuth) {
      router.push('/');
    }
    inputRefs.current[0]?.focus();
  }, [router]);

  const handleChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    
    const newPin = [...pin];
    newPin[index] = value.slice(-1);
    setPin(newPin);
    setError('');

    if (value && index < 3) {
      inputRefs.current[index + 1]?.focus();
    }

    if (newPin.every(d => d !== '') && index === 3) {
      setTimeout(() => handleSubmit(newPin.join('')), 150);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !pin[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter') {
      const fullPin = pin.join('');
      if (fullPin.length === 4) {
        handleSubmit(fullPin);
      }
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 4);
    if (pastedData.length === 4) {
      const newPin = pastedData.split('');
      setPin(newPin);
      setTimeout(() => handleSubmit(pastedData), 150);
    }
  };

  const handleSubmit = async (pinCode?: string) => {
    const code = pinCode || pin.join('');
    if (code.length !== 4) {
      setError('Please enter 4 digits');
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
        setShake(true);
        setTimeout(() => setShake(false), 500);
        setPin(['', '', '', '']);
        inputRefs.current[0]?.focus();
      }
    } catch (err) {
      setError('Connection error. Please try again.');
      setShake(true);
      setTimeout(() => setShake(false), 500);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-bg">
        <div className="login-gradient-1"></div>
        <div className="login-gradient-2"></div>
        <div className="login-gradient-3"></div>
        <div className="login-particles">
          {[...Array(20)].map((_, i) => (
            <div key={i} className="particle" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${15 + Math.random() * 10}s`
            }}></div>
          ))}
        </div>
      </div>

      <div className="login-container">
        <div className={`login-card ${shake ? 'shake' : ''}`}>
          <div className="login-glow"></div>
          
          <div className="login-header">
            <div className="login-logo-wrapper">
              <div className="login-logo-ring"></div>
              <div className="login-logo-ring delay-1"></div>
              <div className="login-logo-ring delay-2"></div>
              <img 
                src="/icons/icon-192x192.png" 
                alt="Integrative Psychiatry" 
                className="login-logo"
              />
            </div>
            <h1 className="login-title">
              <span className="title-gradient">Welcome Back</span>
            </h1>
            <p className="login-subtitle">Enter your 4-digit PIN to unlock</p>
          </div>

          <div className="pin-container" onPaste={handlePaste}>
            {pin.map((digit, index) => (
              <div key={index} className="pin-input-wrapper">
                <input
                  ref={el => { inputRefs.current[index] = el; }}
                  type="tel"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={1}
                  value={digit}
                  onChange={e => handleChange(index, e.target.value)}
                  onKeyDown={e => handleKeyDown(index, e)}
                  className={`pin-input ${digit ? 'filled' : ''} ${error ? 'error' : ''}`}
                  disabled={loading}
                  autoComplete="off"
                />
                <div className="pin-dot" style={{ opacity: digit ? 1 : 0 }}></div>
              </div>
            ))}
          </div>

          {error && (
            <div className="error-message">
              <span className="material-symbols-outlined">error</span>
              {error}
            </div>
          )}

          <button
            onClick={() => handleSubmit()}
            disabled={loading || pin.some(d => d === '')}
            className="unlock-btn"
          >
            {loading ? (
              <span className="btn-loading">
                <span className="material-symbols-outlined spin">progress_activity</span>
                Verifying...
              </span>
            ) : (
              <>
                <span className="material-symbols-outlined">lock_open</span>
                Unlock
              </>
            )}
          </button>

          <div className="login-footer">
            <div className="security-badge">
              <span className="material-symbols-outlined">shield</span>
              Secured Access
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          overflow: hidden;
          background: #0a0a0f;
        }

        .login-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
        }

        .login-gradient-1 {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(230, 59, 25, 0.15) 0%, transparent 50%);
          animation: float1 20s ease-in-out infinite;
        }

        .login-gradient-2 {
          position: absolute;
          bottom: -50%;
          right: -50%;
          width: 100%;
          height: 100%;
          background: radial-gradient(circle, rgba(255, 100, 50, 0.1) 0%, transparent 50%);
          animation: float2 25s ease-in-out infinite;
        }

        .login-gradient-3 {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80%;
          height: 80%;
          background: radial-gradient(circle, rgba(230, 59, 25, 0.05) 0%, transparent 70%);
          animation: pulse 8s ease-in-out infinite;
        }

        @keyframes float1 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(30%, 20%) rotate(180deg); }
        }

        @keyframes float2 {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(-30%, -20%) rotate(-180deg); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        }

        .login-particles {
          position: absolute;
          inset: 0;
          overflow: hidden;
        }

        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: rgba(230, 59, 25, 0.6);
          border-radius: 50%;
          bottom: -10px;
          animation: rise linear infinite;
        }

        @keyframes rise {
          0% { transform: translateY(0) scale(1); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) scale(0); opacity: 0; }
        }

        .login-container {
          position: relative;
          z-index: 10;
          padding: 20px;
          width: 100%;
          max-width: 420px;
        }

        .login-card {
          position: relative;
          background: linear-gradient(145deg, rgba(20, 20, 25, 0.9), rgba(15, 15, 20, 0.95));
          border: 1px solid rgba(230, 59, 25, 0.2);
          border-radius: 24px;
          padding: 48px 40px;
          backdrop-filter: blur(20px);
          box-shadow: 
            0 25px 50px -12px rgba(0, 0, 0, 0.5),
            0 0 0 1px rgba(255, 255, 255, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        .login-card.shake {
          animation: shake 0.5s ease-in-out;
        }

        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-10px); }
          40% { transform: translateX(10px); }
          60% { transform: translateX(-10px); }
          80% { transform: translateX(10px); }
        }

        .login-glow {
          position: absolute;
          top: -2px;
          left: 20%;
          right: 20%;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(230, 59, 25, 0.8), transparent);
          border-radius: 2px;
        }

        .login-header {
          text-align: center;
          margin-bottom: 40px;
        }

        .login-logo-wrapper {
          position: relative;
          width: 100px;
          height: 100px;
          margin: 0 auto 24px;
        }

        .login-logo-ring {
          position: absolute;
          inset: -8px;
          border: 2px solid rgba(230, 59, 25, 0.3);
          border-radius: 50%;
          animation: ring-pulse 3s ease-in-out infinite;
        }

        .login-logo-ring.delay-1 {
          inset: -16px;
          animation-delay: 0.5s;
          border-color: rgba(230, 59, 25, 0.2);
        }

        .login-logo-ring.delay-2 {
          inset: -24px;
          animation-delay: 1s;
          border-color: rgba(230, 59, 25, 0.1);
        }

        @keyframes ring-pulse {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.5; }
        }

        .login-logo {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
          box-shadow: 0 0 30px rgba(230, 59, 25, 0.3);
        }

        .login-title {
          font-size: 28px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .title-gradient {
          background: linear-gradient(135deg, #ffffff 0%, #e63b19 50%, #ff6b45 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .login-subtitle {
          color: #888;
          font-size: 15px;
        }

        .pin-container {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin-bottom: 32px;
        }

        .pin-input-wrapper {
          position: relative;
        }

        .pin-input {
          width: 64px;
          height: 72px;
          text-align: center;
          font-size: 32px;
          font-weight: 700;
          background: rgba(0, 0, 0, 0.4);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          color: transparent;
          caret-color: #e63b19;
          transition: all 0.3s ease;
        }

        .pin-input:focus {
          outline: none;
          border-color: #e63b19;
          box-shadow: 0 0 20px rgba(230, 59, 25, 0.3);
          background: rgba(230, 59, 25, 0.1);
        }

        .pin-input.filled {
          border-color: rgba(230, 59, 25, 0.5);
          background: rgba(230, 59, 25, 0.05);
        }

        .pin-input.error {
          border-color: #ef4444;
          animation: error-pulse 0.3s ease;
        }

        @keyframes error-pulse {
          0%, 100% { background: rgba(239, 68, 68, 0.1); }
          50% { background: rgba(239, 68, 68, 0.2); }
        }

        .pin-dot {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 16px;
          height: 16px;
          background: #e63b19;
          border-radius: 50%;
          pointer-events: none;
          transition: all 0.2s ease;
          box-shadow: 0 0 10px rgba(230, 59, 25, 0.5);
        }

        .error-message {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          color: #ef4444;
          font-size: 14px;
          margin-bottom: 24px;
          animation: fade-in 0.3s ease;
        }

        .error-message .material-symbols-outlined {
          font-size: 18px;
        }

        @keyframes fade-in {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .unlock-btn {
          width: 100%;
          padding: 16px 24px;
          font-size: 16px;
          font-weight: 600;
          color: white;
          background: linear-gradient(135deg, #e63b19 0%, #ff6b45 100%);
          border: none;
          border-radius: 14px;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: all 0.3s ease;
          box-shadow: 0 4px 15px rgba(230, 59, 25, 0.3);
        }

        .unlock-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(230, 59, 25, 0.4);
        }

        .unlock-btn:active:not(:disabled) {
          transform: translateY(0);
        }

        .unlock-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .unlock-btn .material-symbols-outlined {
          font-size: 20px;
        }

        .btn-loading {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .spin {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .login-footer {
          margin-top: 32px;
          text-align: center;
        }

        .security-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: rgba(34, 197, 94, 0.1);
          border: 1px solid rgba(34, 197, 94, 0.2);
          border-radius: 20px;
          color: #22c55e;
          font-size: 12px;
          font-weight: 500;
        }

        .security-badge .material-symbols-outlined {
          font-size: 16px;
        }
      `}</style>
    </div>
  );
}
