import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import type { Brief, DeckAnalysis, PricePoint } from './types';

// The repo is the database: briefs, price history, and deck analyses live as
// JSON under data/ and are committed by the daily workflow.

export function saveBrief(brief: Brief): string {
  mkdirSync('data/briefs', { recursive: true });
  const path = `data/briefs/${brief.date}.json`;
  writeFileSync(path, JSON.stringify(brief, null, 2));
  return path;
}

export function appendPriceHistory(point: PricePoint): void {
  mkdirSync('data', { recursive: true });
  const path = 'data/price-history.json';
  const history: PricePoint[] = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : [];
  const filtered = history.filter((p) => p.date !== point.date);
  filtered.push(point);
  filtered.sort((a, b) => a.date.localeCompare(b.date));
  writeFileSync(path, JSON.stringify(filtered, null, 2));
}

export function appendDecks(decks: DeckAnalysis[]): void {
  if (decks.length === 0) return;
  mkdirSync('data', { recursive: true });
  const path = 'data/decks.json';
  const existing: DeckAnalysis[] = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : [];
  const urls = new Set(existing.map((d) => d.url));
  const merged = [...existing, ...decks.filter((d) => !urls.has(d.url))];
  merged.sort((a, b) => b.foundAt.localeCompare(a.foundAt));
  writeFileSync(path, JSON.stringify(merged, null, 2));
}

export function listBriefDates(): string[] {
  if (!existsSync('data/briefs')) return [];
  return readdirSync('data/briefs')
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''))
    .sort()
    .reverse();
}
