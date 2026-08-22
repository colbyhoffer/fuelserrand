import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fuels Errand',
  description: 'Daily briefing on refined fuels markets: gasoline, diesel, renewable diesel, and SAF. Every item links to its original source.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <div className="site-header-inner">
            <span className="logo"><Link href="/">Fuels Errand</Link></span>
            <nav className="nav">
              <Link href="/">Today</Link>
              <Link href="/archive/">Archive</Link>
              <Link href="/dashboard/">Dashboard</Link>
              <Link href="/decks/">Investor Decks</Link>
            </nav>
          </div>
        </header>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
