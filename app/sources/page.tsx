import { getUserConfig } from '@/lib/data';

export const metadata = { title: 'Sources & Settings · Fuels Errand' };

const GROUP_LABELS: Record<string, string> = {
  refiner: 'Refiners',
  renewables: 'Renewable Diesel / SAF',
  retail: 'Fuel Retail / C-Store',
  bigbox: 'Big Box Fuel',
};

const EDIT_URL = 'https://github.com/colbyhoffer/fuelserrand/edit/main/fuels-errand.config.json';

export default function SourcesPage() {
  const cfg = getUserConfig();
  const groups = [...new Set(cfg.companies.map((c) => c.group))];
  return (
    <div>
      <h1 className="headline">Sources & Settings</h1>
      <p className="overview">
        Current configuration for the daily pipeline. To change anything,{' '}
        <a href={EDIT_URL} target="_blank" rel="noopener noreferrer">edit fuels-errand.config.json ↗</a> — the next
        morning run picks it up automatically.
      </p>

      <h2 className="section">🏢 Investor-Deck Watch List</h2>
      {groups.map((g) => (
        <div key={g} style={{ marginBottom: 14 }}>
          <div className="story-meta" style={{ marginBottom: 6 }}>{GROUP_LABELS[g] ?? g}</div>
          <div className="pill-row">
            {cfg.companies.filter((c) => c.group === g).map((c) => (
              <span key={c.ticker} className={`cat-pill ${c.enabled === false ? 'pill-off' : ''}`}>
                {c.name} ({c.ticker}){c.enabled === false ? ' · off' : ''}
              </span>
            ))}
          </div>
        </div>
      ))}

      <h2 className="section">⭐ Preferred Outlets</h2>
      <p className="overview" style={{ fontSize: 14 }}>
        Nudged upward in story ranking and preferred when several outlets cover the same event. Nothing is ever
        excluded by these lists — important stories from unfamiliar outlets still make the brief.
      </p>
      <div className="pill-row">
        {cfg.preferredOutlets.length ? cfg.preferredOutlets.map((o) => <span key={o} className="cat-pill">{o}</span>) : <span className="story-meta">none set</span>}
      </div>

      <h2 className="section">🔻 Deprioritized Outlets</h2>
      <p className="overview" style={{ fontSize: 14 }}>Nudged downward in ranking — still eligible, never blocked.</p>
      <div className="pill-row">
        {cfg.deprioritizedOutlets.length ? cfg.deprioritizedOutlets.map((o) => <span key={o} className="cat-pill pill-off">{o}</span>) : <span className="story-meta">none set</span>}
      </div>

      <h2 className="section">🚫 Hard-Blocked Source Types</h2>
      <p className="overview" style={{ fontSize: 14 }}>
        Social media, forums, and stock-picking aggregators are never used as source material (this list lives in{' '}
        <a href="https://github.com/colbyhoffer/fuelserrand/blob/main/pipeline/config.ts" target="_blank" rel="noopener noreferrer">pipeline/config.ts ↗</a>).
        Paywalled trade wires appear as marked headline + link only.
      </p>
    </div>
  );
}
