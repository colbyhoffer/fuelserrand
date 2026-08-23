import * as React from 'react';
import { BriefView } from 'fuelserrand';

const prices = {
  date: '2026-08-22',
  rbobSpot: 3.156, ulsdSpot: 4.304, wtiSpot: 84.05,
  gasCrack: 48.5, dieselCrack: 96.72,
  retailGas: 4.182, retailDiesel: 5.454,
};

const prevPrices = {
  date: '2026-08-21',
  rbobSpot: 3.098, ulsdSpot: 4.178, wtiSpot: 82.6,
  gasCrack: 47.52, dieselCrack: 92.88,
  retailGas: 4.15, retailDiesel: 5.41,
};

const stories = [
  {
    title: 'Fuel markets pull back amid Hormuz standoff and tight diesel supplies',
    url: 'https://www.tacenergy.com/news-and-views/market-talk/fuel-markets-pull-back-amid-hormuz-standoff-and-tight-diesel-supplies',
    source: 'TACenergy Market Talk', publishedAt: '2026-08-22T11:05:00.000Z',
    category: 'markets' as const,
    summary: 'Energy markets eased slightly after overnight highs, with the Hormuz standoff and tight diesel supplies continuing to drive prices.',
    paywalled: false,
  },
  {
    title: 'Front-month Nymex ULSD rose 4.95% this week to settle at $4.4948',
    url: 'https://www.morningstar.com/news/dow-jones/202608216668',
    source: 'Morningstar', publishedAt: '2026-08-22T10:40:00.000Z',
    category: 'markets' as const,
    summary: 'Its largest two-week gain since July 2026 — and RBOB matched the move at +5.14%.',
    paywalled: false,
  },
  {
    title: 'Ukrainian drone attack hits Lukoil refinery deep in Russia',
    url: 'https://www.rigzone.com/news/ukrainian_drone_attack_hits_lukoil_refinery',
    source: 'Rigzone', publishedAt: '2026-08-22T09:20:00.000Z',
    category: 'operations' as const,
    summary: 'Strikes more than 1,600 km from the border keep taking Russian refining capacity offline.',
    paywalled: false,
  },
  {
    title: 'EPA set to extend RFS compliance deadline for refiners',
    url: 'https://www.agriculture.com/partners-u-s-epa-to-extend-renewable-fuel-standard',
    source: 'Successful Farming', publishedAt: '2026-08-22T08:15:00.000Z',
    category: 'policy' as const,
    summary: 'The September 1 obligation slips as refining margins stay historic.',
    paywalled: false,
  },
  {
    title: 'Nymex overview: crude and product prices end the day, week higher',
    url: 'https://www.opisnet.com/nymex-overview',
    source: 'OPIS', publishedAt: '2026-08-22T07:30:00.000Z',
    category: 'markets' as const,
    summary: 'Markets priced in potential global petroleum supply disruptions through the close.',
    paywalled: true,
  },
];

const decks = [
  {
    company: 'Valero Energy', ticker: 'VLO',
    title: 'Investor Presentation — April 2026',
    url: 'https://s23.q4cdn.com/587626645/files/doc_presentations/2025/Apr/02/Investor-Presentation-April-2026.pdf',
    foundAt: '2026-08-21T22:30:00.000Z',
    docType: 'presentation' as const,
    analysis: 'Benicia idled in a footnote, SAF running at scale at Port Arthur, and zero new refining capacity planned — the supply-side case for this summer’s margins in one deck.',
  },
];

const Surface = ({ children }: { children: React.ReactNode }) => (
  <div style={{ background: 'var(--bg)', color: 'var(--text)', padding: 28 }}>{children}</div>
);

export const FullBrief = () => (
  <Surface>
  <BriefView
    brief={{
      date: '2026-08-22',
      headline: 'Refining margins spike as diesel supply crunch collides with Hormuz risk',
      intro: 'Diesel just had its best two-week run since July — and that’s before you factor in the Strait of Hormuz standoff still rattling crude.',
      overview: 'Crude and product futures closed the week higher on Hormuz tensions and tightening diesel supplies, with Nymex ULSD up nearly 5% week-on-week. Refining margins are ballooning — diesel crack near $97/bbl — as global disruptions squeeze usable fuel supply.',
      stories,
      decks,
      prices,
      prevPrices,
      upcomingEarnings: [{ ticker: 'CASY', name: "Casey's General Stores", nextEstimate: '2026-09-09' }],
      weekAhead: [
        { date: 'Mon, Aug 25', label: 'EIA weekly retail gasoline & diesel prices (Mon PM)' },
        { date: 'Wed, Aug 27', label: 'EIA Weekly Petroleum Status Report (10:30am ET) — inventories, demand, refinery runs' },
      ],
      generatedAt: '2026-08-22T11:30:00.000Z',
    }}
  />
  </Surface>
);

export const FallbackMode = () => (
  <Surface>
  <BriefView
    brief={{
      date: '2026-08-22',
      headline: 'Daily refined fuels briefing',
      overview: 'AI summarization was unavailable for this edition; stories below carry their original feed descriptions.',
      stories: stories.slice(0, 3).map((s) => ({ ...s, summary: '' })),
      decks: [],
      prices: null,
      generatedAt: '2026-08-22T11:30:00.000Z',
      degraded: ['prices', 'AI summarization'],
    }}
  />
  </Surface>
);
