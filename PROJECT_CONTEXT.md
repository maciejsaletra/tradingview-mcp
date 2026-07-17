# Project Context — Trading Room Workshop (TRW)

Magic runs a trading education and signals community called Trading Room Workshop (TRW) and uses Claude as a daily autonomous trading analyst integrated with TradingView Desktop via MCP. The primary output is professional ICT/SMC analysis with branded signal cards published to the TRW Telegram group. Magic communicates efficiently, often in Polish, and is deeply fluent in ICT/SMC terminology — Claude should not explain basic concepts.

## Methodology

ICT/SMC (Smart Money Concepts) — Order Blocks (OB), Fair Value Gaps (FVG), Break of Structure (BOS), Change of Character (CHoCH), liquidity sweeps, BSL/SSL, premium/discount zones. Fibonacci levels (XAU roles per `feedback_fibonacci_gold`, aligned 2026-07-08): **0.618** = primary entry/confluence retracement, **1.272** = TP1 extension target, **1.618** = TP2 extension target — mandatory focal points in every analysis, always explicitly marked in signal cards. In scoring they are additive bonuses (+5 pts each with OB/FVG confluence, ROUTINES_V2 §7b E3), never standalone entry triggers.

**Core watchlist (updated 30.06.2026) — split into 4 Telegram topic groups:**
- **XAU** (gold only, always analyzed at every scheduled run): XAUUSD
- **WALUTY**: EURUSD, USDJPY, XAGUSD (silver)
- **INDEKSY**: SP500, DJ30, NAS100 (NASDAQ), GER40, NIKKEI, UK100, UKOIL
- **KRYPTO**: BTCUSDT, ETHUSDT
- TVC:DXY remains the macro cross-check filter (not posted directly, used to validate XAU/FX bias).

**Signal card standards (updated 2026-07-08 — supersedes the 30.06.2026 light-theme spec):** All card templates are **locked dark/gold themes** in `context/`, approved from reference screenshots — do not redesign without explicit re-approval: `session_analysis_template.html` (pre-session analysis, every session), `carryover_card_template.html` (PLAN ASIA/LONDYN/NEW YORK), `commercial_card_template.html` (new signals, Variant A), `eod_card_template.html` (daily close). TRW logo comes from the single source `assets/trw_logo.jpg`, embedded automatically by the card pipeline (`loadLogoBlock()` in `src/core/card.js`) — never hardcode base64 into a template. Only setups ≥60% confidence presented. No Python code visible in output — deliver finished HTML only.

## Current State (reference snapshot — update each session)

- LMT LONG open at 505.00, TP1=515 (previously hit during session per trade log — confirm current status at session open).
- EOD 25.06.2026 summary (reference baseline): XAU closed ~4031 (+38$). SHORT 4018–4028 → TP1 3999 ✅ (+1.9RR). LONG 3999–4003 → TP2 4034 ✅ (+2.1RR). XAGUSD SHORT TP1 hit ✅. Net daily RR: +5.2. DXY ~101.40 ↓.
- Bias for 26.06.2026: Neutral→bearish. Key resistance: 4042–4060. Key support: 3999–4003 and 3959–3975. VIX ~19.13 rising.
- Friday protocol active (when applicable): Reduced position sizing, earlier profit-taking, hard stop on new entries by 16:30 UTC, full closure by 19:30 UTC.
- Live Economic Calendar duplicate: Two instances of "Live Economic Calendar by toodegrees" on chart — Magic to remove one.

## On the Horizon

- ~~Telegram Bot API integration for automated signal posting (including screenshots)~~ — **DONE 2026-06-29.** Bot `@msaletra_bot` posts signals (screenshot + entry/SL/TP1-3/probability) via `telegram_send_signal` MCP tool / `tv telegram send` CLI to chat `-1003969670552` ("Trading Room Workshop"). Auto-appends a row to `trade_log.md` on every successful send. Code: `src/core/telegram.js`, `src/tools/telegram.js`, `src/cli/commands/telegram.js`.
- ~~Scheduler for automatic pre-session briefings~~ — **DONE 30.06.2026, expanded 30.06.2026.** 6 daily scheduled tasks (`mcp__scheduled-tasks`, stored as `C:\Users\Magic\.claude\scheduled-tasks\trw-*\SKILL.md`), Mon–Fri, London local time: **01:30** (Asian session open, added 30.06.2026), 08:30, 13:00, 15:00, 18:00 (each runs the full XAU + WALUTY + INDEKSY + KRYPTO sweep, posts setups ≥60% probability as signal cards to the matching topic thread) and 21:50 EOD (stats/win-rate summary as plain text to **WYNIKI/STATYSTYKI**). Cron expressions for this scheduler run in **local time directly** (e.g. `30 1 * * 1-5` = 01:30 local) — no UTC offset math needed, so no DST drift risk like the old trigger-based system.
- **Topic routing (added 30.06.2026):** `telegram_send_signal`/`telegram_send_text` take a `topic` param (`xau`/`waluty`/`indeksy`/`krypto`/`wyniki`) mapped via `TELEGRAM_TOPIC_THREADS` in `src/config.js` to thread IDs in `.env` (`TELEGRAM_THREAD_XAU=1885`, `TELEGRAM_THREAD_WALUTY=1889`, `TELEGRAM_THREAD_INDEKSY=1891`, `TELEGRAM_THREAD_KRYPTO=43`, `TELEGRAM_THREAD_WYNIKI=17`). Old `PLAN DNIA` thread (`TELEGRAM_SIGNAL_THREAD_ID=7`) remains as fallback only, no longer the primary destination.
- **Logo stamping (added 30.06.2026):** no local HTML-to-PNG renderer exists in this repo (the old rich HTML card template required claude.ai's sandboxed Python/browser environment, not available here), so signal cards use a lightweight alternative: `node src/cli/index.js card compose --screenshot <raw chart png> --out <branded png>` (`src/core/card.js`, uses `jimp`) stamps `assets/trw_logo.jpg` into the top-right corner of the raw `capture_screenshot` output, sized to ~12% of the shorter image dimension. Run this BEFORE `telegram send` and pass the composed (`--out`) file as `--photo`, not the raw screenshot. All 5 briefing scheduled tasks (01:30/08:30/13:00/15:00/18:00) updated to do this two-step (compose → send).
- **CRITICAL — MCP server has no internet access (confirmed 30.06.2026):** the `mcp__tradingview__telegram_send_signal`/`telegram_send_text` MCP tools always fail with `"fetch failed"` — the stdio MCP server process (launched directly by the Claude Desktop/CCD host per `claude_desktop_config.json`) is network-sandboxed to localhost (CDP port 9222 only). It is NOT a cert/proxy issue (ruled out `NODE_EXTRA_CA_CERTS`/Norton AV interception — fetch works identically with or without it). **Always send Telegram messages via Bash + CLI instead**: `cd "C:\Users\Magic\tradingview-mcp" && node src/cli/index.js telegram send --photo ... --topic ...` or `telegram send-text --text ... --topic ...` — the Bash tool's process has full internet access and this path is verified working. All 6 scheduled briefing/EOD tasks (`C:\Users\Magic\.claude\scheduled-tasks\trw-*\SKILL.md`) were updated to use this CLI path, not the MCP tool.
- EOD review workflow: use ready-to-paste prompt in a new thread within the same project (not a new project).

## Key Learnings & Principles

- All entries must be pending/future setups only — never generate a setup that would require an entry at a past price.
- `draw_clear` is unreliable after TradingView restart — always instruct Magic to press Alt+T to clear drawings manually before drawing new levels.
- LuxAlgo/SMC indicators must be visible (not hidden) — if Pine Boxes return no data, first check indicator visibility settings.
- Economic Calendar limitation: `data_get_pine_labels` with `study_filter="Economic Calendar"` returns only graphical symbols (●◯◐◑◓), not event names. This is a toodegrees indicator limitation, not an API issue. Decode via textColor: `4282117119`=red HIGH IMPACT (hard NO-ENTRY window −25/+30 min per ROUTINES_V2 §9, mark NO TRADE ZONE in card), `4278229247`=blue MEDIUM, `4283585279`=yellow LOW. Clustered symbols at same x-position = news cluster. Map x-position to timestamp via OHLCV bar index; cross-reference forexfactory.com for event names.
- ICT Pro indicator (ID: JTKtG7): Query `data_get_pine_labels` to extract BOS/CHoCH labels with exact price values — always do this before generating setups to identify most recent structural break.
- Batch multi-symbol/multi-timeframe MCP calls fail — run sequentially.
- DXY accessed via `quote_get` for symbol `TVC:DXY` (added to watchlist); previously proxied through EURUSD/USDJPY.
- `summary:False` for M5/M15 precision; `summary:True` for H4/D context.

## Approach & Patterns

**Mandatory analysis sequence (every XAUUSD/watchlist analysis from 26.06.2026 onward, expanded 29.06.2026 — run in full, never shortened):**

1. `watchlist_get` — DXY, VIX, all instruments, macro context
2. `chart_set_symbol` + `chart_set_timeframe("D")` then `("240")` — establish D1 and 4H bias FIRST, before dropping to H1/M15. Use **ICT HTF Candles (fadi)** [CD80WN] — this indicator overlays higher-timeframe candles directly on the lower-timeframe chart, so D1/4H structure can often be read without fully switching timeframe; still confirm with an explicit `chart_set_timeframe` pass.
3. `chart_set_timeframe` down to H1, then M15
4. `data_get_ohlcv(count=60)`
5. `data_get_pine_boxes(verbose=True)` — OB zones (active/inactive, exact boundaries)
6. `data_get_pine_labels(max_labels=200)` — query EACH of: **ICT Pro** (BOS/CHoCH), **Smart Money Concepts [LuxAlgo]** (FVG tags), **Liquidity Swings + SMC Structures**, **Live Economic Calendar** (decode colors per above — treat any HIGH IMPACT (red) event as a NO TRADE ZONE from 25 min before to 30 min after, per ROUTINES_V2 §9). Do not query only ICT Pro.
7. `data_get_pine_lines()` — SMC level lines + OB
8. `data_get_study_values()` — MA Ribbon direction + Sessions values
9. DXY cross-check: `chart_set_symbol("TVC:DXY")` + `data_get_pine_labels` (ICT Pro) — confirm DXY's own BOS/CHoCH direction agrees (inverse) with the XAU setup before finalizing probability. Switch back to XAUUSD after.
10. `draw_clear` instruction (Alt+T for Magic) + `draw_shape` for key levels, **always including the entry zone as a `rectangle`**. Updated 30.06.2026 — entry zone must use a bold, unmistakable yellow style (the chart is cluttered with red/teal indicator boxes that a faint zone gets lost in): `overrides: {"linecolor": "#FFFF00", "fillcolor": "#FFFF004D", "linewidth": 3, "linestyle": 0, "showLabel": true, "text": "ENTRY", "textcolor": "#000000", "fontsize": 14, "bold": true}`. Always visually confirm via `capture_screenshot` that the rectangle is actually visible in the captured frame before sending — `draw_shape` can return `success: true` without the shape actually being visible if the CDP page context has gone stale (same root cause as the `draw_clear`/`getChartApi is not defined` flakiness); if a screenshot doesn't show it, re-issue the draw and re-screenshot before proceeding. Also: extend the rectangle's time range FORWARD from the last bar (point = last bar time, point2 = last bar time + a few bars' worth of seconds into the future), not narrowly across just a couple of historical bars — a narrow box gets lost among the chart's many OB/FVG/liquidity indicator zones; a box projecting into open space to the right of price stays clearly visible.
11. `capture_screenshot(region="chart")`
12. Generate branded HTML signal card with logo, using the rich MTF/scenario template (D1+4H+1H+15M bias tiles, session plan London/NY, lettered scenarios A/B/C with probabilities, fib boxes, leveled price list) — see reference design shared 29.06.2026

**Pine Box color filters for OB/FVG identification:**

- `borderColor=5395199` = blue, active SMC/FVG
- `borderColor=5287756` = green, Bullish OB active
- `bgColor=871585569` = Bullish; `bgColor=2152878847` = Bearish
- LuxAlgo Order Block Detector: `borderColor=1291850239` = Bearish OB; `bgColor=855642623` = Bullish OB

**Draw shape format:** `draw_shape` with `shape: horizontal_line`, point dict with both `price` and `time` (recent bar UTC timestamp from OHLCV), overrides with `linecolor`, `linewidth`, `linestyle` (0=solid, 1=dashed, 2=dotted), `showLabel:true`, `text`, `textcolor`, `fontsize`, `bold`.

**Logo embedding (updated 2026-07-08):** single source `assets/trw_logo.jpg` — the card pipeline (`loadLogoBlock()` in `src/core/card.js`) embeds it automatically as a base64 data URI via the `<LOGO_BLOCK>` template placeholder. Never hardcode the base64 string into a template or card.

## Trade Log & Statistics (mandatory, every analysis)

Zapisuj analizy, wyniki i wnioski w sposób uporządkowany, tak aby statystyka była rzetelna, przejrzysta i możliwa do późniejszego sprawdzenia. Dane mają służyć do oceny skuteczności strategii, porównywania wyników w czasie, wykrywania powtarzalnych schematów oraz identyfikowania elementów, które realnie poprawiają lub pogarszają wyniki. Zapisuj także ważne wątki i kluczowe obserwacje z analiz, aby w przyszłości można było korzystać z tej historii do dalszych analiz i wyciągania wniosków. Priorytetem jest tworzenie wiarygodnej bazy danych do analizy skuteczności, a nie tylko zapisywanie pojedynczych obserwacji.

Practical implementation (updated 2026-07-08 — `trade_log.md` is frozen/archived since 2026-07-04, do not append to it):
- After every analysis/signal, append a structured entry to the live journal files: `journal/signals_log.jsonl` (published/tracked signals) and `journal/results_log.jsonl` (resolved outcomes) — schema in ROUTINES_V2 §14. Do not just print results in chat and let them disappear.
- Each entry should capture at minimum: date/time, symbol, timeframe, setup type (OB/FVG/BOS/CHoCH), entry, SL, TP1/TP2, probability %, actual outcome (hit/missed/pending), RR achieved, and a short note on key observations.
- Periodically (e.g. weekly/EOD) summarize the log: win rate, average RR, which setup types perform best, which conditions (e.g. high-impact news nearby) correlate with losses.
- This log is the source of truth for "Current State" section above — update that section from the log, not from memory.

## Branding

- TRW logo file: store locally at `assets/trw_logo.jpg` (or equivalent local path) in this repo — must be embedded in every generated signal card (base64-encode and inline in the `<img>` tag of the HTML card).
- Logo design reference: gold/dark theme, ICT liquidity-sweep diagram (BSL/SSL, 0.618/0.786/1.272/1.618 fib levels) framing two robot mascots and "TRADING ROOM WORKSHOP" wordmark, Telegram icon at bottom — consistent with the #0d1117/#f5c842 dark/gold signal card theme.

## Tools & Resources

- TradingView Desktop with MCP integration (CDP port 9222, `node server.js`), Premium account
- 23 active indicators (as of 26.06.2026): ICT HTF Candles [CD80WN], Sessions LuxAlgo [S192ep], Live Economic Calendar by toodegrees [eK2iXN + d0z2av] (duplicate — remove one), Order Block Detector LuxAlgo [X95baS], Liquidity Swings + SMC Structures 1:1 [qsMpzd], Smart Money Concepts LuxAlgo [nFg7op], Price Action Concepts RUDYINDICATOR [cktZvX], ICT Pro [JTKtG7], Moving Average Ribbon [bOmFwr], Agg. Cumulative Volume Delta [td2Gn3], Cumulative Tick Volume Wave [yEZVLD], Visible Range Volume Profile [C8cMxY], Volume [u3Y52H], VWMACD [CFfAqd], Stochastic RSI [Fbk5lq], RSI Divergence [dXV5uh], MACD LazyBear [4sKwcJ], MACD+KDJ+TRIX [Y2HS2H], Choppiness Index [vee0Ec], Harmonic Patterns [hHJAjS], All Chart Patterns [XKT7SS], Parabolic SAR [hoymLR]
- Signal card outputs: `screenshots/<group>/` (filled HTML + PNG rendered via `tv card render` / Puppeteer, `src/core/card.js`)
- Logo file: `assets/trw_logo.jpg` (single source, embedded by the card pipeline)
- Metricgram — Telegram group analytics/management (no public API; Telegram Bot API used for signal automation)
- ForexFactory — cross-reference for Economic Calendar event names

## Change Log

- 2026-06-29 — Initial import from chat project memory into this repo, to make context persistent across local Claude Code Desktop sessions and Routines. Next: build Telegram Bot API automation + daily scheduler (London 07:45 UTC, NY 13:15 UTC briefings + EOD review).
