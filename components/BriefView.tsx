import type { Brief, Category, Story } from '@/pipeline/types';
import { formatDateLong } from '@/lib/data';

const CATEGORY_LABELS: Record<Category, string> = {
  markets: 'Markets & Prices',
  policy: 'Policy & Credits',
  operations: 'Refining & Supply Ops',
  deals: 'Deals & Retail Expansion',
  companies: 'Companies & Earnings',
};

const CATEGORY_ORDER: Category[] = ['markets', 'operations', 'policy', 'companies', 'deals'];

function fmt(n: number | undefined, digits = 2): string {
  return n == null ? '—' : `$${n.toFixed(digits)}`;
}

function StoryItem({ story }: { story: Story }) {
  return (
    <div className="story">
      <a className="story-title" href={story.url} target="_blank" rel="noopener noreferrer">{story.title}</a>
      {story.paywalled && <span className="paywall-tag">paywalled</span>}
      {story.summary && <div className="story-summary">{story.summary}</div>}
      <div className="story-meta">
        {story.source} · <a href={story.url} target="_blank" rel="noopener noreferrer">original source ↗</a>
      </div>
    </div>
  );
}

export default function BriefView({ brief }: { brief: Brief }) {
  const p = brief.prices;
  return (
    <article>
      <div className="brief-date">{formatDateLong(brief.date)}</div>
      <h1 className="headline">{brief.headline}</h1>
      <p className="overview">{brief.overview}</p>

      {brief.degraded?.length ? (
        <div className="degraded-note">Fallback mode for: {brief.degraded.join(', ')}.</div>
      ) : null}

      {p && (
        <>
          <div className="price-bar">
            {([
              ['Gasoline', fmt(p.rbobSpot), '/gal'],
              ['ULSD', fmt(p.ulsdSpot), '/gal'],
              ['WTI', fmt(p.wtiSpot), '/bbl'],
              ['Gas crack', fmt(p.gasCrack), '/bbl'],
              ['Diesel crack', fmt(p.dieselCrack), '/bbl'],
              ['Retail gas', fmt(p.retailGas), '/gal'],
              ['Retail diesel', fmt(p.retailDiesel), '/gal'],
            ] as const).map(([label, val, unit]) => (
              <div className="price-cell" key={label}>
                <div className="price-label">{label}</div>
                <div className="price-value">{val}<span className="price-unit">{unit}</span></div>
              </div>
            ))}
          </div>
          <div className="source-note">
            Spot prices & single-product cracks vs WTI, from <a href="https://www.eia.gov/petroleum/data.php" target="_blank" rel="noopener noreferrer">EIA data ↗</a>
          </div>
        </>
      )}

      {CATEGORY_ORDER.map((cat) => {
        const stories = brief.stories.filter((s) => s.category === cat);
        if (!stories.length) return null;
        return (
          <section key={cat}>
            <h2 className="section">{CATEGORY_LABELS[cat]}</h2>
            {stories.map((s) => <StoryItem key={s.url} story={s} />)}
          </section>
        );
      })}

      {brief.decks.length > 0 && (
        <section>
          <h2 className="section">New Investor Materials</h2>
          {brief.decks.map((d) => (
            <div className="deck-card" key={d.url}>
              <div className="deck-company">{d.company} <span className="deck-ticker">({d.ticker})</span></div>
              <a href={d.url} target="_blank" rel="noopener noreferrer">{d.title} ↗</a>
              <div className="deck-analysis">{d.analysis}</div>
            </div>
          ))}
        </section>
      )}

      {brief.weekAhead?.length ? (
        <section>
          <h2 className="section">Week Ahead</h2>
          <ul className="week-ahead">
            {brief.weekAhead.map((w, i) => <li key={i}><strong>{w.date}</strong> — {w.label}</li>)}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
