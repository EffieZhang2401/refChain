import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RefChain User Portal',
  description: 'Track your referral points and rewards'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
