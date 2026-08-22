// One-off historical backfill of data/price-history.json from the EIA API.
//   npx tsx pipeline/backfill.ts [--years 5]
// Safe to re-run: EIA data overwrites same-date rows, everything is re-sorted.

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import type { PricePoint } from './types';

function loadDotEnvLocal(): void {
  if (!existsSync('.env.local')) return;
  for (const line of readFileSync('.env.local', 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadDotEnvLocal();

const API_KEY = process.env.EIA_API_KEY ?? '';
const BASE = 'https://api.eia.gov/v2';

// frequency must be explicit: EIA v2 defaults some routes to weekly aggregates.
const SERIES: { route: string; series: string; field: keyof PricePoint; freq: 'daily' | 'weekly' }[] = [
  { route: 'petroleum/pri/spt/data', series: 'EER_EPMRU_PF4_Y35NY_DPG', field: 'rbobSpot', freq: 'daily' },
  { route: 'petroleum/pri/spt/data', series: 'EER_EPD2DXL0_PF4_Y35NY_DPG', field: 'ulsdSpot', freq: 'daily' },
  { route: 'petroleum/pri/spt/data', series: 'RWTC', field: 'wtiSpot', freq: 'daily' },
  { route: 'petroleum/pri/gnd/data', series: 'EMM_EPM0_PTE_NUS_DPG', field: 'retailGas', freq: 'weekly' },
  { route: 'petroleum/pri/gnd/data', series: 'EMD_EPD2D_PTE_NUS_DPG', field: 'retailDiesel', freq: 'weekly' },
  { route: 'petroleum/stoc/wstk/data', series: 'WGTSTUS1', field: 'gasStocksMbbl', freq: 'weekly' },
  { route: 'petroleum/stoc/wstk/data', series: 'WDISTUS1', field: 'distStocksMbbl', freq: 'weekly' },
  { route: 'petroleum/cons/wpsup/data', series: 'WGFUPUS2', field: 'gasDemandKbd', freq: 'weekly' },
  { route: 'petroleum/cons/wpsup/data', series: 'WDIUPUS2', field: 'distDemandKbd', freq: 'weekly' },
];

async function fetchSeries(route: string, series: string, start: string, freq: string): Promise<{ period: string; value: number }[]> {
  const rows: { period: string; value: number }[] = [];
  let offset = 0;
  for (;;) {
    const params = new URLSearchParams({
      api_key: API_KEY,
      frequency: freq,
      'data[0]': 'value',
      'facets[series][]': series,
      start,
      'sort[0][column]': 'period',
      'sort[0][direction]': 'asc',
      length: '5000',
      offset: String(offset),
    });
    const res = await fetch(`${BASE}/${route}/?${params}`, { signal: AbortSignal.timeout(60_000) });
    if (!res.ok) throw new Error(`EIA ${series}: HTTP ${res.status}`);
    const batch = (await res.json())?.response?.data ?? [];
    for (const r of batch) {
      if (r.value != null) rows.push({ period: String(r.period), value: Number(r.value) });
    }
    if (batch.length < 5000) break;
    offset += 5000;
  }
  return rows;
}

async function main() {
  if (!API_KEY) {
    console.error('EIA_API_KEY not set');
    process.exit(1);
  }
  const yearsArg = process.argv.indexOf('--years');
  const years = yearsArg >= 0 ? Number(process.argv[yearsArg + 1]) : 5;
  const start = new Date();
  start.setUTCFullYear(start.getUTCFullYear() - years);
  const startStr = start.toISOString().slice(0, 10);
  console.log(`Backfilling ${years} years of EIA data (from ${startStr})`);

  const byDate = new Map<string, PricePoint>();
  const path = 'data/price-history.json';
  if (existsSync(path)) {
    for (const p of JSON.parse(readFileSync(path, 'utf8')) as PricePoint[]) byDate.set(p.date, p);
  }

  for (const spec of SERIES) {
    const rows = await fetchSeries(spec.route, spec.series, startStr, spec.freq);
    console.log(`  ${spec.series} (${String(spec.field)}): ${rows.length} rows`);
    for (const r of rows) {
      const date = r.period.slice(0, 10);
      const point = byDate.get(date) ?? { date };
      (point as any)[spec.field] = r.value;
      byDate.set(date, point);
    }
  }

  let cracks = 0;
  for (const p of byDate.values()) {
    if (p.rbobSpot != null && p.wtiSpot != null) { p.gasCrack = +(p.rbobSpot * 42 - p.wtiSpot).toFixed(2); cracks++; }
    if (p.ulsdSpot != null && p.wtiSpot != null) p.dieselCrack = +(p.ulsdSpot * 42 - p.wtiSpot).toFixed(2);
  }

  const merged = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
  mkdirSync('data', { recursive: true });
  writeFileSync(path, JSON.stringify(merged, null, 1));
  console.log(`Wrote ${merged.length} dated rows (${cracks} with computed cracks) to ${path}`);
}

main().catch((err) => {
  console.error('backfill failed:', err);
  process.exit(1);
});
