import '../globals.css';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Login - Unified Communications',
  description: 'Enter your PIN to access the dashboard',
};

export const viewport: Viewport = {
  themeColor: '#e63b19',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
