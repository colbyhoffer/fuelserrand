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
        <div className="page">
          <div className="card">
            <header>
              <div className="masthead">
                <span className="logo"><Link href="/">FUELS <span className="logo-accent">ERRAND</span></Link></span>
                <nav className="nav">
                  <Link href="/">Today</Link>
                  <Link href="/archive/">Archive</Link>
                  <Link href="/dashboard/">Dashboard</Link>
                  <Link href="/decks/">Decks</Link>
                  <Link href="/earnings/">Earnings</Link>
                  <Link href="/sources/">Sources</Link>
                </nav>
              </div>
              <div className="masthead-rule" />
            </header>
            <main>{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
