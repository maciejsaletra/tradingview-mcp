# Project Context — Trading Room Workshop (TRW)

Magic runs a trading education and signals community called Trading Room Workshop (TRW) and uses Claude as a daily autonomous trading analyst integrated with TradingView Desktop via MCP. The primary output is professional ICT/SMC analysis with branded signal cards published to the TRW Telegram group. Magic communicates efficiently, often in Polish, and is deeply fluent in ICT/SMC terminology — Claude should not explain basic concepts.

## Methodology

ICT/SMC (Smart Money Concepts) — Order Blocks (OB), Fair Value Gaps (FVG), Break of Structure (BOS), Change of Character (CHoCH), liquidity sweeps, BSL/SSL, premium/discount zones. Fibonacci levels 0.618 (entry/confluence) and 1.618 (primary TP) are mandatory focal points in every analysis — always explicitly marked in signal cards.

**Core watchlist:** XAUUSD (primary), XAGUSD, BTCUSDT, EURUSD, USDJPY, TVC:DXY (macro filter), DJ30, NAS100, LMT, RTX, VIX, NIKKEI.

**Signal card standards:** Dark theme (#0d1117 background, #f5c842 gold accent), TRW logo embedded via base64 from `/mnt/user-data/outputs/trading_room_workshop_logo.jpg`. Only setups ≥70% probability presented. No Python code visible in output — deliver finished HTML only.

## Current State (reference snapshot — update each session)

- LMT LONG open at 505.00, TP1=515 (previously hit during session per trade log — confirm current status at session open).
- EOD 25.06.2026 summary (reference baseline): XAU closed ~4031 (+38$). SHORT 4018–4028 → TP1 3999 ✅ (+1.9RR). LONG 3999–4003 → TP2 4034 ✅ (+2.1RR). XAGUSD SHORT TP1 hit ✅. Net daily RR: +5.2. DXY ~101.40 ↓.
- Bias for 26.06.2026: Neutral→bearish. Key resistance: 4042–4060. Key support: 3999–4003 and 3959–3975. VIX ~19.13 rising.
- Friday protocol active (when applicable): Reduced position sizing, earlier profit-taking, hard stop on new entries by 16:30 UTC, full closure by 19:30 UTC.
- Live Economic Calendar duplicate: Two instances of "Live Economic Calendar by toodegrees" on chart — Magic to remove one.

## On the Horizon

- Telegram Bot API integration for automated signal posting (including screenshots) — Magic already has a BotFather token.
- Scheduler for automatic pre-session briefings (London 07:45 UTC, NY 13:15 UTC).
- EOD review workflow: use ready-to-paste prompt in a new thread within the same project (not a new project).

## Key Learnings & Principles

- All entries must be pending/future setups only — never generate a setup that would require an entry at a past price.
- `draw_clear` is unreliable after TradingView restart — always instruct Magic to press Alt+T to clear drawings manually before drawing new levels.
- LuxAlgo/SMC indicators must be visible (not hidden) — if Pine Boxes return no data, first check indicator visibility settings.
- Economic Calendar limitation: `data_get_pine_labels` with `study_filter="Economic Calendar"` returns only graphical symbols (●◯◐◑◓), not event names. This is a toodegrees indicator limitation, not an API issue. Decode via textColor: `4282117119`=red HIGH IMPACT (no entry ±15 min, mark NO TRADE ZONE in card), `4278229247`=blue MEDIUM, `4283585279`=yellow LOW. Clustered symbols at same x-position = news cluster. Map x-position to timestamp via OHLCV bar index; cross-reference forexfactory.com for event names.
- ICT Pro indicator (ID: JTKtG7): Query `data_get_pine_labels` to extract BOS/CHoCH labels with exact price values — always do this before generating setups to identify most recent structural break.
- Batch multi-symbol/multi-timeframe MCP calls fail — run sequentially.
- DXY accessed via `quote_get` for symbol `TVC:DXY` (added to watchlist); previously proxied through EURUSD/USDJPY.
- `summary:False` for M5/M15 precision; `summary:True` for H4/D context.

## Approach & Patterns

**Mandatory analysis sequence (every XAUUSD/watchlist analysis from 26.06.2026 onward):**

1. `watchlist_get` — DXY, VIX, all instruments, macro context
2. `chart_set_symbol` + `chart_set_timeframe` (H1, then M15)
3. `data_get_ohlcv(count=60)`
4. `data_get_pine_boxes(verbose=True)` — OB zones (active/inactive, exact boundaries)
5. `data_get_pine_labels(max_labels=200)` — ICT Pro BOS/CHoCH, SMC FVG tags, Sessions ranges, Economic Calendar events (decode colors per above)
6. `data_get_pine_lines()` — SMC level lines + OB
7. `data_get_study_values()` — MA Ribbon direction + Sessions values
8. `draw_clear` instruction (Alt+T for Magic) + `draw_shape` for key levels
9. `capture_screenshot(region="chart")`
10. Generate branded HTML signal card with logo

**Pine Box color filters for OB/FVG identification:**

- `borderColor=5395199` = blue, active SMC/FVG
- `borderColor=5287756` = green, Bullish OB active
- `bgColor=871585569` = Bullish; `bgColor=2152878847` = Bearish
- LuxAlgo Order Block Detector: `borderColor=1291850239` = Bearish OB; `bgColor=855642623` = Bullish OB

**Draw shape format:** `draw_shape` with `shape: horizontal_line`, point dict with both `price` and `time` (recent bar UTC timestamp from OHLCV), overrides with `linecolor`, `linewidth`, `linestyle` (0=solid, 1=dashed, 2=dotted), `showLabel:true`, `text`, `textcolor`, `fontsize`, `bold`.

**Logo embedding:** `base64 -w 0 /mnt/user-data/outputs/trading_room_workshop_logo.jpg > /tmp/logo_b64.txt` → embed as `data:image/jpeg;base64,[string]` in `<img>` tag in HTML card.

## Tools & Resources

- TradingView Desktop with MCP integration (CDP port 9222, `node server.js`), Premium account
- 23 active indicators (as of 26.06.2026): ICT HTF Candles [CD80WN], Sessions LuxAlgo [S192ep], Live Economic Calendar by toodegrees [eK2iXN + d0z2av] (duplicate — remove one), Order Block Detector LuxAlgo [X95baS], Liquidity Swings + SMC Structures 1:1 [qsMpzd], Smart Money Concepts LuxAlgo [nFg7op], Price Action Concepts RUDYINDICATOR [cktZvX], ICT Pro [JTKtG7], Moving Average Ribbon [bOmFwr], Agg. Cumulative Volume Delta [td2Gn3], Cumulative Tick Volume Wave [yEZVLD], Visible Range Volume Profile [C8cMxY], Volume [u3Y52H], VWMACD [CFfAqd], Stochastic RSI [Fbk5lq], RSI Divergence [dXV5uh], MACD LazyBear [4sKwcJ], MACD+KDJ+TRIX [Y2HS2H], Choppiness Index [vee0Ec], Harmonic Patterns [hHJAjS], All Chart Patterns [XKT7SS], Parabolic SAR [hoymLR]
- Signal card outputs: `/mnt/user-data/outputs/` (HTML files via bash_tool Python, presented via present_files)
- Logo file: `/mnt/user-data/outputs/trading_room_workshop_logo.jpg` (also cached at `/tmp/logo_b64.txt`)
- Metricgram — Telegram group analytics/management (no public API; Telegram Bot API used for signal automation)
- ForexFactory — cross-reference for Economic Calendar event names

## Change Log

- 2026-06-29 — Initial import from chat project memory into this repo, to make context persistent across local Claude Code Desktop sessions and Routines. Next: build Telegram Bot API automation + daily scheduler (London 07:45 UTC, NY 13:15 UTC briefings + EOD review).
