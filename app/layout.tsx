import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fanatics Transmog Competition',
  description: 'Firestorm WoW — Fanatics Guild Transmog Voting',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <main style={{ maxWidth: 900, margin: '0 auto', padding: '2rem 1.5rem', minHeight: 'calc(100vh - 60px)' }}>
          {children}
        </main>
      </body>
    </html>
  );
}