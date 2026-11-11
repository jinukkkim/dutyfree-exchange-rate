# Chinese Pages Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add complete Simplified and Traditional Chinese home and guide pages.

**Architecture:** Extend existing five-language translation arguments, route detection and static HTML output. Reuse the current components and rate data.

**Tech Stack:** React, TypeScript, Vite, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-11-chinese-pages-design.md`

## Global Constraints

- Use `/zh-Hans` and `/zh-Hant` and corresponding `/guide` paths.
- No new production dependencies or deployment. The user subsequently requested CNY and TWD/HKD reference conversions (tasks 3–4).
- Chinese guides follow Japanese topics with independently sourced DCC wording.

## Review Focus

- Language switching must preserve guide paths, including trailing slashes.
- Route prefixes must have a path boundary.
- Pending/stale notices, chart controls and sharing states need Chinese text.
- Each generated page must have matching canonical/hreflang/locale metadata.
- Navigation must fit mobile screens with five available languages.

### Task 1: Chinese runtime pages

**Files:** `web/src/lib/format.ts`, `web/src/App.tsx`, `web/src/components/{TodayTomorrow,RateChart,Footer,RateGuide}.tsx`; tests in `web/src/App.test.tsx`, `web/src/lib/format.test.ts`.

**Interfaces:** Extend `Lang` with `zh-Hans` and `zh-Hant`; `pick(lang)(ko, en, ja, zhHans, zhHant)` requires all five texts. Add `RateGuideZh({ lang: "zh-Hans" | "zh-Hant" })`.

- [x] Add and run failing route/date/navigation tests.
- [x] Add both translations, guide content and responsive language navigation.
- [x] Run the full web test suite and type check.

### Task 2: Search and hosting

**Files:** `web/og.ts`, `web/og.test.ts`, `web/index.html`, `web/public/sitemap.xml`, `web/vite.config.ts`, `vercel.json`, `docs/domain-reference.md`.

**Interfaces:** `searchDescription(rates, lang)` supports Chinese with dated rates and comparisons. Emit `zh-Hans.html`, `zh-Hans-guide.html`, `zh-Hant.html`, `zh-Hant-guide.html`.

- [x] Add and run failing Chinese search-description tests.
- [x] Extend static metadata, reciprocal hreflang and hosting rewrites; record DCC sources.
- [x] Run `npm test` and `npm run build` in `web`; inspect all emitted HTML/rewrite pairs.
- [ ] Visually inspect mobile layout (browser access host unavailable).

## Verification

- `npm test`: 99 tests passed across 9 files, including lowercase Chinese routes, hosting aliases, currency conversions and middle-dot formatting.
- Collector `.venv/bin/python -m pytest -q`: 71 tests passed after review fixes, including isolation of unrelated/malformed currency quotes and dates, and changed-row commit dates. Live fetch returned CNY/HKD history for 64 publication days (2026-08-13–2026-11-10), plus 8 TWD rows. No local data or git writes during the live check.
- `npm run build`: TypeScript and Vite passed.
- Production artifact checks: all 10 pages passed rewrite ordering, language, canonical, reciprocal hreflang, description, Open Graph and sitemap checks.
- `git diff --check`: passed. Independent read-only review: no remaining findings.
- Mobile wrapping was inspected in code; actual browser rendering remains unverified because the browser access host was unavailable. No deployment performed.

### Task 3: Collect Chinese reference currencies

**Files:** `collector/src/dfx/{reference,store,collect}.py`, `collector/tests/{test_reference,test_collect}.py`, `data/reference.csv`, `docs/domain-reference.md`.

**Interfaces:** `ReferenceRate(fixing_date, currency, krw_per_unit, source)`; `reference.fetch(client, start, today)` returns validated CNY/HKD (ECB) and TWD (SMBS). Read/write dated rows without losing precision or overwriting unaffected currencies.

- [x] Add failing parser/source-isolation/CSV/collector-commit tests.
- [x] Implement fetch, validation, persistence and reference-only collection commits.
- [x] Seed real reference data and run all collector tests.

### Task 4: Show approximate currency amounts

**Files:** `web/src/lib/rates.ts`, `web/src/App.tsx`, `web/src/components/{TodayTomorrow,Footer}.tsx` and corresponding tests.

**Interfaces:** normalized `Conversion { currency, fixingDate, krwPerUnit, source }[]`; `latestConversions(csv, today)` returns last valid, non-stale, non-future Chinese reference per currency. Normalize existing JPY data in App and share the display.

- [x] Add failing conversion and footer tests.
- [x] Display CNY in Simplified Chinese, TWD and HKD in Traditional Chinese, preserving JPY display.
- [x] Check pending states, missing currencies, guide exclusion, reference dates, and single-line spacing in DOM tests.
- [x] Run web suite/build and review the final changes. Independent review found no remaining issues; actual mobile rendering remains unverified.

### Review corrections

- [x] Reproduce first-date-only ECB parsing and lack of recovery after failed collection.
- [x] Switch to the 90-day feed and parse all publication dates in chronological order.
- [x] Share SMBS requests for USD/JPY/TWD and initial backfill; keep HTTP/parse errors visible to callers.
- [x] Keep the intentional mobile header behavior and describe its effect on all language pages in the PR.
- [x] Include conversion text in each column's width calculation while preserving number positions with a zero-height wrapper and the existing reserved bottom space. Keep Traditional Chinese on one line and use 12px text below `sm` when showing both currencies.
- [x] Verify 91 web tests, 64 collector tests and the production build. Native Chrome verification timed out; actual mobile rendering remains unverified.
- [x] Parse only KRW/CNY/HKD and validate CNY/HKD independently so unrelated or malformed currency quotes do not discard valid quotes.
- [x] Use actual changed reference rows to choose the reference-only commit date, including historical additions and corrections.
- [x] Serve lowercase Chinese home/guide aliases with the same static HTML and canonical metadata, and normalize their runtime language and internal links.
