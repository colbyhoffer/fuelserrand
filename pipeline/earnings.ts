import { writeFileSync, mkdirSync } from 'node:fs';
import { COMPANIES, FETCH_TIMEOUT_MS, SEC_USER_AGENT } from './config';

// Upcoming-earnings estimates from EDGAR filing history. Earnings 8-Ks carry
// item 2.02 (Results of Operations); each company's next report is projected
// from its own historical reporting cadence. These are ESTIMATES — companies
// confirm exact dates by press release, which the news pipeline picks up.

export interface EarningsEntry {
  ticker: string;
  name: string;
  group: string;
  lastReport: string;    // YYYY-MM-DD of most recent earnings 8-K
  nextEstimate: string;  // YYYY-MM-DD projection
}

const CAL_PATH = 'data/earnings-calendar.json';

async function fetchJson(url: string): Promise<any> {
  const res = await fetch(url, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS), headers: { 'user-agent': SEC_USER_AGENT } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

export async function buildEarningsCalendar(now: Date): Promise<EarningsEntry[]> {
  const entries: EarningsEntry[] = [];
  for (const company of COMPANIES) {
    if (!company.cik) continue; // foreign filers: no EDGAR cadence to project from
    try {
      const cik10 = String(company.cik).padStart(10, '0');
      const sub = await fetchJson(`https://data.sec.gov/submissions/CIK${cik10}.json`);
      const r = sub?.filings?.recent;
      if (!r) continue;
      const earningsDates: string[] = [];
      for (let i = 0; i < r.form.length && earningsDates.length < 8; i++) {
        if (r.form[i] === '8-K' && String(r.items?.[i] ?? '').includes('2.02')) {
          earningsDates.push(r.filingDate[i]);
        }
      }
      if (earningsDates.length < 2) continue;
      // Dates are newest-first. Project forward by the median gap between reports.
      const times = earningsDates.map((d) => new Date(d + 'T12:00:00Z').getTime());
      const gaps = times.slice(0, -1).map((t, i) => t - times[i + 1]).filter((g) => g > 45 * 86400_000 && g < 200 * 86400_000);
      const cadence = gaps.length ? median(gaps) : 91 * 86400_000;
      let next = times[0] + cadence;
      while (next < now.getTime() - 3 * 86400_000) next += cadence;
      entries.push({
        ticker: company.ticker,
        name: company.name,
        group: company.group,
        lastReport: earningsDates[0],
        nextEstimate: new Date(next).toISOString().slice(0, 10),
      });
    } catch (err: any) {
      console.warn(`[earnings] ${company.ticker} failed: ${err?.message ?? err}`);
    }
  }
  entries.sort((a, b) => a.nextEstimate.localeCompare(b.nextEstimate));
  mkdirSync('data', { recursive: true });
  writeFileSync(CAL_PATH, JSON.stringify(entries, null, 2));
  console.log(`[earnings] calendar built for ${entries.length} companies`);
  return entries;
}
