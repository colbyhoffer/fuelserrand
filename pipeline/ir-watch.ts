import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { COMPANIES, FETCH_TIMEOUT_MS, SEC_USER_AGENT, type WatchedCompany } from './config';
import type { DeckAnalysis } from './types';
import { analyzeDoc } from './summarize';

const SEEN_PATH = 'data/ir-seen.json';
const MAX_ANALYSES_PER_RUN = 4;   // budget guard; the rest are marked seen and skipped
const EDGAR_LOOKBACK_DAYS = 7;    // seen-set prevents re-analysis inside the window
const WATCHED_FORMS = new Set(['8-K', '10-Q', '10-K', '6-K']);

// Words that mark a filing document / IR link as investor material worth analyzing.
const DOC_PATTERN = /ex.?99|press|presentation|investor|earnings|deck|slides|results/i;

interface SeenMap { [ticker: string]: string[] }

function loadSeen(): SeenMap {
  return existsSync(SEEN_PATH) ? JSON.parse(readFileSync(SEEN_PATH, 'utf8')) : {};
}

function saveSeen(seen: SeenMap): void {
  mkdirSync('data', { recursive: true });
  writeFileSync(SEEN_PATH, JSON.stringify(seen, null, 2));
}

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers: { 'user-agent': SEC_USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

interface FoundDoc {
  url: string;
  label: string;
  docType: DeckAnalysis['docType'];
}

// --- EDGAR: new filings from a US filer -----------------------------------

async function edgarNewDocs(company: WatchedCompany, seenSet: Set<string>, now: Date): Promise<FoundDoc[]> {
  const cik10 = String(company.cik).padStart(10, '0');
  const sub = await fetchJson(`https://data.sec.gov/submissions/CIK${cik10}.json`);
  const r = sub?.filings?.recent;
  if (!r) return [];
  const cutoff = new Date(now.getTime() - EDGAR_LOOKBACK_DAYS * 86400_000).toISOString().slice(0, 10);
  const out: FoundDoc[] = [];

  for (let i = 0; i < r.form.length; i++) {
    const form = r.form[i];
    const date = r.filingDate[i];
    const accession = r.accessionNumber[i];
    if (!WATCHED_FORMS.has(form) || date < cutoff || seenSet.has(accession)) continue;
    seenSet.add(accession);

    const accPath = accession.replace(/-/g, '');
    const base = `https://www.sec.gov/Archives/edgar/data/${company.cik}/${accPath}`;

    if (form === '8-K' || form === '6-K') {
      // The substance of an 8-K lives in its exhibits (press release, deck).
      try {
        const index = await fetchJson(`${base}/index.json`);
        for (const item of index?.directory?.item ?? []) {
          const name: string = item.name ?? '';
          const isDoc = /\.(pdf|htm|html)$/i.test(name);
          if (!isDoc || !DOC_PATTERN.test(name)) continue;
          out.push({
            url: `${base}/${name}`,
            label: `${form} exhibit ${name} (filed ${date})`,
            docType: /presentation|deck|slides/i.test(name) ? 'presentation' : 'earnings',
          });
        }
      } catch (err: any) {
        console.warn(`[ir] ${company.ticker} ${accession} index failed: ${err?.message ?? err}`);
      }
    } else {
      const primary = r.primaryDocument[i];
      if (primary) {
        out.push({ url: `${base}/${primary}`, label: `${form} (filed ${date})`, docType: 'earnings' });
      }
    }
  }
  return out;
}

// --- Fallback: scrape an IR page for new PDFs (foreign listings) -----------

async function irPageNewDocs(company: WatchedCompany, seenSet: Set<string>): Promise<FoundDoc[]> {
  const out: FoundDoc[] = [];
  for (const page of company.irPages ?? []) {
    const res = await fetch(page, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36' },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const html = await res.text();
    const anchorRe = /<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m: RegExpExecArray | null;
    while ((m = anchorRe.exec(html)) !== null) {
      let abs: string;
      try { abs = new URL(m[1], page).toString(); } catch { continue; }
      const label = m[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      if (!/\.pdf(\?|#|$)/i.test(abs)) continue;
      if (!DOC_PATTERN.test(label) && !DOC_PATTERN.test(abs)) continue;
      if (seenSet.has(abs)) continue;
      seenSet.add(abs);
      out.push({ url: abs, label: label || abs.split('/').pop() || 'Document', docType: /presentation|deck|slides/i.test(`${label} ${abs}`) ? 'presentation' : 'other' });
    }
  }
  return out;
}

// --- Main ------------------------------------------------------------------

export async function watchIrPages(now: Date, opts: { analyze: boolean; firstRunBaseline: boolean }): Promise<DeckAnalysis[]> {
  const seen = loadSeen();
  const analyses: DeckAnalysis[] = [];

  for (const company of COMPANIES) {
    const seenSet = new Set(seen[company.ticker] ?? []);
    let fresh: FoundDoc[] = [];
    try {
      fresh = company.cik
        ? await edgarNewDocs(company, seenSet, now)
        : await irPageNewDocs(company, seenSet);
    } catch (err: any) {
      console.warn(`[ir] ${company.ticker} watch failed: ${err?.message ?? err}`);
    }
    seen[company.ticker] = [...seenSet];
    if (fresh.length === 0) continue;

    if (opts.firstRunBaseline) {
      console.log(`[ir] ${company.ticker}: baselined ${fresh.length} existing documents`);
      continue;
    }
    for (const doc of fresh) {
      if (!opts.analyze || analyses.length >= MAX_ANALYSES_PER_RUN) {
        console.log(`[ir] ${company.ticker}: new doc noted but not analyzed (${doc.url})`);
        continue;
      }
      try {
        const analysis = await analyzeDoc(company, doc.url, doc.label);
        if (analysis) {
          analyses.push({
            company: company.name,
            ticker: company.ticker,
            title: doc.label,
            url: doc.url,
            foundAt: now.toISOString(),
            docType: doc.docType,
            analysis,
          });
        }
      } catch (err: any) {
        console.warn(`[ir] ${company.ticker} analysis failed (${doc.url}): ${err?.message ?? err}`);
      }
    }
  }

  saveSeen(seen);
  return analyses;
}
