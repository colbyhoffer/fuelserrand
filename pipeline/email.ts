import { Resend } from 'resend';
import { ENV } from './config';
import type { Brief, Category, PricePoint, Story } from './types';

// Morning Brew-inspired layout: white card on light gray, conversational
// intro, markets box with day-over-day change arrows, emoji section headers.

const CATEGORY_META: Record<Category, { label: string; emoji: string }> = {
  markets: { label: 'Markets & Prices', emoji: '📈' },
  operations: { label: 'Refining & Supply Ops', emoji: '🏭' },
  policy: { label: 'Policy & Credits', emoji: '🏛️' },
  companies: { label: 'Companies & Earnings', emoji: '🏢' },
  deals: { label: 'Deals & Retail', emoji: '🤝' },
};

const CATEGORY_ORDER: Category[] = ['markets', 'operations', 'policy', 'companies', 'deals'];

const ORANGE = '#c2410c';
const INK = '#1a1a1a';
const GRAY = '#6b7280';
const GREEN = '#0a8a4a';
const RED = '#d64545';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface MarketRow {
  label: string;
  unit: string;
  value?: number;
  prev?: number;
  pct: boolean; // show change as percent (spots) vs absolute
}

function marketRows(p: PricePoint, prev: PricePoint | null | undefined): MarketRow[] {
  const g = (k: keyof PricePoint) => (prev?.[k] as number | undefined);
  return [
    { label: 'Gasoline (NYH spot)', unit: '$/gal', value: p.rbobSpot, prev: g('rbobSpot'), pct: true },
    { label: 'ULSD (NYH spot)', unit: '$/gal', value: p.ulsdSpot, prev: g('ulsdSpot'), pct: true },
    { label: 'WTI', unit: '$/bbl', value: p.wtiSpot, prev: g('wtiSpot'), pct: true },
    { label: 'Gasoline crack', unit: '$/bbl', value: p.gasCrack, prev: g('gasCrack'), pct: false },
    { label: 'Diesel crack', unit: '$/bbl', value: p.dieselCrack, prev: g('dieselCrack'), pct: false },
    { label: 'Retail gas (US avg)', unit: '$/gal', value: p.retailGas, prev: g('retailGas'), pct: false },
    { label: 'Retail diesel (US avg)', unit: '$/gal', value: p.retailDiesel, prev: g('retailDiesel'), pct: false },
  ];
}

function changeHtml(row: MarketRow): string {
  if (row.value == null || row.prev == null) return `<span style="color:${GRAY};">—</span>`;
  const d = row.value - row.prev;
  if (Math.abs(d) < 0.0005) return `<span style="color:${GRAY};">unch</span>`;
  const up = d > 0;
  const color = up ? GREEN : RED;
  const arrow = up ? '▲' : '▼';
  const body = row.pct ? `${Math.abs((d / row.prev) * 100).toFixed(2)}%` : `${Math.abs(d).toFixed(2)}`;
  return `<span style="color:${color};font-weight:600;">${arrow} ${body}</span>`;
}

function marketsBox(brief: Brief): string {
  const p = brief.prices;
  if (!p) return '';
  const rows = marketRows(p, brief.prevPrices)
    .filter((r) => r.value != null)
    .map((r) => `<tr>
      <td style="padding:7px 0;font-size:14px;color:${INK};border-bottom:1px solid #eee;">${r.label}</td>
      <td style="padding:7px 0;font-size:14px;font-weight:700;color:${INK};text-align:right;border-bottom:1px solid #eee;">$${r.value!.toFixed(r.unit === '$/gal' ? 3 : 2)}<span style="color:${GRAY};font-weight:400;font-size:11px;"> ${r.unit}</span></td>
      <td style="padding:7px 0 7px 14px;font-size:13px;text-align:right;border-bottom:1px solid #eee;white-space:nowrap;">${changeHtml(r)}</td>
    </tr>`).join('');
  return `<div style="background:#faf7f2;border:1px solid #eee1cf;border-radius:10px;padding:16px 20px;margin:22px 0;">
    <div style="font-size:12px;font-weight:800;letter-spacing:.1em;color:${ORANGE};margin-bottom:4px;">MARKETS</div>
    <table role="presentation" width="100%" style="border-collapse:collapse;">${rows}</table>
    <div style="font-size:11px;color:${GRAY};margin-top:8px;">Change vs. prior data point. Spot prices & single-product cracks vs WTI from <a href="https://www.eia.gov/petroleum/data.php" style="color:${GRAY};">EIA ↗</a></div>
  </div>`;
}

function storyHtml(s: Story): string {
  const tag = s.paywalled ? ` <span style="font-size:10px;color:#b45309;border:1px solid #e5c48a;border-radius:3px;padding:0 4px;vertical-align:1px;">paywalled</span>` : '';
  return `<div style="margin:0 0 16px;">
    <a href="${esc(s.url)}" style="color:${INK};font-weight:700;font-size:16px;text-decoration:none;line-height:1.35;">${esc(s.title)}</a>${tag}
    ${s.summary ? `<div style="color:#374151;font-size:14px;line-height:1.55;margin-top:3px;">${esc(s.summary)}</div>` : ''}
    <div style="font-size:12px;color:${GRAY};margin-top:3px;">${esc(s.source)} · <a href="${esc(s.url)}" style="color:${GRAY};">original source ↗</a></div>
  </div>`;
}

function sectionHeader(emoji: string, label: string): string {
  return `<div style="margin:28px 0 14px;border-bottom:2px solid ${ORANGE};padding-bottom:5px;">
    <span style="font-size:16px;">${emoji}</span>
    <span style="font-size:13px;font-weight:800;letter-spacing:.09em;color:${ORANGE};text-transform:uppercase;margin-left:6px;">${label}</span>
  </div>`;
}

export function renderEmailHtml(brief: Brief): string {
  const dateLong = new Date(brief.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

  const sections = CATEGORY_ORDER.map((cat) => {
    const stories = brief.stories.filter((s) => s.category === cat);
    if (!stories.length) return '';
    const meta = CATEGORY_META[cat];
    return sectionHeader(meta.emoji, meta.label) + stories.map(storyHtml).join('');
  }).join('');

  const decks = brief.decks.length
    ? sectionHeader('📊', 'New Investor Materials') + brief.decks.map((d) => `<div style="margin:0 0 16px;padding:14px 16px;background:#faf7f2;border:1px solid #eee1cf;border-radius:10px;">
        <div style="font-weight:800;font-size:15px;color:${INK};">${esc(d.company)} <span style="color:${GRAY};font-weight:400;">(${esc(d.ticker)})</span></div>
        <a href="${esc(d.url)}" style="font-size:13px;color:#1d4ed8;">${esc(d.title)} ↗</a>
        <div style="font-size:14px;color:#374151;line-height:1.55;margin-top:6px;white-space:pre-wrap;">${esc(d.analysis)}</div>
      </div>`).join('')
    : '';

  const earnings = brief.upcomingEarnings?.length
    ? sectionHeader('🗓️', 'Earnings Radar') + `<div style="font-size:14px;color:#374151;line-height:1.7;">
        ${brief.upcomingEarnings.map((e) => `<div><strong>${esc(e.name)}</strong> (${esc(e.ticker)}) — est. ${esc(e.nextEstimate)}</div>`).join('')}
        <div style="font-size:12px;color:${GRAY};margin-top:4px;">Dates estimated from each company's SEC filing cadence · <a href="${ENV.siteUrl}/earnings/" style="color:${GRAY};">full calendar ↗</a></div>
      </div>`
    : '';

  const weekAhead = brief.weekAhead?.length
    ? sectionHeader('🔭', 'Week Ahead') + `<div style="font-size:14px;color:#374151;line-height:1.8;">
        ${brief.weekAhead.map((w) => `<div><strong style="color:${ORANGE};">${esc(w.date)}</strong> — ${esc(w.label)}</div>`).join('')}
      </div>`
    : '';

  const degraded = brief.degraded?.length
    ? `<div style="font-size:12px;color:#92400e;background:#fef7e7;border:1px solid #f2dfb6;border-radius:8px;padding:8px 12px;margin:14px 0;">Heads up: fallback mode today for ${brief.degraded.join(', ')}.</div>`
    : '';

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f4f4f4;">
  <div style="max-width:600px;margin:0 auto;padding:18px 12px;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="background:#ffffff;border-radius:12px;padding:28px 30px;border:1px solid #e8e8e8;">

      <table role="presentation" width="100%" style="border-collapse:collapse;margin-bottom:6px;"><tr>
        <td style="font-size:20px;font-weight:900;letter-spacing:.06em;color:${INK};">FUELS <span style="color:${ORANGE};">ERRAND</span></td>
        <td style="text-align:right;font-size:12px;color:${GRAY};">${dateLong}</td>
      </tr></table>
      <div style="border-top:3px solid ${INK};margin-bottom:18px;"></div>

      ${brief.intro ? `<p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 14px;">${esc(brief.intro)}</p>` : ''}

      <h1 style="font-size:22px;color:${INK};margin:0 0 8px;line-height:1.3;">${esc(brief.headline)}</h1>
      <p style="font-size:14.5px;color:#4b5563;line-height:1.6;margin:0;">${esc(brief.overview)}</p>
      ${degraded}
      ${marketsBox(brief)}
      ${sections}
      ${decks}
      ${earnings}
      ${weekAhead}

      <div style="border-top:1px solid #e8e8e8;margin-top:30px;padding-top:14px;font-size:12px;color:${GRAY};line-height:1.7;">
        <a href="${ENV.siteUrl}" style="color:${ORANGE};font-weight:700;">Today</a> ·
        <a href="${ENV.siteUrl}/archive/" style="color:${GRAY};">Archive</a> ·
        <a href="${ENV.siteUrl}/dashboard/" style="color:${GRAY};">Dashboard</a> ·
        <a href="${ENV.siteUrl}/decks/" style="color:${GRAY};">Investor Decks</a> ·
        <a href="${ENV.siteUrl}/earnings/" style="color:${GRAY};">Earnings</a><br>
        Every item links to its original source. No social media, no forums.
      </div>
    </div>
  </div></body></html>`;
}

export async function sendBriefEmail(brief: Brief): Promise<boolean> {
  if (!ENV.resendKey) {
    console.warn('[email] RESEND_API_KEY not set — skipping send');
    return false;
  }
  const resend = new Resend(ENV.resendKey);
  const { error } = await resend.emails.send({
    from: ENV.briefFrom,
    to: ENV.briefTo,
    subject: `⛽ Fuels Errand · ${brief.headline}`,
    html: renderEmailHtml(brief),
  });
  if (error) {
    console.error(`[email] send failed: ${error.message}`);
    return false;
  }
  console.log(`[email] sent to ${ENV.briefTo}`);
  return true;
}
