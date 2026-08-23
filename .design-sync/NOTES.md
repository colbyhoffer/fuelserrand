# Design-sync notes — fuelserrand

- App repo, not a packaged DS: no dist. Entry is the barrel `components/index.ts`; always pass `--entry ./components/index.ts` to build/resync.
- `BriefView` must import `formatDateLong` from `lib/format.ts` (pure) — never from `lib/data.ts`, which pulls `node:fs` and breaks browser bundling. `lib/data.ts` re-exports it for the site.
- Components assume the app surface: previews wrap in `div` with `background: var(--bg); color: var(--text)` (see `.design-sync/previews/BriefView.tsx` `Surface`). Without it, near-white text on a white card.
- Tokens + all global classes ship from `app/globals.css` (cfg.cssEntry) → `_ds_bundle.css`. Keep it in sync with `pipeline/email.ts` palette constants (design decision: unified warm charcoal).
- No webfonts (system-ui only) — `[FONT_MISSING]` should never fire; if it does, something added a font.

## Re-sync risks

- Preview data is real Aug-2026 brief content inlined in `.design-sync/previews/*.tsx`; it doesn't rot functionally but will read dated — refresh copy opportunistically, not urgently.
- If `BriefView`'s `Brief` type gains required fields, both preview stories need them or capture fails.
- The barrel `components/index.ts` must list any new component before it syncs; `componentSrcMap` in config pins src paths.
- Playwright chromium cache: `~/Library/Caches/ms-playwright/chromium_headless_shell-1234` (playwright 1.x pinned in .ds-sync). Fresh machine → reinstall both.
