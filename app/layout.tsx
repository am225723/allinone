import './globals.css';
import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import NotificationCenter from '@/components/NotificationCenter';
import OneSignalInit from '@/components/OneSignalInit';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';
import PinGuard from '@/components/PinGuard';

export const metadata: Metadata = {
  title: 'Unified Communications Dashboard',
  description: 'Manage OpenPhone SMS and Gmail communications in one place',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Unified Comms',
    startupImage: [
      {
        url: '/splash/apple-splash-2048-2732.png',
        media: '(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: '/splash/apple-splash-1668-2388.png',
        media: '(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: '/splash/apple-splash-1536-2048.png',
        media: '(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2)',
      },
      {
        url: '/splash/apple-splash-1290-2796.png',
        media: '(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: '/splash/apple-splash-1179-2556.png',
        media: '(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: '/splash/apple-splash-1170-2532.png',
        media: '(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: '/splash/apple-splash-1125-2436.png',
        media: '(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3)',
      },
      {
        url: '/splash/apple-splash-750-1334.png',
        media: '(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2)',
      },
    ],
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
};

export const viewport: Viewport = {
  themeColor: '#e63b19',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
        <link rel="apple-touch-icon" sizes="144x144" href="/icons/icon-144x144.png" />
        <link rel="apple-touch-icon" sizes="120x120" href="/icons/icon-128x128.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Unified Comms" />
      </head>
      <body suppressHydrationWarning>
        <OneSignalInit />
        <ServiceWorkerRegistration />
        <PinGuard>
        <div className="app-shell">
          {/* Top Navigation Bar */}
          <header className="topbar">
            <div className="container topbar-inner">
              {/* Brand */}
              <Link href="/" className="brand">
                <img src="/icons/icon-192x192.png" alt="Integrative Psychiatry" className="brand-logo-img" />
                <div className="brand-title">
                  <strong>Unified Comms</strong>
                  <span>Command Center</span>
                </div>
              </Link>

              {/* Navigation Links */}
              <nav className="nav-links">
                <Link href="/" className="nav-link">
                  <span className="material-symbols-outlined icon">dashboard</span>
                  Dashboard
                </Link>
                
                {/* OpenPhone Section */}
                <div className="relative group">
                  <Link href="/openphone" className="nav-link">
                    <span className="material-symbols-outlined icon">sms</span>
                    OpenPhone
                  </Link>
                </div>

                {/* Gmail Section */}
                <div className="relative group">
                  <Link href="/gmail" className="nav-link">
                    <span className="material-symbols-outlined icon">mail</span>
                    Gmail
                  </Link>
                </div>

                <Link href="/tasks" className="nav-link">
                  <span className="material-symbols-outlined icon">task_alt</span>
                  Tasks
                </Link>
                <Link href="/search" className="nav-link">
                  <span className="material-symbols-outlined icon">search</span>
                  Search
                </Link>
                <Link href="/settings" className="nav-link">
                  <span className="material-symbols-outlined icon">settings</span>
                  Settings
                </Link>
              </nav>

              {/* Right Actions */}
              <div className="flex items-center gap-3">
                <NotificationCenter />
                <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-orange-400 p-[2px]">
                  <div className="w-full h-full rounded-full bg-background-dark flex items-center justify-center text-sm font-bold">
                    A
                  </div>
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="pb-16">
            {children}
          </main>
        </div>
        </PinGuard>
      </body>
    </html>
  );
}