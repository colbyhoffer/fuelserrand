import { ENV, FETCH_TIMEOUT_MS } from './config';
import type { PricePoint } from './types';

// EIA Open Data v2. All series are official EIA data; the dashboard links to
// the corresponding EIA source pages.

const BASE = 'https://api.eia.gov/v2';

interface SeriesSpec {
  route: string;
  series: string;
  freq: 'daily' | 'weekly';
  assign: (p: PricePoint, v: number) => void;
}

const SPECS: SeriesSpec[] = [
  // Spot prices (daily, $/gal or $/bbl)
  { route: 'petroleum/pri/spt/data', series: 'EER_EPMRR_PF4_Y35NY_DPG', freq: 'daily', assign: (p, v) => (p.rbobSpot = v) },
  { route: 'petroleum/pri/spt/data', series: 'EER_EPD2DXL0_PF4_Y35NY_DPG', freq: 'daily', assign: (p, v) => (p.ulsdSpot = v) },
  { route: 'petroleum/pri/spt/data', series: 'RWTC', freq: 'daily', assign: (p, v) => (p.wtiSpot = v) },
  // Retail prices (weekly, $/gal, US average)
  { route: 'petroleum/pri/gnd/data', series: 'EMM_EPM0_PTE_NUS_DPG', freq: 'weekly', assign: (p, v) => (p.retailGas = v) },
  { route: 'petroleum/pri/gnd/data', series: 'EMD_EPD2D_PTE_NUS_DPG', freq: 'weekly', assign: (p, v) => (p.retailDiesel = v) },
  // Weekly stocks (thousand barrels)
  { route: 'petroleum/stoc/wstk/data', series: 'WGTSTUS1', freq: 'weekly', assign: (p, v) => (p.gasStocksMbbl = v) },
  { route: 'petroleum/stoc/wstk/data', series: 'WDISTUS1', freq: 'weekly', assign: (p, v) => (p.distStocksMbbl = v) },
  // Product supplied = implied demand (weekly, thousand b/d)
  { route: 'petroleum/cons/wpsup/data', series: 'WGFUPUS2', freq: 'weekly', assign: (p, v) => (p.gasDemandKbd = v) },
  { route: 'petroleum/cons/wpsup/data', series: 'WDIUPUS2', freq: 'weekly', assign: (p, v) => (p.distDemandKbd = v) },
];

async function fetchLatest(spec: SeriesSpec): Promise<{ period: string; value: number } | null> {
  const params = new URLSearchParams({
    api_key: ENV.eiaKey,
    'data[0]': 'value',
    'facets[series][]': spec.series,
    'sort[0][column]': 'period',
    'sort[0][direction]': 'desc',
    length: '1',
  });
  const res = await fetch(`${BASE}/${spec.route}/?${params}`, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!res.ok) throw new Error(`EIA ${spec.series}: HTTP ${res.status}`);
  const json = await res.json();
  const row = json?.response?.data?.[0];
  if (!row || row.value == null) return null;
  return { period: String(row.period), value: Number(row.value) };
}

export async function fetchPrices(now: Date): Promise<PricePoint | null> {
  if (!ENV.eiaKey) {
    console.warn('[prices] EIA_API_KEY not set — skipping price data');
    return null;
  }
  const point: PricePoint = { date: now.toISOString().slice(0, 10) };
  const results = await Promise.allSettled(SPECS.map(fetchLatest));
  let got = 0;
  results.forEach((r, i) => {
    if (r.status === 'fulfilled' && r.value) {
      SPECS[i].assign(point, r.value.value);
      got++;
    } else if (r.status === 'rejected') {
      console.warn(`[prices] ${SPECS[i].series} failed: ${r.reason?.message ?? r.reason}`);
    }
  });
  if (got === 0) return null;
  // Single-product cracks vs WTI, $/bbl (42 gal/bbl).
  if (point.rbobSpot != null && point.wtiSpot != null) point.gasCrack = +(point.rbobSpot * 42 - point.wtiSpot).toFixed(2);
  if (point.ulsdSpot != null && point.wtiSpot != null) point.dieselCrack = +(point.ulsdSpot * 42 - point.wtiSpot).toFixed(2);
  console.log(`[prices] fetched ${got}/${SPECS.length} series`);
  return point;
}
