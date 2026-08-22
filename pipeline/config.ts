// ---------------------------------------------------------------------------
// Source registry. Every item in the brief links back to one of these, or to
// an official company/government document. No social media, no forums.
// ---------------------------------------------------------------------------

import type { Category } from './types';

export interface FeedSource {
  name: string;          // outlet name shown in the brief
  url: string;           // RSS/Atom feed URL
  paywalled: boolean;    // paywalled outlets appear as headline + link only
  defaultCategory: Category;
}

// Direct RSS feeds from outlets and official bodies.
export const FEEDS: FeedSource[] = [
  { name: 'EIA Today in Energy', url: 'https://www.eia.gov/rss/todayinenergy.xml', paywalled: false, defaultCategory: 'markets' },
  { name: 'EIA Press Releases', url: 'https://www.eia.gov/rss/press_rss.xml', paywalled: false, defaultCategory: 'markets' },
  { name: 'Oil & Gas Journal', url: 'https://www.ogj.com/__rss/website-scheduled-content.xml?input=%7B%22sectionAlias%22%3A%22home%22%7D', paywalled: false, defaultCategory: 'operations' },
  { name: 'Rigzone', url: 'https://www.rigzone.com/news/rss/rigzone_latest.aspx', paywalled: false, defaultCategory: 'operations' },
  { name: 'Biobased Diesel Daily', url: 'https://www.biobased-diesel.com/blog-feed.xml', paywalled: false, defaultCategory: 'policy' },
];

// Google News RSS topic queries. Google News is used only as a *finder*: every
// item is resolved to and attributed to the original publisher, and items from
// blocked domains (social/forums/aggregator chatter) are dropped.
export const NEWS_QUERIES: { query: string; category: Category }[] = [
  { query: '"refinery" (outage OR turnaround OR fire OR restart OR conversion)', category: 'operations' },
  { query: '"renewable diesel" OR "sustainable aviation fuel" OR SAF fuel', category: 'policy' },
  { query: '"Renewable Fuel Standard" OR "RIN prices" OR RVO OR LCFS OR "45Z"', category: 'policy' },
  { query: 'gasoline diesel prices "crack spread" OR RBOB OR ULSD', category: 'markets' },
  { query: '(refiner OR "gas station" OR "convenience store" OR "travel center") (acquisition OR merger OR expansion)', category: 'deals' },
  { query: 'Valero OR "Marathon Petroleum" OR "Phillips 66" OR "PBF Energy" OR "HF Sinclair" earnings OR guidance', category: 'companies' },
  // Note: apostrophes break Bing's RSS endpoint (empty response) — Caseys/BJs still match.
  { query: 'Caseys OR "Murphy USA" OR "Couche-Tard" OR "Circle K" OR "7-Eleven" fuel', category: 'companies' },
  { query: '(Costco OR Walmart OR "BJs Wholesale" OR Kroger) (fuel OR gasoline OR "gas station")', category: 'companies' },
];

// Domains never used as source material.
export const BLOCKED_DOMAINS = [
  'reddit.com', 'x.com', 'twitter.com', 'facebook.com', 'linkedin.com',
  'youtube.com', 'tiktok.com', 'instagram.com', 'quora.com', 'medium.com',
  'seekingalpha.com', 'fool.com', 'benzinga.com', 'zacks.com',
  'stocktwits.com', 'investorplace.com', 'msn.com', 'yahoo.com',
];

// Paywalled trade wires: shown as clearly-marked headline + link only.
export const PAYWALLED_DOMAINS = [
  'opisnet.com', 'spglobal.com', 'argusmedia.com', 'bloomberg.com',
  'wsj.com', 'ft.com', 'reuters.com', 'platts.com', 'energyintel.com',
];

// ---------------------------------------------------------------------------
// User settings: company watch list and outlet preferences live in
// fuels-errand.config.json (repo root) so they can be edited without touching
// code. US filers are watched via SEC EDGAR (cik): new 8-K exhibits — earnings
// releases and investor presentations — come from official filings, which
// never bot-block. Companies without a CIK fall back to scraping irPages.
// ---------------------------------------------------------------------------

import { readFileSync } from 'node:fs';

export interface WatchedCompany {
  name: string;
  ticker: string;
  group: 'refiner' | 'renewables' | 'retail' | 'bigbox';
  cik?: number;          // SEC CIK for EDGAR watching
  irPages?: string[];    // fallback/bonus scrape targets
  enabled?: boolean;
}

export interface UserConfig {
  companies: WatchedCompany[];
  preferredOutlets: string[];
  deprioritizedOutlets: string[];
}

export const USER_CONFIG: UserConfig = (() => {
  try {
    const raw = JSON.parse(readFileSync('fuels-errand.config.json', 'utf8'));
    return {
      companies: raw.companies ?? [],
      preferredOutlets: raw.preferredOutlets ?? [],
      deprioritizedOutlets: raw.deprioritizedOutlets ?? [],
    };
  } catch (err: any) {
    console.warn(`[config] could not read fuels-errand.config.json: ${err?.message ?? err}`);
    return { companies: [], preferredOutlets: [], deprioritizedOutlets: [] };
  }
})();

export const COMPANIES: WatchedCompany[] = USER_CONFIG.companies.filter((c) => c.enabled !== false);

// SEC requests must identify the requester (SEC fair-access policy).
export const SEC_USER_AGENT = process.env.SEC_CONTACT
  ? `FuelsErrand/1.0 (${process.env.SEC_CONTACT})`
  : 'FuelsErrand/1.0 (admin@fuelserrand.com)';

// ---------------------------------------------------------------------------
// Runtime configuration from environment.
// ---------------------------------------------------------------------------

export const ENV = {
  anthropicKey: process.env.ANTHROPIC_API_KEY ?? '',
  resendKey: process.env.RESEND_API_KEY ?? '',
  eiaKey: process.env.EIA_API_KEY ?? '',
  briefTo: process.env.BRIEF_TO ?? 'hoffercolby@gmail.com',
  briefFrom: process.env.BRIEF_FROM ?? 'Fuels Errand <onboarding@resend.dev>',
  siteUrl: process.env.SITE_URL ?? 'https://fuelserrand.com',
};

export const CLAUDE_MODEL = 'claude-sonnet-5';
export const MAX_STORIES_PER_BRIEF = 14;
export const FETCH_TIMEOUT_MS = 20_000;
export const LOOKBACK_HOURS = 30; // catches anything since the prior weekday brief, incl. slight cron jitter
