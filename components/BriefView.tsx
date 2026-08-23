import type { Brief, Category, PricePoint, Story } from '@/pipeline/types';
import { formatDateLong } from '@/lib/format';

const CATEGORY_META: Record<Category, { label: string; emoji: string }> = {
  markets: { label: 'Markets & Prices', emoji: '📈' },
  operations: { label: 'Refining & Supply Ops', emoji: '🏭' },
  policy: { label: 'Policy & Credits', emoji: '🏛️' },
  companies: { label: 'Companies & Earnings', emoji: '🏢' },
  deals: { label: 'Deals & Retail', emoji: '🤝' },
};

const CATEGORY_ORDER: Category[] = ['markets', 'operations', 'policy', 'companies', 'deals'];

function fmt(n: number | undefined, digits = 2): string {
  return n == null ? '—' : `$${n.toFixed(digits)}`;
}

function Change({ value, prev, pct }: { value?: number; prev?: number; pct: boolean }) {
  if (value == null || prev == null) return <span className="price-change flat">—</span>;
  const d = value - prev;
  if (Math.abs(d) < 0.0005) return <span className="price-change flat">unch</span>;
  const up = d > 0;
  const body = pct ? `${Math.abs((d / prev) * 100).toFixed(2)}%` : Math.abs(d).toFixed(2);
  return <span className={`price-change ${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {body}</span>;
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
  const prev = brief.prevPrices;
  const g = (k: keyof PricePoint) => (prev?.[k] as number | undefined);
  const presentCategories = CATEGORY_ORDER.filter((c) => brief.stories.some((s) => s.category === c));

  return (
    <article>
      <div className="brief-date">{formatDateLong(brief.date)}</div>
      <h1 className="headline">{brief.headline}</h1>
      {brief.intro && <p className="intro">{brief.intro}</p>}
      <p className="overview">{brief.overview}</p>

      {presentCategories.length > 1 && (
        <nav className="cat-nav" aria-label="Sections">
          {presentCategories.map((c) => (
            <a key={c} href={`#${c}`} className="cat-pill">{CATEGORY_META[c].emoji} {CATEGORY_META[c].label}</a>
          ))}
          {brief.decks.length > 0 && <a href="#decks" className="cat-pill">📊 Investor Materials</a>}
        </nav>
      )}

      {brief.degraded?.length ? (
        <div className="degraded-note">Fallback mode for: {brief.degraded.join(', ')}.</div>
      ) : null}

      {p && (
        <>
          <div className="price-bar">
            {([
              ['Gasoline', fmt(p.rbobSpot, 3), '/gal', p.rbobSpot, g('rbobSpot'), true],
              ['ULSD', fmt(p.ulsdSpot, 3), '/gal', p.ulsdSpot, g('ulsdSpot'), true],
              ['WTI', fmt(p.wtiSpot), '/bbl', p.wtiSpot, g('wtiSpot'), true],
              ['Gas crack', fmt(p.gasCrack), '/bbl', p.gasCrack, g('gasCrack'), false],
              ['Diesel crack', fmt(p.dieselCrack), '/bbl', p.dieselCrack, g('dieselCrack'), false],
              ['Retail gas', fmt(p.retailGas), '/gal', p.retailGas, g('retailGas'), false],
              ['Retail diesel', fmt(p.retailDiesel), '/gal', p.retailDiesel, g('retailDiesel'), false],
            ] as const).map(([label, val, unit, value, prevVal, pct]) => (
              <div className="price-cell" key={label}>
                <div className="price-label">{label}</div>
                <div className="price-value">{val}<span className="price-unit">{unit}</span></div>
                <Change value={value} prev={prevVal} pct={pct} />
              </div>
            ))}
          </div>
          <div className="source-note">
            Change vs. prior data point. Spot prices & single-product cracks vs WTI, from <a href="https://www.eia.gov/petroleum/data.php" target="_blank" rel="noopener noreferrer">EIA data ↗</a>
          </div>
        </>
      )}

      {CATEGORY_ORDER.map((cat) => {
        const stories = brief.stories.filter((s) => s.category === cat);
        if (!stories.length) return null;
        return (
          <section key={cat} id={cat}>
            <h2 className="section">{CATEGORY_META[cat].emoji} {CATEGORY_META[cat].label}</h2>
            {stories.map((s) => <StoryItem key={s.url} story={s} />)}
          </section>
        );
      })}

      {brief.decks.length > 0 && (
        <section id="decks">
          <h2 className="section">📊 New Investor Materials</h2>
          {brief.decks.map((d) => (
            <div className="deck-card" key={d.url}>
              <div className="deck-company">{d.company} <span className="deck-ticker">({d.ticker})</span></div>
              <a href={d.url} target="_blank" rel="noopener noreferrer">{d.title} ↗</a>
              <div className="deck-analysis">{d.analysis}</div>
            </div>
          ))}
        </section>
      )}

      {brief.upcomingEarnings?.length ? (
        <section>
          <h2 className="section">🗓️ Earnings Radar</h2>
          <ul className="week-ahead">
            {brief.upcomingEarnings.map((e) => (
              <li key={e.ticker}><strong>{e.nextEstimate}</strong> — {e.name} ({e.ticker}), estimated</li>
            ))}
          </ul>
          <div className="source-note">Dates estimated from SEC filing cadence — see the <a href="/earnings/">full calendar</a>.</div>
        </section>
      ) : null}

      {brief.weekAhead?.length ? (
        <section>
          <h2 className="section">🔭 Week Ahead</h2>
          <ul className="week-ahead">
            {brief.weekAhead.map((w, i) => <li key={i}><strong>{w.date}</strong> — {w.label}</li>)}
          </ul>
        </section>
      ) : null}
    </article>
  );
}
