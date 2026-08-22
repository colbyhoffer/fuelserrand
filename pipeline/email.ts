import { Resend } from 'resend';
import { ENV } from './config';
import type { Brief, Category, Story } from './types';

const CATEGORY_LABELS: Record<Category, string> = {
  markets: 'Markets & Prices',
  policy: 'Policy & Credits',
  operations: 'Refining & Supply Ops',
  deals: 'Deals & Retail Expansion',
  companies: 'Companies & Earnings',
};

const CATEGORY_ORDER: Category[] = ['markets', 'operations', 'policy', 'companies', 'deals'];

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function fmt(n: number | undefined, digits = 2, prefix = '$'): string {
  return n == null ? '—' : `${prefix}${n.toFixed(digits)}`;
}

function storyHtml(s: Story): string {
  const tag = s.paywalled ? ' <span style="font-size:11px;color:#b45309;border:1px solid #b45309;border-radius:3px;padding:0 4px;vertical-align:1px;">paywalled</span>' : '';
  const summary = s.summary ? `<div style="color:#374151;font-size:14px;line-height:1.5;margin-top:2px;">${esc(s.summary)}</div>` : '';
  return `<div style="margin:0 0 14px;">
    <a href="${esc(s.url)}" style="color:#111827;font-weight:600;font-size:15px;text-decoration:none;">${esc(s.title)}</a>${tag}
    ${summary}
    <div style="font-size:12px;color:#6b7280;margin-top:2px;">${esc(s.source)} · <a href="${esc(s.url)}" style="color:#6b7280;">original source ↗</a></div>
  </div>`;
}

export function renderEmailHtml(brief: Brief): string {
  const p = brief.prices;
  const priceBar = p
    ? `<table role="presentation" width="100%" style="border-collapse:collapse;background:#0f172a;border-radius:8px;margin:16px 0;"><tr>
        ${[
          ['Gasoline', fmt(p.rbobSpot), '/gal'],
          ['ULSD', fmt(p.ulsdSpot), '/gal'],
          ['WTI', fmt(p.wtiSpot), '/bbl'],
          ['Gas crack', fmt(p.gasCrack), '/bbl'],
          ['Diesel crack', fmt(p.dieselCrack), '/bbl'],
          ['Retail gas', fmt(p.retailGas), '/gal'],
        ].map(([label, val, unit]) => `<td style="padding:12px 8px;text-align:center;">
            <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;">${label}</div>
            <div style="font-size:16px;color:#f8fafc;font-weight:700;">${val}<span style="font-size:11px;color:#94a3b8;font-weight:400;">${unit}</span></div>
          </td>`).join('')}
      </tr></table>
      <div style="font-size:11px;color:#9ca3af;margin:-8px 0 16px;">Spot prices & cracks from <a href="https://www.eia.gov/petroleum/data.php" style="color:#9ca3af;">EIA data ↗</a>. Cracks are single-product spreads vs WTI.</div>`
    : '';

  const sections = CATEGORY_ORDER.map((cat) => {
    const stories = brief.stories.filter((s) => s.category === cat);
    if (stories.length === 0) return '';
    return `<h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#b45309;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin:24px 0 12px;">${CATEGORY_LABELS[cat]}</h2>
      ${stories.map(storyHtml).join('')}`;
  }).join('');

  const decks = brief.decks.length
    ? `<h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#b45309;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin:24px 0 12px;">New Investor Materials</h2>
      ${brief.decks.map((d) => `<div style="margin:0 0 16px;padding:12px;background:#f9fafb;border-radius:6px;">
        <div style="font-weight:700;font-size:15px;color:#111827;">${esc(d.company)} <span style="color:#6b7280;font-weight:400;">(${esc(d.ticker)})</span></div>
        <a href="${esc(d.url)}" style="font-size:13px;color:#1d4ed8;">${esc(d.title)} ↗</a>
        <div style="font-size:14px;color:#374151;line-height:1.5;margin-top:6px;white-space:pre-wrap;">${esc(d.analysis)}</div>
      </div>`).join('')}`
    : '';

  const weekAhead = brief.weekAhead?.length
    ? `<h2 style="font-size:13px;text-transform:uppercase;letter-spacing:.08em;color:#b45309;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin:24px 0 12px;">Week Ahead</h2>
      <ul style="padding-left:18px;color:#374151;font-size:14px;line-height:1.7;">${brief.weekAhead.map((w) => `<li><strong>${esc(w.date)}</strong> — ${esc(w.label)}</li>`).join('')}</ul>`
    : '';

  const degraded = brief.degraded?.length
    ? `<div style="font-size:12px;color:#b45309;background:#fffbeb;border-radius:6px;padding:8px 12px;margin:16px 0;">Heads up: these stages ran in fallback mode today: ${brief.degraded.join(', ')}.</div>`
    : '';

  const dateLong = new Date(brief.date + 'T12:00:00Z').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

  return `<!doctype html><html><body style="margin:0;padding:0;background:#f3f4f6;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;">
    <div style="background:#ffffff;border-radius:10px;padding:28px;">
      <div style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#b45309;font-weight:700;">Fuels Errand</div>
      <div style="font-size:13px;color:#6b7280;margin-top:2px;">${dateLong}</div>
      <h1 style="font-size:22px;color:#111827;margin:12px 0 6px;line-height:1.3;">${esc(brief.headline)}</h1>
      <p style="font-size:15px;color:#374151;line-height:1.6;margin:0 0 8px;">${esc(brief.overview)}</p>
      ${degraded}
      ${priceBar}
      ${sections}
      ${decks}
      ${weekAhead}
      <div style="border-top:1px solid #e5e7eb;margin-top:28px;padding-top:12px;font-size:12px;color:#9ca3af;">
        Every item links to its original source. Archive & dashboard: <a href="${ENV.siteUrl}" style="color:#9ca3af;">${ENV.siteUrl.replace('https://', '')}</a>
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
    subject: `Fuels Errand · ${brief.date} · ${brief.headline}`,
    html: renderEmailHtml(brief),
  });
  if (error) {
    console.error(`[email] send failed: ${error.message}`);
    return false;
  }
  console.log(`[email] sent to ${ENV.briefTo}`);
  return true;
}
