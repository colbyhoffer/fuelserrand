# Fuels Errand

Daily briefing on refined fuels markets — gasoline, diesel, renewable diesel, and SAF — at [fuelserrand.com](https://fuelserrand.com).

Every weekday ~6:30am CT, a GitHub Actions cron job:

1. **Fetches news** from direct RSS feeds (EIA, trade press) and Google News topic queries (used as a *finder only* — every item is attributed and linked to the original publisher; social media, forums, and stock-picking sites are blocked).
2. **Fetches market data** from the EIA Open Data API: RBOB/ULSD/WTI spots, computed crack spreads, weekly retail prices, inventories, and implied demand.
3. **Watches IR pages** of ~24 refiners, renewable-fuel producers, c-store chains, and big-box fuel retailers; new PDFs are analyzed by Claude for fuels-market takeaways.
4. **Edits the brief with Claude** — ranks, dedupes, summarizes, writes the headline and overview. Paywalled trade wires (OPIS, Platts, Argus, Bloomberg…) appear as marked headline + link only.
5. **Emails the brief** via Resend and **commits the day's data** to `data/`, then redeploys the static site to GitHub Pages.

The repo is the database: `data/briefs/*.json` is the archive, `data/price-history.json` feeds the dashboard, `data/decks.json` is the investor-materials library.

## Local development

```bash
npm install
cp .env.example .env.local   # then fill in your keys
npm run pipeline:dry          # full pipeline, no email; writes out-preview/email-preview.html
npm run dev                   # site at localhost:3000
```

Pipeline flags: `--dry-run` (no email), `--baseline` (first run: catalogue existing IR documents without analyzing, so only genuinely new ones are reported later).

## Configuration

Secrets (GitHub repo → Settings → Secrets and variables → Actions):
`ANTHROPIC_API_KEY`, `RESEND_API_KEY`, `EIA_API_KEY`.
Optional repo *variables*: `BRIEF_TO`, `BRIEF_FROM`.

Sources, blocked/paywalled domains, and the company watch list live in [pipeline/config.ts](pipeline/config.ts) — edit there.

## Costs

GitHub Actions, GitHub Pages, Resend (1 email/day), and the EIA API are all free at this scale. The only real cost is the Claude API: roughly $3–10/month depending on how many investor decks get published.
