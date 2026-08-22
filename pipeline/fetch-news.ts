import Parser from 'rss-parser';
import { FEEDS, NEWS_QUERIES, BLOCKED_DOMAINS, PAYWALLED_DOMAINS, FETCH_TIMEOUT_MS, LOOKBACK_HOURS } from './config';
import type { Category, Story } from './types';

const BROWSER_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

const parser = new Parser({
  customFields: { item: [['News:Source', 'newsSource']] },
});

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isBlocked(url: string): boolean {
  const host = hostnameOf(url);
  return !host || BLOCKED_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
}

function isPaywalled(url: string): boolean {
  const host = hostnameOf(url);
  return PAYWALLED_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
}

// Monday briefs cover the weekend; other weekdays cover ~the prior day.
function lookbackHours(now: Date): number {
  return now.getUTCDay() === 1 ? 78 : LOOKBACK_HOURS;
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

async function fetchFeed(url: string): Promise<Parser.Output<any>> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { 'user-agent': BROWSER_UA, accept: 'application/rss+xml, application/xml, text/xml, */*' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  let xml = await res.text();
  // Bing embeds the raw search query as an unescaped xmlns:News attribute,
  // which breaks XML parsing when the query contains quotes. Strip it.
  xml = xml.replace(/\sxmlns:News="[\s\S]*?">/, '>');
  return parser.parseString(xml);
}

interface RawItem {
  title: string;
  url: string;
  source: string;
  publishedAt: Date;
  category: Category;
  snippet: string;
}

async function fetchDirectFeeds(now: Date): Promise<RawItem[]> {
  const cutoff = now.getTime() - lookbackHours(now) * 3600_000;
  const results = await Promise.allSettled(
    FEEDS.map(async (feed) => {
      const parsed = await fetchFeed(feed.url);
      return (parsed.items ?? []).flatMap((item) => {
        const url = item.link ?? '';
        const published = item.isoDate ? new Date(item.isoDate) : now;
        if (!url || !item.title || published.getTime() < cutoff) return [];
        return [{
          title: stripHtml(item.title),
          url,
          source: feed.name,
          publishedAt: published,
          category: feed.defaultCategory,
          snippet: stripHtml(item.contentSnippet ?? item.content ?? '').slice(0, 600),
        }];
      });
    }),
  );
  const items: RawItem[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') items.push(...r.value);
    else console.warn(`[news] feed failed: ${FEEDS[i].name}: ${r.reason?.message ?? r.reason}`);
  });
  return items;
}

// Bing News RSS is used as a *finder*: its apiclick links carry the original
// publisher URL in the `url=` query param, so every story links directly to
// its original source. Blocked domains (social/forums/aggregators) are dropped.
function directUrlOf(bingLink: string): string {
  try {
    const u = new URL(bingLink);
    if (/(^|\.)bing\.com$/.test(u.hostname)) {
      const target = u.searchParams.get('url');
      if (target) return target;
    }
    return bingLink;
  } catch {
    return bingLink;
  }
}

async function fetchQueryNews(now: Date): Promise<RawItem[]> {
  const cutoff = now.getTime() - lookbackHours(now) * 3600_000;
  const results = await Promise.allSettled(
    NEWS_QUERIES.map(async ({ query, category }) => {
      // sortbydate=1: newest first, so the lookback cutoff sees fresh items.
      const url = `https://www.bing.com/news/search?q=${encodeURIComponent(query)}&qft=sortbydate%3d%221%22&format=RSS`;
      const parsed = await fetchFeed(url);
      const out: RawItem[] = [];
      for (const item of (parsed.items ?? []).slice(0, 15)) {
        const published = item.isoDate ? new Date(item.isoDate) : now;
        if (!item.link || !item.title || published.getTime() < cutoff) continue;
        const resolved = directUrlOf(item.link);
        if (isBlocked(resolved)) continue;
        const sourceField = (item as any).newsSource;
        const source = (typeof sourceField === 'string' && sourceField.trim()) ? stripHtml(sourceField) : hostnameOf(resolved);
        out.push({
          title: stripHtml(item.title),
          url: resolved,
          source,
          publishedAt: published,
          category,
          snippet: stripHtml(item.contentSnippet ?? '').slice(0, 600),
        });
      }
      return out;
    }),
  );
  const items: RawItem[] = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') items.push(...r.value);
    else console.warn(`[news] query failed: ${NEWS_QUERIES[i].query}: ${r.reason?.message ?? r.reason}`);
  });
  return items;
}

function dedupe(items: RawItem[]): RawItem[] {
  const seen = new Set<string>();
  const out: RawItem[] = [];
  for (const item of items.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())) {
    const urlKey = item.url.replace(/[?#].*$/, '');
    const titleKey = item.title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().slice(0, 80);
    if (seen.has(urlKey) || seen.has(titleKey)) continue;
    seen.add(urlKey);
    seen.add(titleKey);
    out.push(item);
  }
  return out;
}

export async function fetchNews(now: Date): Promise<Story[]> {
  const [direct, queried] = await Promise.all([fetchDirectFeeds(now), fetchQueryNews(now)]);
  const items = dedupe([...direct, ...queried]).filter((i) => !isBlocked(i.url));
  console.log(`[news] ${direct.length} from direct feeds, ${queried.length} from news queries, ${items.length} after dedupe/filter`);
  return items.map((i) => ({
    title: i.title,
    url: i.url,
    source: i.source,
    publishedAt: i.publishedAt.toISOString(),
    category: i.category,
    summary: '', // filled by the summarizer
    paywalled: isPaywalled(i.url),
    raw: i.snippet,
  }));
}
