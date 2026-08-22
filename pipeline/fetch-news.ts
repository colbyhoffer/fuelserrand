import Parser from 'rss-parser';
import { FEEDS, NEWS_QUERIES, BLOCKED_DOMAINS, PAYWALLED_DOMAINS, FETCH_TIMEOUT_MS, LOOKBACK_HOURS } from './config';
import type { Category, Story } from './types';

const parser = new Parser({ timeout: FETCH_TIMEOUT_MS });

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

function isBlocked(url: string): boolean {
  const host = hostnameOf(url);
  return BLOCKED_DOMAINS.some((d) => host === d || host.endsWith('.' + d));
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
      const parsed = await parser.parseURL(feed.url);
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

// Google News RSS: used as a finder only. Each entry's <source> tag names the
// original publisher; the link redirects to the publisher's page. We keep the
// google redirect URL if resolution fails, since it still lands the reader on
// the original article.
async function resolveGoogleNewsUrl(link: string): Promise<string> {
  try {
    const res = await fetch(link, { redirect: 'follow', signal: AbortSignal.timeout(8000) });
    const finalUrl = res.url;
    if (finalUrl && !finalUrl.includes('news.google.com')) return finalUrl;
    // Google sometimes serves an interstitial page with the target in the HTML.
    // Take the first outbound href that isn't a Google-owned asset/host.
    const html = await res.text();
    for (const m of html.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
      const host = hostnameOf(m[1]);
      if (host && !/(^|\.)google(\.[a-z.]+)?$|googleusercontent\.com$|gstatic\.com$|googleapis\.com$|youtube\.com$/.test(host)) {
        return m[1];
      }
    }
    return link;
  } catch {
    return link;
  }
}

async function fetchGoogleNews(now: Date): Promise<RawItem[]> {
  const cutoff = now.getTime() - lookbackHours(now) * 3600_000;
  const results = await Promise.allSettled(
    NEWS_QUERIES.map(async ({ query, category }) => {
      const url = `https://news.google.com/rss/search?q=${encodeURIComponent(query + ' when:2d')}&hl=en-US&gl=US&ceid=US:en`;
      const parsed = await parser.parseURL(url);
      const items = (parsed.items ?? []).slice(0, 10);
      const out: RawItem[] = [];
      for (const item of items) {
        const published = item.isoDate ? new Date(item.isoDate) : now;
        if (!item.link || !item.title || published.getTime() < cutoff) continue;
        // rss-parser exposes the <source> tag via item.creator or raw fields; fall back to parsing the title suffix " - Outlet".
        const sourceName = (item as any).source?.['#'] ?? (item as any).source ?? item.title.split(' - ').pop() ?? 'News';
        const title = item.title.replace(/ - [^-]+$/, '');
        const resolved = await resolveGoogleNewsUrl(item.link);
        if (isBlocked(resolved)) continue;
        out.push({
          title: stripHtml(title),
          url: resolved,
          source: typeof sourceName === 'string' ? stripHtml(sourceName) : 'News',
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
    else console.warn(`[news] google query failed: ${NEWS_QUERIES[i].query}: ${r.reason?.message ?? r.reason}`);
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
  const [direct, google] = await Promise.all([fetchDirectFeeds(now), fetchGoogleNews(now)]);
  const items = dedupe([...direct, ...google]).filter((i) => !isBlocked(i.url));
  console.log(`[news] ${direct.length} from direct feeds, ${google.length} from Google News, ${items.length} after dedupe/filter`);
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
