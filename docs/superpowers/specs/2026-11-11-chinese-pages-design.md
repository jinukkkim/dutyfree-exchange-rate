# Chinese pages

Add Simplified Chinese (`/zh-Hans`) and Traditional Chinese (`/zh-Hant`), each with a `/guide`, following the existing English and especially Japanese pages requested by the user.

Extend the existing `Lang`/`pick` translation pattern and build-time static HTML generation. A separate routing or translation library adds no value for two more languages. Translate every visible state, chart label, tooltip, sharing result, and search description; keep language switching on the equivalent home/guide page. Wrap the language navigation on narrow screens.

The guide follows the Japanese guide's five topics, with Chinese-specific wording. Explain DCC using Visa's Chinese travel guidance; do not reuse Japanese card fees or assume a reader's home currency from their writing system.

Follow-up scope requested by the user: show approximate CNY amounts on Simplified Chinese pages, and both TWD and HKD on Traditional Chinese pages, like the Japanese yen line. Keep USD/KRW as the primary values and use the same reference rate for today's and tomorrow's conversion. CNY/HKD come from ECB's daily EUR quotes (KRW per EUR divided by currency per EUR); TWD comes from SMBS. Do not substitute CNH for CNY. Persist dated source data in `data/reference.csv` and include reference-only changes in the existing collection commit. A failed reference source must not block USD/JPY or the other source. Hide stale, invalid or future-dated conversions; state each rate's date, source and fee exclusion in the footer. Join Traditional Chinese amounts on one compact line with a middle dot, e.g. `約NT$33.8 · HK$8.5`, and reserve one line of space; guides have no conversion footnote.

Verify routes, dates, home/guide navigation and translations with Vitest, then check the production HTML's canonical, hreflang, locale, descriptions and Vercel rewrites. Check mobile layouts where browser access is available. No dependency changes or deployment required.
