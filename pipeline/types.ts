export type Category =
  | 'markets'      // prices, cracks, inventories, demand
  | 'policy'       // RFS/RIN, LCFS, 45Z, SAF credits, tariffs
  | 'operations'   // refinery outages, turnarounds, conversions, pipelines
  | 'deals'        // M&A, retail expansion, EV-charging moves
  | 'companies';   // earnings, investor materials, company news

export interface Story {
  title: string;
  url: string;
  source: string;        // outlet name shown to the reader
  publishedAt: string;   // ISO
  category: Category;
  summary: string;       // 1-3 sentences, written by the summarizer
  paywalled: boolean;
  raw?: string;          // feed-provided snippet, input to the summarizer
}

export interface DeckAnalysis {
  company: string;
  ticker: string;
  title: string;
  url: string;           // link to the original document
  foundAt: string;       // ISO date discovered
  docType: 'presentation' | 'earnings' | 'transcript' | 'other';
  analysis: string;      // markdown: fuel-relevant takeaways
}

export interface PricePoint {
  date: string;          // YYYY-MM-DD
  rbobSpot?: number;     // $/gal, NY Harbor
  ulsdSpot?: number;     // $/gal, NY Harbor
  wtiSpot?: number;      // $/bbl, Cushing
  gasCrack?: number;     // computed 3-2-1-ish single-product crack $/bbl
  dieselCrack?: number;
  retailGas?: number;    // $/gal US average, weekly
  retailDiesel?: number;
  gasStocksMbbl?: number;      // weekly, thousand barrels
  distStocksMbbl?: number;
  gasDemandKbd?: number;       // product supplied, kb/d
  distDemandKbd?: number;
}

export interface WeekAheadItem {
  date: string;
  label: string;
}

export interface Brief {
  date: string;          // YYYY-MM-DD (Central time date of the brief)
  headline: string;      // one-line "what matters today" written by the summarizer
  overview: string;      // 2-4 sentence synthesis across all sections
  stories: Story[];
  decks: DeckAnalysis[];
  prices: PricePoint | null;
  weekAhead?: WeekAheadItem[];  // Fridays only
  generatedAt: string;   // ISO
  degraded?: string[];   // names of stages that failed or ran in fallback mode
}
