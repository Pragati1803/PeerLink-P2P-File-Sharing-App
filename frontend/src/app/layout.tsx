import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PeerLink – P2P File Sharing',
  description: 'Secure peer-to-peer file transfers with invite codes. No cloud, no middleman.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
