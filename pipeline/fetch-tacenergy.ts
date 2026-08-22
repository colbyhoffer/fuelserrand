import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { FETCH_TIMEOUT_MS } from './config';
import type { Story } from './types';

// TACenergy Market Talk — daily refined-fuels market commentary with no RSS
// feed, so the index page is scraped directly. A seen-set keeps posts from
// repeating across days; every story links to the original post.

const INDEX_URL = 'https://www.tacenergy.com/news-and-views/market-talk';
const SEEN_PATH = 'data/markettalk-seen.json';
const MAX_POSTS_PER_RUN = 3;
const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const MONTHS: Record<string, number> = { jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11 };

function loadSeen(): string[] {
  return existsSync(SEEN_PATH) ? JSON.parse(readFileSync(SEEN_PATH, 'utf8')) : [];
}

function saveSeen(seen: string[]): void {
  mkdirSync('data', { recursive: true });
  // Keep the file bounded; old entries never resurface on the index anyway.
  writeFileSync(SEEN_PATH, JSON.stringify(seen.slice(-300), null, 2));
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers: { 'user-agent': BROWSER_UA } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;|&#160;/g, ' ').replace(/&amp;/g, '&').replace(/&#39;|&rsquo;/g, "'").replace(/\s+/g, ' ').trim();
}

function parsePost(html: string): { title: string; publishedAt: Date | null; snippet: string } {
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/);
  const title = h1 ? stripTags(h1[1]) : '';
  const afterH1 = h1 ? html.slice(html.indexOf(h1[0])) : html;

  let publishedAt: Date | null = null;
  const md = afterH1.slice(0, 3000).match(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})/);
  if (md) publishedAt = new Date(Date.UTC(+md[3], MONTHS[md[1].toLowerCase()], +md[2], 12));

  let snippet = '';
  for (const m of afterH1.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) {
    const text = stripTags(m[1]);
    if (text.length > 80) { snippet = text.slice(0, 600); break; }
  }
  return { title, publishedAt, snippet };
}

export async function fetchMarketTalk(now: Date): Promise<Story[]> {
  const seen = loadSeen();
  const seenSet = new Set(seen);
  const index = await fetchHtml(INDEX_URL);

  const slugs: string[] = [];
  for (const m of index.matchAll(/href="(\/news-and-views\/market-talk\/[a-z0-9-]+)"/g)) {
    const url = `https://www.tacenergy.com${m[1]}`;
    if (!slugs.includes(url) && !seenSet.has(url)) slugs.push(url);
  }

  const stories: Story[] = [];
  for (const url of slugs.slice(0, MAX_POSTS_PER_RUN)) {
    seen.push(url);
    try {
      const { title, publishedAt, snippet } = parsePost(await fetchHtml(url));
      if (!title) continue;
      // Only skip clearly-stale posts; undated ones are assumed fresh since
      // they just appeared on the index.
      if (publishedAt && now.getTime() - publishedAt.getTime() > 4 * 86400_000) continue;
      stories.push({
        title,
        url,
        source: 'TACenergy Market Talk',
        publishedAt: (publishedAt ?? now).toISOString(),
        category: 'markets',
        summary: '',
        paywalled: false,
        raw: snippet,
      });
    } catch (err: any) {
      console.warn(`[markettalk] post failed (${url}): ${err?.message ?? err}`);
    }
  }

  saveSeen(seen);
  console.log(`[markettalk] ${stories.length} new post(s)`);
  return stories;
}
