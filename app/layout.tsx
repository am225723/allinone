import './globals.css';
import type { Metadata } from 'next';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Unified Communications Dashboard',
  description: 'Manage OpenPhone SMS and Gmail communications in one place',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=Noto+Sans:wght@400;500;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
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

                <Link href="/settings" className="nav-link">
                  <span className="material-symbols-outlined icon">settings</span>
                  Settings
                </Link>
              </nav>

              {/* Right Actions */}
              <div className="flex items-center gap-3">
                <button className="relative p-2 text-gray-400 hover:text-white transition-colors rounded-lg hover:bg-white/5">
                  <span className="material-symbols-outlined">notifications</span>
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full border-2 border-background-dark"></span>
                </button>
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