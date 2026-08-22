import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { COMPANIES, FETCH_TIMEOUT_MS, type WatchedCompany } from './config';
import type { DeckAnalysis } from './types';
import { analyzeDeck } from './summarize';

const SEEN_PATH = 'data/ir-seen.json';

// Words that mark a link as investor material worth analyzing.
const DOC_PATTERN = /presentation|investor|earnings|quarterly|results|transcript|deck|slides|8-k|10-q|annual.?report/i;

interface SeenMap {
  [company: string]: string[]; // URLs already processed or catalogued
}

function loadSeen(): SeenMap {
  return existsSync(SEEN_PATH) ? JSON.parse(readFileSync(SEEN_PATH, 'utf8')) : {};
}

function saveSeen(seen: SeenMap): void {
  mkdirSync('data', { recursive: true });
  writeFileSync(SEEN_PATH, JSON.stringify(seen, null, 2));
}

function extractDocLinks(html: string, baseUrl: string): { url: string; label: string }[] {
  const out: { url: string; label: string }[] = [];
  const anchorRe = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = anchorRe.exec(html)) !== null) {
    const href = m[1];
    const label = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    let abs: string;
    try {
      abs = new URL(href, baseUrl).toString();
    } catch {
      continue;
    }
    const isPdf = /\.pdf(\?|#|$)/i.test(abs);
    const looksRelevant = DOC_PATTERN.test(label) || DOC_PATTERN.test(abs);
    if (isPdf && looksRelevant) out.push({ url: abs, label: label || abs.split('/').pop() || 'Document' });
  }
  // Dedupe by URL
  const seen = new Set<string>();
  return out.filter((l) => (seen.has(l.url) ? false : (seen.add(l.url), true)));
}

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { 'user-agent': 'Mozilla/5.0 (compatible; FuelsErrandBot/1.0; personal research)' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function docTypeOf(label: string, url: string): DeckAnalysis['docType'] {
  const s = `${label} ${url}`.toLowerCase();
  if (/transcript/.test(s)) return 'transcript';
  if (/earnings|results|quarterly|10-q|8-k/.test(s)) return 'earnings';
  if (/presentation|deck|slides|investor/.test(s)) return 'presentation';
  return 'other';
}

export async function watchIrPages(now: Date, opts: { analyze: boolean; firstRunBaseline: boolean }): Promise<DeckAnalysis[]> {
  const seen = loadSeen();
  const analyses: DeckAnalysis[] = [];
  const MAX_ANALYSES_PER_RUN = 4; // budget guard: rest are catalogued and picked up next run

  for (const company of COMPANIES) {
    const seenUrls = new Set(seen[company.ticker] ?? []);
    const fresh: { url: string; label: string }[] = [];
    for (const page of company.irPages) {
      try {
        const html = await fetchPage(page);
        for (const link of extractDocLinks(html, page)) {
          if (!seenUrls.has(link.url)) fresh.push(link);
        }
      } catch (err: any) {
        console.warn(`[ir] ${company.ticker} page failed (${page}): ${err?.message ?? err}`);
      }
    }
    if (fresh.length === 0) continue;

    if (opts.firstRunBaseline) {
      // First run: catalogue everything already on the page without analyzing,
      // so the watcher only ever reports genuinely new documents.
      fresh.forEach((l) => seenUrls.add(l.url));
      console.log(`[ir] ${company.ticker}: baselined ${fresh.length} existing documents`);
    } else {
      for (const link of fresh) {
        seenUrls.add(link.url);
        if (!opts.analyze || analyses.length >= MAX_ANALYSES_PER_RUN) continue;
        try {
          const analysis = await analyzeDeck(company, link.url, link.label);
          if (analysis) {
            analyses.push({
              company: company.name,
              ticker: company.ticker,
              title: link.label,
              url: link.url,
              foundAt: now.toISOString(),
              docType: docTypeOf(link.label, link.url),
              analysis,
            });
          }
        } catch (err: any) {
          console.warn(`[ir] ${company.ticker} analysis failed (${link.url}): ${err?.message ?? err}`);
        }
      }
    }
    seen[company.ticker] = [...seenUrls];
  }

  saveSeen(seen);
  return analyses;
}
