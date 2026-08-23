import { readFileSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { Brief, DeckAnalysis, PricePoint } from '@/pipeline/types';

// Build-time data access for the static site. All reads happen during
// `next build`; the exported site is fully static.

const DATA = path.join(process.cwd(), 'data');

export function getBriefDates(): string[] {
  const dir = path.join(DATA, 'briefs');
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.json')).map((f) => f.replace('.json', '')).sort().reverse();
}

export function getBrief(date: string): Brief | null {
  const p = path.join(DATA, 'briefs', `${date}.json`);
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8'));
}

export function getLatestBrief(): Brief | null {
  const dates = getBriefDates();
  return dates.length ? getBrief(dates[0]) : null;
}

export function getPriceHistory(): PricePoint[] {
  const p = path.join(DATA, 'price-history.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : [];
}

export function getDecks(): DeckAnalysis[] {
  const p = path.join(DATA, 'decks.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : [];
}

export interface EarningsEntry {
  ticker: string;
  name: string;
  group: string;
  lastReport: string;
  nextEstimate: string;
}

export function getEarningsCalendar(): EarningsEntry[] {
  const p = path.join(DATA, 'earnings-calendar.json');
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : [];
}

export interface SiteUserConfig {
  companies: { name: string; ticker: string; group: string; enabled?: boolean }[];
  preferredOutlets: string[];
  deprioritizedOutlets: string[];
}

export function getUserConfig(): SiteUserConfig {
  const p = path.join(process.cwd(), 'fuels-errand.config.json');
  if (!existsSync(p)) return { companies: [], preferredOutlets: [], deprioritizedOutlets: [] };
  const raw = JSON.parse(readFileSync(p, 'utf8'));
  return {
    companies: raw.companies ?? [],
    preferredOutlets: raw.preferredOutlets ?? [],
    deprioritizedOutlets: raw.deprioritizedOutlets ?? [],
  };
}

export { formatDateLong } from './format';
