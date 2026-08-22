import Anthropic from '@anthropic-ai/sdk';
import { CLAUDE_MODEL, ENV, MAX_STORIES_PER_BRIEF, USER_CONFIG, type WatchedCompany } from './config';

const ENV_PREFERRED = () => USER_CONFIG.preferredOutlets;
const ENV_DEPRIORITIZED = () => USER_CONFIG.deprioritizedOutlets;
import type { Brief, PricePoint, Story } from './types';

function client(): Anthropic | null {
  return ENV.anthropicKey ? new Anthropic({ apiKey: ENV.anthropicKey }) : null;
}

function textOf(msg: Anthropic.Message): string {
  return msg.content.filter((b): b is Anthropic.TextBlock => b.type === 'text').map((b) => b.text).join('\n');
}

// ---------------------------------------------------------------------------
// Story selection + summarization: one call ranks, filters, and summarizes.
// ---------------------------------------------------------------------------

export interface EditorialResult {
  headline: string;
  intro: string;
  overview: string;
  stories: Story[];
  degraded: boolean;
}

export async function editStories(stories: Story[], prices: PricePoint | null): Promise<EditorialResult> {
  const c = client();
  if (!c) {
    console.warn('[summarize] ANTHROPIC_API_KEY not set — using fallback (feed snippets, no ranking)');
    return fallbackEdit(stories);
  }

  const candidates = stories.map((s, i) => ({
    id: i,
    title: s.title,
    source: s.source,
    category: s.category,
    paywalled: s.paywalled,
    snippet: s.raw ?? '',
  }));

  const priceContext = prices
    ? `Latest market data (EIA): RBOB spot $${prices.rbobSpot ?? '?'} /gal, ULSD spot $${prices.ulsdSpot ?? '?'} /gal, WTI $${prices.wtiSpot ?? '?'} /bbl, gasoline crack $${prices.gasCrack ?? '?'} /bbl, diesel crack $${prices.dieselCrack ?? '?'} /bbl, retail gas $${prices.retailGas ?? '?'} /gal, retail diesel $${prices.retailDiesel ?? '?'} /gal.`
    : 'No market data available today.';

  const res = await c.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 4000,
    system: `You are the editor of Fuels Errand, a daily briefing on US refined fuels markets: gasoline, diesel, renewable diesel, and sustainable aviation fuel (SAF). Your reader follows refining economics, fuel retail, and clean-fuels policy closely. Be precise, neutral, and information-dense. Never invent facts not present in the provided material.`,
    tools: [{
      name: 'submit_brief',
      description: 'Submit the edited daily brief.',
      input_schema: {
        type: 'object',
        properties: {
          headline: { type: 'string', description: "The day's most important development, under 12 words" },
          intro: { type: 'string', description: "1-2 sentence conversational opener in a Morning Brew register — a light, sharp hook into the day's fuels story. Informed and wry, never cutesy; no greeting like 'Good morning'." },
          overview: { type: 'string', description: '2-3 sentence synthesis of the day across markets, policy, operations, and companies' },
          selected: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                summary: { type: 'string', description: '1-2 sentences from the title and snippet only; for paywalled items at most one sentence on what the headline indicates' },
                category: { type: 'string', enum: ['markets', 'policy', 'operations', 'deals', 'companies'] },
              },
              required: ['id', 'summary', 'category'],
            },
          },
        },
        required: ['headline', 'intro', 'overview', 'selected'],
      },
    }],
    tool_choice: { type: 'tool', name: 'submit_brief' },
    messages: [{
      role: 'user',
      content: `${priceContext}

Below are candidate stories collected in the last day (JSON). Select up to ${MAX_STORIES_PER_BRIEF} that genuinely matter for refined fuels markets. Drop duplicates covering the same event (keep the most authoritative source), drop irrelevant items (crude E&P with no refining angle, generic stock-picking takes, local-interest fluff).

Outlet preferences (ranking guidance only — NEVER exclude a story solely because of its outlet; unfamiliar outlets with genuinely important stories should still be selected):
- Preferred outlets (nudge upward in ranking; prefer as the kept source when deduping): ${JSON.stringify(ENV_PREFERRED())}
- Deprioritized outlets (nudge downward): ${JSON.stringify(ENV_DEPRIORITIZED())}

Candidates:
${JSON.stringify(candidates)}`,
    }],
  });

  try {
    const toolUse = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
    if (!toolUse) throw new Error('no tool_use block in response');
    const parsed = toolUse.input as any;
    const chosen: Story[] = [];
    for (const sel of parsed.selected ?? []) {
      const orig = stories[sel.id];
      if (!orig) continue;
      chosen.push({ ...orig, summary: String(sel.summary ?? '').trim(), category: sel.category ?? orig.category, raw: undefined });
    }
    if (chosen.length === 0) return fallbackEdit(stories);
    return {
      headline: String(parsed.headline ?? '').trim() || 'Daily refined fuels briefing',
      intro: String(parsed.intro ?? '').trim(),
      overview: String(parsed.overview ?? '').trim(),
      stories: chosen,
      degraded: false,
    };
  } catch (err: any) {
    console.warn(`[summarize] could not parse editorial response: ${err?.message}`);
    return fallbackEdit(stories);
  }
}

function fallbackEdit(stories: Story[]): EditorialResult {
  const chosen = stories.slice(0, MAX_STORIES_PER_BRIEF).map((s) => ({
    ...s,
    summary: s.paywalled ? '' : (s.raw ?? '').slice(0, 220),
    raw: undefined,
  }));
  return {
    headline: 'Daily refined fuels briefing',
    intro: '',
    overview: 'AI summarization was unavailable for this edition; stories below carry their original feed descriptions.',
    stories: chosen,
    degraded: true,
  };
}

// ---------------------------------------------------------------------------
// Investor document analysis. PDFs go to Claude as document blocks; HTML
// filings (EDGAR exhibits, 10-Qs) are stripped to text and truncated.
// ---------------------------------------------------------------------------

const MAX_PDF_BYTES = 30 * 1024 * 1024;
const MAX_HTML_CHARS = 150_000;

export async function analyzeDoc(company: WatchedCompany, docUrl: string, label: string): Promise<string | null> {
  const c = client();
  if (!c) return null;

  const { SEC_USER_AGENT } = await import('./config');
  const ua = docUrl.includes('sec.gov') ? SEC_USER_AGENT : 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36';
  const res = await fetch(docUrl, { signal: AbortSignal.timeout(60_000), headers: { 'user-agent': ua } });
  if (!res.ok) throw new Error(`doc fetch: HTTP ${res.status}`);

  const isPdf = /\.pdf(\?|#|$)/i.test(docUrl) || (res.headers.get('content-type') ?? '').includes('pdf');
  let docBlock: any;
  if (isPdf) {
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.byteLength > MAX_PDF_BYTES) throw new Error(`PDF too large (${(buf.byteLength / 1e6).toFixed(1)} MB)`);
    docBlock = { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') } };
  } else {
    const html = await res.text();
    const text = html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;|&#160;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, MAX_HTML_CHARS);
    if (text.length < 500) return null; // cover pages / stub docs — nothing to analyze
    docBlock = { type: 'text', text: `Document text:\n${text}` };
  }

  const focus = company.group === 'bigbox'
    ? 'This is a general retailer; extract ONLY fuel-segment material: fuel gallons/comps, fuel margin commentary, station count changes, membership-fuel dynamics. If the document contains no fuel-relevant content, reply with exactly NO_FUEL_CONTENT.'
    : 'Extract what matters for refined fuels markets: throughput/utilization, capture rates and margins, renewable diesel/SAF economics and capacity, RIN/LCFS exposure, capital allocation signals, and guidance changes.';

  const msg = await c.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 1500,
    system: 'You analyze investor documents for a refined fuels markets briefing. Be specific with numbers; never invent figures not in the document.',
    messages: [{
      role: 'user',
      content: [
        docBlock,
        { type: 'text', text: `New investor document from ${company.name} (${company.ticker}): "${label}". ${focus}\n\nWrite a tight analysis in markdown: 3-6 bullet points of takeaways, then one sentence on what it signals for fuels markets. No preamble.` },
      ],
    }],
  });

  const text = textOf(msg).trim();
  return text === 'NO_FUEL_CONTENT' ? null : text;
}
