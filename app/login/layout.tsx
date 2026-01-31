import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Login - Unified Communications',
  description: 'Enter your PIN to access the dashboard',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
