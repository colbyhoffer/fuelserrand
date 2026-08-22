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
// Company watch list. US filers are watched via SEC EDGAR (cik): new 8-K
// exhibits — earnings releases and investor presentations — are picked up from
// official filings, which never bot-block. Companies without a CIK (foreign
// listings) fall back to scraping the listed IR pages, best-effort.
// ---------------------------------------------------------------------------

export interface WatchedCompany {
  name: string;
  ticker: string;
  group: 'refiner' | 'renewables' | 'retail' | 'bigbox';
  cik?: number;          // SEC CIK for EDGAR watching
  irPages?: string[];    // fallback/bonus scrape targets
}

export const COMPANIES: WatchedCompany[] = [
  // Refiners
  { name: 'Valero Energy', ticker: 'VLO', group: 'refiner', cik: 1035002 },
  { name: 'Marathon Petroleum', ticker: 'MPC', group: 'refiner', cik: 1510295 },
  { name: 'Phillips 66', ticker: 'PSX', group: 'refiner', cik: 1534701 },
  { name: 'PBF Energy', ticker: 'PBF', group: 'refiner', cik: 1534504 },
  { name: 'HF Sinclair', ticker: 'DINO', group: 'refiner', cik: 1915657 },
  { name: 'Delek US', ticker: 'DK', group: 'refiner', cik: 1694426 },
  { name: 'Par Pacific', ticker: 'PARR', group: 'refiner', cik: 821483 },
  { name: 'CVR Energy', ticker: 'CVI', group: 'refiner', cik: 1376139 },
  // Renewable diesel / SAF
  { name: 'Darling Ingredients', ticker: 'DAR', group: 'renewables', cik: 916540 },
  { name: 'Neste', ticker: 'NESTE.HE', group: 'renewables', irPages: ['https://www.neste.com/investors/reports-and-presentations'] },
  { name: 'Calumet (Montana Renewables)', ticker: 'CLMT', group: 'renewables', cik: 2013745 },
  { name: 'Gevo', ticker: 'GEVO', group: 'renewables', cik: 1392380 },
  { name: 'Aemetis', ticker: 'AMTX', group: 'renewables', cik: 738214 },
  // Fuel retail / c-store
  { name: "Casey's General Stores", ticker: 'CASY', group: 'retail', cik: 726958 },
  { name: 'Murphy USA', ticker: 'MUSA', group: 'retail', cik: 1573516 },
  { name: 'Alimentation Couche-Tard', ticker: 'ATD.TO', group: 'retail', irPages: ['https://corpo.couche-tard.com/en/investors/'] },
  { name: 'Sunoco LP', ticker: 'SUN', group: 'retail', cik: 1552275 },
  { name: 'Global Partners', ticker: 'GLP', group: 'retail', cik: 1323468 },
  // Big box fuel
  { name: 'Costco', ticker: 'COST', group: 'bigbox', cik: 909832 },
  { name: 'Walmart', ticker: 'WMT', group: 'bigbox', cik: 104169 },
  { name: "BJ's Wholesale Club", ticker: 'BJ', group: 'bigbox', cik: 1531152 },
  { name: 'Kroger', ticker: 'KR', group: 'bigbox', cik: 56873 },
];

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
