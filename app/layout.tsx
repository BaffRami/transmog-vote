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
          <div style={{ maxWidth: 900, margin: '0 auto', padding: '0.6rem 1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <div style={{ fontSize: '0.6rem', color: '#6b5a3e', textTransform: 'uppercase', letterSpacing: '0.15em' }}>
                Firestorm · Fnatics Guild
              </div>
              <div style={{ fontFamily: 'Cinzel Decorative, Cinzel, serif', color: '#f5c518', fontWeight: 700, fontSize: '1.1rem', letterSpacing: '0.05em' }}>
                ⚔ Transmog Competition ⚔
              </div>
            </div>
          <Nav />
          </div>
        </header>
        <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem', minHeight: 'calc(100vh - 130px)' }}>
          {children}
        </main>
        <footer style={{ textAlign: 'center', padding: '1.5rem', fontSize: '0.65rem', color: '#2a1f10', borderTop: '1px solid #1a1612' }}>
          Fnatics · Firestorm WoW Private Server · For the Horde (or Alliance, we don't judge)
        </footer>
      </body>
    </html>
  );
}
