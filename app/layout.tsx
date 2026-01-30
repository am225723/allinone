import './globals.css';
import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import NotificationCenter from '@/components/NotificationCenter';
import OneSignalInit from '@/components/OneSignalInit';
import ServiceWorkerRegistration from '@/components/ServiceWorkerRegistration';

export const metadata: Metadata = {
  title: 'Unified Communications Dashboard',
  description: 'Manage OpenPhone SMS and Gmail communications in one place',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Unified Comms',
  },
  icons: {
    icon: '/icons/icon-192x192.png',
    apple: '/icons/icon-192x192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#e63b19',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <OneSignalInit />
        <ServiceWorkerRegistration />
        <div className="app-shell">
          {/* Top Navigation Bar */}
          <header className="topbar">
            <div className="container topbar-inner">
              {/* Brand */}
              <Link href="/" className="brand">
                <div className="brand-logo">UC</div>
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

                <Link href="/search" className="nav-link">
                  <span className="material-symbols-outlined icon">search</span>
                  Search
                </Link>
                <Link href="/settings" className="nav-link">
                  <span className="material-symbols-outlined icon">settings</span>
                  Settings
                </Link>
                <Link href="/admin" className="nav-link">
                  <span className="material-symbols-outlined icon">admin_panel_settings</span>
                  Admin
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
      </body>
    </html>
  );
}