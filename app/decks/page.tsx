import { getDecks } from '@/lib/data';

export const metadata = { title: 'Investor Decks · Fuels Errand' };

export default function DecksPage() {
  const decks = getDecks();
  return (
    <div>
      <h1 className="headline">Investor Materials Library</h1>
      <p className="overview">
        New presentations, earnings materials, and transcripts from watched refiners, renewable fuel producers,
        and fuel retailers — analyzed for what they mean for refined fuels markets. Each links to the original document.
      </p>
      {decks.length === 0 && <p className="overview" style={{ marginTop: 24 }}>Nothing analyzed yet — new documents are picked up automatically as companies publish them.</p>}
      {decks.map((d) => (
        <div className="deck-card" key={d.url} style={{ marginTop: 20 }}>
          <div className="deck-company">{d.company} <span className="deck-ticker">({d.ticker})</span></div>
          <div className="story-meta">{d.docType} · found {d.foundAt.slice(0, 10)}</div>
          <a href={d.url} target="_blank" rel="noopener noreferrer">{d.title} ↗</a>
          <div className="deck-analysis">{d.analysis}</div>
        </div>
      ))}
    </div>
  );
}
