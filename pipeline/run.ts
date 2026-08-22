// Fuels Errand daily pipeline.
//
//   npm run pipeline            full run: fetch → summarize → save → email
//   npm run pipeline:dry        no email send, still writes data files
//   tsx pipeline/run.ts --baseline   first run: catalogue existing IR docs without analyzing
//
// Reads .env.local if present (local runs); in CI, secrets come from the environment.

import { existsSync, readFileSync } from 'node:fs';
import type { Brief } from './types';

function loadDotEnvLocal(): void {
  if (!existsSync('.env.local')) return;
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadDotEnvLocal();

async function main() {
  const { fetchNews } = await import('./fetch-news');
  const { fetchPrices } = await import('./fetch-prices');
  const { watchIrPages } = await import('./ir-watch');
  const { editStories } = await import('./summarize');
  const { buildWeekAhead } = await import('./week-ahead');
  const { saveBrief, appendPriceHistory, appendDecks } = await import('./store');
  const { sendBriefEmail } = await import('./email');
  const { ENV } = await import('./config');

  const dryRun = process.argv.includes('--dry-run');
  const baseline = process.argv.includes('--baseline');
  const now = new Date();
  const centralDate = now.toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }); // YYYY-MM-DD
  const isFriday = new Date(now.toLocaleString('en-US', { timeZone: 'America/Chicago' })).getDay() === 5;
  const degraded: string[] = [];

  console.log(`[run] Fuels Errand pipeline for ${centralDate}${dryRun ? ' (dry run)' : ''}${baseline ? ' (baseline)' : ''}`);

  const [newsResult, pricesResult, decksResult] = await Promise.allSettled([
    fetchNews(now),
    fetchPrices(now),
    watchIrPages(now, { analyze: !!ENV.anthropicKey, firstRunBaseline: baseline }),
  ]);

  const rawStories = newsResult.status === 'fulfilled' ? newsResult.value : [];
  if (newsResult.status === 'rejected') { console.error(`[run] news stage failed: ${newsResult.reason}`); degraded.push('news'); }
  const prices = pricesResult.status === 'fulfilled' ? pricesResult.value : null;
  if (pricesResult.status === 'rejected' || prices === null) degraded.push('prices');
  const decks = decksResult.status === 'fulfilled' ? decksResult.value : [];
  if (decksResult.status === 'rejected') { console.error(`[run] IR stage failed: ${decksResult.reason}`); degraded.push('investor materials'); }

  const editorial = await editStories(rawStories, prices);
  if (editorial.degraded) degraded.push('AI summarization');

  const brief: Brief = {
    date: centralDate,
    headline: editorial.headline,
    overview: editorial.overview,
    stories: editorial.stories,
    decks,
    prices,
    weekAhead: isFriday ? buildWeekAhead(now) : undefined,
    generatedAt: now.toISOString(),
    degraded: degraded.length ? degraded : undefined,
  };

  const path = saveBrief(brief);
  if (prices) appendPriceHistory(prices);
  appendDecks(decks);
  console.log(`[run] brief saved: ${path} (${brief.stories.length} stories, ${decks.length} deck analyses)`);

  if (!dryRun && !baseline) {
    await sendBriefEmail(brief);
  } else {
    const { renderEmailHtml } = await import('./email');
    const { writeFileSync, mkdirSync } = await import('node:fs');
    mkdirSync('out-preview', { recursive: true });
    writeFileSync('out-preview/email-preview.html', renderEmailHtml(brief));
    console.log('[run] dry run: email preview written to out-preview/email-preview.html');
  }
}

main().catch((err) => {
  console.error('[run] pipeline failed:', err);
  process.exit(1);
});
