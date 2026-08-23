# Fuels Errand — build conventions

Fuels Errand is a dark-only product. **Every screen sits on the app surface**: give your outermost container (or `body`) `background: var(--bg); color: var(--text)` — components assume it and render illegibly on white. There is no provider component; the tokens come from the stylesheet.

## Styling idiom: CSS custom properties + a small global class vocabulary

No utility framework. Style with the tokens (inline `style` or CSS), and reuse the global classes for established patterns. All are defined in `styles.css`'s import closure — read it before styling.

**Tokens** (the complete set): `--bg` `#201e1c` page · `--card` `#2e2c29` card surface · `--panel` `#38352f` inset boxes · `--border` `#413d38` hairlines · `--panel-border` `#4a443a` panel edges · `--text` `#f0efed` headings · `--body-text` `#d8d5d1` body copy · `--muted` `#a39d94` meta · `--accent` `#e98b60` coral (headers, links, emphasis) · `--accent-2` (= accent; this palette has no blue) · `--chart-2` `#d9c27e` sandy gold, second chart series only · `--good` `#6fcf97` / `--bad` `#eb8787` price up/down.

**Global classes** (use these before inventing): layout `page` `card` `masthead` `logo` (+`logo-accent` span) `masthead-rule` `nav` `footer-note`; brief anatomy `brief-date` `headline` `intro` `overview` `section` (h2, coral underline) `story` `story-title` `story-summary` `story-meta` `paywall-tag` `degraded-note`; data `price-bar` `price-cell` `price-label` `price-value` `price-unit` `price-change` (+`up`/`down`/`flat`) `chart-panel` `chart-title` `earnings-table` `earnings-date` `earnings-past` `source-note`; navigation chips `cat-nav` `pill-row` `cat-pill` (+`pill-off`); cards & lists `deck-card` `deck-company` `deck-ticker` `deck-analysis` `archive-list` `archive-date` `week-ahead`.

Type is `system-ui` throughout (no webfonts). Section headers are 13px/800/uppercase coral with a 2px coral bottom border — the `section` class does this. Emoji lead section headers by house style (📈 🏭 🏛️ 🏢 🤝); do not use emoji as icons elsewhere. Price-direction glyphs are `▲`/`▼` colored `--good`/`--bad`.

## Components

- `BriefView` — the full daily-brief page (headline → intro → category pills → price bar → sections → deck cards → earnings radar → week ahead). Takes one `brief` object; see `BriefView.d.ts` for the shape and `components/general/BriefView/BriefView.prompt.md` for a complete realistic example. Pass `prevPrices` to light up the ▲/▼ change indicators; `degraded` renders the fallback banner.
- `LineChart` — self-contained charcoal chart panel (server-renderable SVG). Series colors: first `var(--accent)`, second `var(--chart-2)`. Empty `points` renders an honest empty state.

## Idiomatic snippet

```jsx
<div style={{ background: 'var(--bg)', color: 'var(--text)', padding: 28 }}>
  <div className="card">
    <h2 className="section">📈 Markets &amp; Prices</h2>
    <LineChart
      title="Crack Spreads vs WTI" unit="$/bbl"
      sourceUrl="https://www.eia.gov/dnav/pet/pet_pri_spt_s1_d.htm" sourceLabel="EIA spot prices"
      series={[
        { label: 'Gasoline crack', color: 'var(--accent)', points },
        { label: 'Diesel crack', color: 'var(--chart-2)', points: points2 },
      ]}
    />
    <div className="story">
      <a className="story-title" href="#">Story headline</a>
      <div className="story-summary">One-to-two sentence summary in body color.</div>
      <div className="story-meta">Source · original source ↗</div>
    </div>
  </div>
</div>
```
