# Base-rate Guide History Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show sourced domestic-product base-rate changes under the Korean guide explanation.

**Architecture:** Read the existing repository CSV and metadata at build time. Derive per-operator changes, group identical events and render one compact table in the Korean guide.

**Tech Stack:** React, TypeScript, Vite, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-16-base-rate-guide-history-design.md`

## Global Constraints

- Reuse existing CSV, metadata and guide styles; no production dependencies.
- Preserve the original verification date and uncertain month-only dates.
- Do not present the archive as a current quote; no home or foreign-guide additions.

## Review Focus

- Previous rates belong to each operator, even when change dates differ.
- Same-day events with different values or sources must remain separate.
- Earliest records must not invent previous rates; invalid or missing amounts cannot become zero/NaN.
- Uncertain dates stay month-only and explicitly labeled.
- Mobile rows must fit; sources and verification date must be visible and accessible.

### Task 1: Derive and display the history

**Files:** Create `web/src/lib/baseRates.ts`, `web/src/lib/baseRates.test.ts`, `web/src/components/BaseRateHistory.tsx`; modify `web/src/components/RateGuide.tsx`, `web/src/App.test.tsx`.

**Interfaces:** `parseBaseRateChanges(csv: string): BaseRateChange[]`; `BaseRateChange` contains `effectiveDate`, `operators`, `previousRate`, `rate`, `status`, `sourceUrl`. `BaseRateHistory()` reads the existing CSV and verification metadata.

- [x] Add failing tests for per-operator previous values, newest-first grouping, source separation, missing/invalid values and unknown previous values.
- [x] Add failing guide integration tests for the archive, source links, partial dates and verification notice; check route boundaries.
- [x] Implement the derivation, compact accessible table and Korean guide insertion.
- [x] Run `cd web && npm test && npm run build`.
- [x] Review the complete diff. Leave changes available for the user; no commit, push or deployment is requested.

## Verification

- Baseline: 101 web tests passed. Final: 112 tests passed across 10 files; TypeScript and Vite build passed; `git diff --check` passed.
- Independent read-only review found no Critical/Important issues. The minor source-isolation coverage gap was corrected; removing `sourceUrl` from the grouping key made the dedicated test fail, and restoring it passed the full suite.
- Existing 20 data rows render as nine grouped history events. CSV values, verification date and collection code are unchanged.
- Actual mobile/desktop rendering remains unverified: the browser access host was unavailable, and native Chrome was in active use. A local preview is available at `http://127.0.0.1:5173/guide`.
- Scope decisions: Korean guide only; implementation stays on `feat/base-rate-guide-history` in the existing checkout. No commit, push or deployment.

### Task 2: Research accuracy and up to three sources (user follow-up)

The follow-up spec supersedes Task 1's inferred previous values and preserved old verification date. No broad screen restructuring.

- [x] Research 2025 and 2026 independently; verify older contemporary reports and preserve source/date conflicts in `docs/base-rate-history-research-2026-11-16.md`.
- [x] Store article-supported `previous_rate`, pipe-separated source names/URLs and per-record uncertainty notes. Update the verification date only after research.
- [x] Add 2024 December and 2025 June evidence; resolve Shilla/Lotte November dates, retain Shinsegae month-only and remove the unsupported Hyundai November assertion.
- [x] Test explicit previous values across missing records, grouping, source/status separation, uncertain scope, invalid amounts, three-source cap and real guide output. Observe failures against the old implementation first.
- [x] Implement `{ name, url }[]` sources and compact links, retaining the guide's archive disclaimer.
- [x] Run all web tests (113 passed), TypeScript/Vite build and diff whitespace checks.
- [x] Read final independent review: all 23 rows and 14 linked article bodies checked; no actionable findings. Focused tests independently passed (23/23).

Follow-up artifact: 23 CSV rows form 14 grouped display events. No deployment or commit. Actual browser layout has not been rechecked; the user will handle subsequent structural changes.

### Task 3: User-directed event rows and source excerpt dialog

- [x] Capture the requested 7-event table and source dialog in the follow-up design; verify exact article excerpts.
- [x] Add failing tests for monthly event grouping, dates/status preservation, repeated changes across years, union of sources and source cap.
- [x] Add failing tests for source-specific/event-specific quotes, publication dates, article links, close/cancel/backdrop behavior and quote coverage/budget.
- [x] Implement event grouping and the change-first table; remove the August Aju source only; distinguish November Shinsegae/Hyundai uncertainty.
- [x] Implement the native dialog with short verbatim excerpts and links below.
- [x] Run the web suite (116 passed), production build and diff checks; independent read-only review found no actionable issues and independently passed 26 focused tests.

Task 3 verification: seven event rows preserve all retailer dates; 14 source records cover every displayed event/source with per-article quotation totals at most 25 words. Native dialog behavior is covered via minimal jsdom display shims. Actual mobile layout and native browser focus/modal behavior remain unverified because the browser access host is unavailable. No commit or deployment.

### Task 4: Chart in explanation, detailed table at bottom

- [x] Record the requested placement and month-only chart axis in the design.
- [x] Write and run failing tests for chronological chart values, month-only labels and guide order.
- [x] Add `BaseRateChart.tsx` using the same event data and inline SVG; keep chart placement free of table/source controls.
- [x] Move the complete table/source dialog below all other Korean guide content and use a section heading appropriate to that position.
- [x] Run all web tests, production build and diff checks; independently review the change.

Task 4 checks: all 117 web tests and TypeScript/Vite build passed; `git diff --check` passed. The source dialog tests still pass. Actual browser rendering remains unverified due to the previously observed browser access host failure.

Task 4 review: independent reviewer verified order, values, month-only labels, table placement and source dialog, and passed 21 focused tests. A narrow-screen label overlap was found using actual font dimensions (38.9px text in 36px cells at 320px viewport). Fixed by staggering alternate mobile labels by 16px, leaving 72px between labels on the same row; desktop remains on one line.

### Task 5: Collapse history and match the main chart

- [x] Inspect the main chart's line, axes and hover/touch label behavior.
- [x] Add failing tests for collapsed history, disclosure toggling and source dialog after expansion; update the guide-order test.
- [x] Add failing tests for no permanent dots, mouse/touch value inspection, scaling to the actual SVG bounds and hiding on leave/end.
- [x] Use native `details`/`summary` at the guide bottom and match main chart colors, 1.5px line, sparse axes and hover labels; preserve steps and month labels.
- [x] Run full web tests/build/diff checks and independent review.

Task 5 verification: all 120 web tests and TypeScript/Vite build passed; independent reviewer passed 24 focused tests and found no actionable issues. Native browser rendering/touch/focus behavior has not been visually rechecked because browser access is unavailable. No commit or deployment.

### Task 6: History below chart and proportional time axis

- [x] Add failing tests for chart-adjacent disclosure, actual month-distance ratios (6/5/4/4/1/1) and individual selection in the crowded July/August/September range.
- [x] Move the disclosure directly after the chart and restore its nested heading level.
- [x] Use serial calendar months for positions and sparse month-only axis labels.
- [x] Follow the user's added request: hover every month, carry the last confirmed change value and move the marker to the selected month. Observe the new 22-month test fail before implementation and pass after.
- [x] Run full web tests/build/diff checks and independent review.

Task 6 verification: all 122 web tests and TypeScript/Vite build passed; diff checks passed. Independent review verified proportional time/placement and then the monthly-selection delta without findings; all five chart tests independently passed, including every month across 2024-12–2026-09. Browser rendering remains unverified because browser access is unavailable. No commit or deployment.

### Task 7: Apply approved area chart design

- [x] User selected PNG option 2, the pale blue filled step chart with a large monthly readout.
- [x] Add failing tests for the persistent/default monthly readout, restore-on-leave behavior and narrow-screen resize/selection.
- [x] Apply blue line/fill, quiet 50-won grid, padded vertical range and the selected header layout.
- [x] Measure actual plot width and keep 240px height; preserve calendar spacing, all-month hover and source/history disclosure.
- [x] Run the full web suite, production build/diff checks and independent review.

Task 7 verification: 123 web tests passed; TypeScript/Vite build and diff checks passed. Pale blue fill is present in the built CSS. Independent review passed all six chart tests and found no actionable issues. Actual browser rendering remains unverified; no commit or deployment.

### Task 8: Fix the latest readout and separate hover labels

- [x] Observe failing tests for the fixed latest rate/month and separate historical hover/touch labels.
- [x] Keep the large readout at the latest recorded value and use the home chart's floating label layout above the selected position.
- [x] Preserve monthly selection, touch dismissal and responsive time spacing.

Task 8 verification: all 123 web tests, TypeScript/Vite build and diff checks passed. Actual browser rendering remains unverified; no commit or deployment.

### Task 9: Carry the last rate through the research month

- [x] Reproduce the premature September endpoint with failing monthly-selection and line-extension tests.
- [x] Use `base_rates_verified_at` as the chart endpoint, extending the September rate horizontally through November without adding change records.
- [x] Show the research month above the fixed latest value; preserve proportional spacing and hover/touch selection for all 24 months.

Task 9 verification: all 124 web tests, TypeScript/Vite build and diff checks passed. Actual browser rendering remains unverified; no commit or deployment.

### Task 10: Address PR #50 scrolling and chart data edge cases

- [x] Reproduce vertical-scroll blocking, missing non-50 maximum tick and empty/invalid archive crashes with failing tests.
- [x] Allow native vertical panning and clear selection on vertical movement; preserve tap/horizontal selection and dismissal on end/cancel.
- [x] Include the maximum tick outside 50-won intervals and show a fallback when no valid records remain.
- [x] Run the full suite, build and diff checks before committing and pushing the fixes.

Task 10 verification: 128 web tests and 82 collector tests passed; TypeScript/Vite build and diff checks passed. Native browser scrolling remains unverified because browser access is unavailable.
