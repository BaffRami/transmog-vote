import Nav from './components/Nav';

import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fnatics Transmog Competition',
  description: 'Firestorm WoW — Fnatics Guild Transmog Voting',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header style={{ borderBottom: '1px solid #2a1f10', background: 'rgba(13,11,10,0.95)', position: 'sticky', top: 0, zIndex: 50 }}>
  <div style={{ maxWidth: 900, margin: '0 auto', padding: '1rem 1.5rem' }}>
    <div style={{ textAlign: 'center', marginBottom: '0.5rem' }}>
    </div>
    <Nav />
  </div>
</header>
        <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem', minHeight: 'calc(100vh - 130px)' }}>
          {children}
        </main>
      </body>
    </html>
  );
}
