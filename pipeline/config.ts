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
  { name: 'Oil & Gas Journal', url: 'https://www.ogj.com/rss.xml', paywalled: false, defaultCategory: 'operations' },
  { name: 'Rigzone', url: 'https://www.rigzone.com/news/rss/rigzone_latest.aspx', paywalled: false, defaultCategory: 'operations' },
  { name: 'Biobased Diesel Daily', url: 'https://www.biobased-diesel.com/blog-feed.xml', paywalled: false, defaultCategory: 'policy' },
  { name: 'Ethanol Producer Magazine', url: 'https://ethanolproducer.com/rss/articles', paywalled: false, defaultCategory: 'policy' },
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
  { query: '"Casey\'s" OR "Murphy USA" OR "Couche-Tard" OR "Circle K" OR "7-Eleven" fuel', category: 'companies' },
  { query: '(Costco OR Walmart OR "BJ\'s Wholesale" OR Kroger) (fuel OR gasoline OR "gas station")', category: 'companies' },
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
// Company watch list: IR pages checked daily for new decks / earnings docs.
// pageUrl is the page scanned for links to new PDFs/presentations.
// ---------------------------------------------------------------------------

export interface WatchedCompany {
  name: string;
  ticker: string;
  group: 'refiner' | 'renewables' | 'retail' | 'bigbox';
  irPages: string[];
}

export const COMPANIES: WatchedCompany[] = [
  // Refiners
  { name: 'Valero Energy', ticker: 'VLO', group: 'refiner', irPages: ['https://investorvalero.com/events-and-presentations', 'https://investorvalero.com/news-releases'] },
  { name: 'Marathon Petroleum', ticker: 'MPC', group: 'refiner', irPages: ['https://www.marathonpetroleum.com/Investors/Events-and-Presentations/'] },
  { name: 'Phillips 66', ticker: 'PSX', group: 'refiner', irPages: ['https://investor.phillips66.com/financial-information/events-and-presentations'] },
  { name: 'PBF Energy', ticker: 'PBF', group: 'refiner', irPages: ['https://investors.pbfenergy.com/events-and-presentations'] },
  { name: 'HF Sinclair', ticker: 'DINO', group: 'refiner', irPages: ['https://ir.hfsinclair.com/events-and-presentations'] },
  { name: 'Delek US', ticker: 'DK', group: 'refiner', irPages: ['https://ir.delekus.com/events-and-presentations'] },
  { name: 'Par Pacific', ticker: 'PARR', group: 'refiner', irPages: ['https://www.parpacific.com/investors/news-events/events-presentations'] },
  { name: 'CVR Energy', ticker: 'CVI', group: 'refiner', irPages: ['https://cvrenergy.investorroom.com/events-and-presentations'] },
  // Renewable diesel / SAF
  { name: 'Darling Ingredients', ticker: 'DAR', group: 'renewables', irPages: ['https://ir.darlingii.com/events-and-presentations'] },
  { name: 'Neste', ticker: 'NESTE.HE', group: 'renewables', irPages: ['https://www.neste.com/investors/reports-and-presentations'] },
  { name: 'Calumet (Montana Renewables)', ticker: 'CLMT', group: 'renewables', irPages: ['https://ir.calumet.com/events-and-presentations'] },
  { name: 'Gevo', ticker: 'GEVO', group: 'renewables', irPages: ['https://investors.gevo.com/events-and-presentations'] },
  { name: 'Aemetis', ticker: 'AMTX', group: 'renewables', irPages: ['https://www.aemetis.com/investors/'] },
  { name: 'Vertex Energy', ticker: 'VTNR', group: 'renewables', irPages: ['https://ir.vertexenergy.com/events-and-presentations'] },
  // Fuel retail / c-store
  { name: "Casey's General Stores", ticker: 'CASY', group: 'retail', irPages: ['https://investor.caseys.com/events-and-presentations'] },
  { name: 'Murphy USA', ticker: 'MUSA', group: 'retail', irPages: ['https://ir.murphyusa.com/events-and-presentations'] },
  { name: 'Alimentation Couche-Tard', ticker: 'ATD.TO', group: 'retail', irPages: ['https://corpo.couche-tard.com/en/investors/'] },
  { name: 'Sunoco LP', ticker: 'SUN', group: 'retail', irPages: ['https://investors.sunocolp.com/events-and-presentations'] },
  { name: 'Global Partners', ticker: 'GLP', group: 'retail', irPages: ['https://ir.globalp.com/events-and-presentations'] },
  // Big box fuel
  { name: 'Costco', ticker: 'COST', group: 'bigbox', irPages: ['https://investor.costco.com/events-and-presentations'] },
  { name: 'Walmart', ticker: 'WMT', group: 'bigbox', irPages: ['https://stock.walmart.com/events-and-presentations'] },
  { name: "BJ's Wholesale Club", ticker: 'BJ', group: 'bigbox', irPages: ['https://investors.bjs.com/events-and-presentations'] },
  { name: 'Kroger', ticker: 'KR', group: 'bigbox', irPages: ['https://ir.kroger.com/news-events/events-and-presentations'] },
];

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
