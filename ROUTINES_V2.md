# TRW Routine Architecture v2 — Master Playbook

**Status:** LIVE (replaces `ROUTINES.md` v1 and the 7 orphaned `trw-briefing-*`/`trw-eod-2150` scheduled tasks, which were never actually registered in the scheduler and are archived-only reference).
**Source of truth for:** schedule, watchlists, operational sequence, confidence model, risk engine, journal schema. Every scheduled task's SKILL.md is short and points here for the full logic — don't duplicate this content into each task prompt.
**Strategy/indicators/branding:** still `PROJECT_CONTEXT.md` (unchanged, not duplicated here).

---

## 1. Core principles

1. XAU (XAUUSD) is the primary instrument — **full technical analysis every single routine run, no exceptions**, even on a run where no new setup ends up published.
2. Every instrument in that run's watchlist must be actively re-scanned each run. Skipping the *analysis* of an instrument is never allowed — choosing not to *publish* a setup for it is fine and often correct (§1.9 below).
3. TRW watchlist supplies the top setups of the day; TRW_CRYPTO is weekend-only.
4. Every signal must be fresh, auditable, and logged — no exceptions.
5. Trader journal (structured, `journal/`) is mandatory every run.
6. Daily and weekly summaries are mandatory (weekday 22:00 close, Sunday 20:00 weekly).
7. Never rebuild infrastructure that already exists — MCP/CLI/Telegram/logo/card template/strategy are source of truth in `PROJECT_CONTEXT.md` and `context/*.md` pointers.
8. Any setup still active/carried over from a prior session must be re-checked and its current status reported every run — see §7 step 2. Don't let an open position go quiet just because it isn't new.
9. **(superseded 2026-07-18 by the 3+1 guarantee, §7 krok 8c Krok 5)** The session ALWAYS returns exactly 3 TOP 3 setups + 1 XAU setup, using the confidence-degradation ladder (60→50→40→30) when needed. "Silence" is no longer an acceptable output for the guaranteed slots — low quality is disclosed via the explicit guarantee label, never via a missing row.
10. A worse-but-safe stat is better than an inflated one. Confidence is a checklist score, not a vibe.

---

## 2. Schedule (UK local time — cron runs in local time directly, no UTC math)

### Weekday (Mon–Fri)
| Time | Task ID | Session |
|---|---|---|
| 01:30 | `trw2-asia` | Asia routine |
| 08:30 | `trw2-london` | London routine |
| 15:00 | `trw2-newyork` | New York routine |
| 18:00 | `trw2-ny2` | NY2 check |
| 22:00 | `trw2-daily-close` | Daily close + daily summary + daily journal |

### Weekend (crypto only)
| Time | Task ID | Session |
|---|---|---|
| Sat 02:30 | `trw2-crypto-sat-am` | Crypto routine |
| Sat 14:00 | `trw2-crypto-sat-mid` | Crypto routine |
| Sat 20:00 | `trw2-crypto-sat-pm` | Crypto routine |
| Sun 02:30 | `trw2-crypto-sun-am` | Crypto routine |
| Sun 14:00 | `trw2-crypto-sun-mid` | Crypto routine |
| Sun 20:00 | `trw2-weekly-review` | Weekly preview + deep analysis + weekly summary + weekly journal |

---

## 3. Watchlists

**TRW** (weekday): GOLD (XAUUSD), SILVER (XAGUSD), EURUSD, NASDAQ (NAS100), UK100, GER40, NIKKEI (JP225), SP500, DJ30, USDJPY, UKOIL, DXY (TVC:DXY, context only), VIX (TVC:VIX, context only).

**TRW_CRYPTO** (weekend only): BTCUSDT, ETHUSDT, XRPUSDT, SOLUSDT, DOGEUSDT.

Telegram topic routing (unchanged from existing `.env`/`config.js` mapping):
XAUUSD→`xau` · EURUSD/USDJPY/XAGUSD→`waluty` · SP500/DJ30/NAS100/GER40/JP225/UK100/UKOIL→`indeksy` · BTCUSDT/ETHUSDT/XRPUSDT/SOLUSDT/DOGEUSDT→`krypto`.

**Daily/weekly summary routing rule (strict):** any daily-close output (`trw2-daily-close`) and any weekly-review output (`trw2-weekly-review`'s Duty B) — the EOD/weekly card, and any text recap, preview, or narrative about how the day/week went — always goes to `wyniki` (**WYNIKI/STATYSTYKI** topic), never to `krypto`/`xau`/`waluty`/`indeksy`. This applies even during the Sunday weekly-review run, which also does a crypto deep-analysis duty (Duty A) — Duty A's Telegram send to `krypto` is allowed ONLY for genuinely new tradeable setups (with entry/SL/TP), never for a "weekly preview" summary/outlook text. If Duty A has no new setup to publish, it sends nothing to `krypto` that run — the week/day narrative belongs exclusively in the `wyniki`-routed card.

---

## 4. Timeframes

- **Session start (every routine):** 4H, then 1D — establish HTF context first.
- **Sunday 20:00 weekly:** 4H, 1D, 1W.

**Obowiązująca struktura TF (2026-07-17) — dotyczy wszystkich sekcji dokumentu:**

| Strumień | Bias/kontekst | Impuls/OTE | Trigger wejścia | Uwagi |
|---|---|---|---|---|
| **Day trading** (XAU + TOP3) | H1 (lub M30 fallback gdy H1 bez jasnych kotwic) | **M15** — swing M15, Fibo 0.618–0.786 (rozszerzone 0.5 przy wysokim wolumenie) | **M5** — BOS M5 / CHoCH M15 / engulfing | OTE liczone z M15, nie M30 |
| **Swing** (routing §7d + RSI §7c) | D1 (makro/bias) | **H4** — struktura, BOS/CHoCH, harmoniczne, RSI | **H4** — zamknięcie świecy H4 jako potwierdzenie | RSI liczony na H4, interpretowany jako sygnał swing |

Use `ICT HTF Candles (fadi) [CD80WN]` to read D1/4H overlay without a full timeframe switch, then confirm with an explicit `chart_set_timeframe` pass (per existing `PROJECT_CONTEXT.md` note).

---

## 5. Session context rules

- **Asia:** JPY context + DXY + VIX + news.
- **London:** EUR/GBP context + DXY + VIX + news.
- **New York:** USD context + DXY + VIX + news + data releases/volatility expansion.
- **Weekend crypto:** DXY + VIX + crypto-specific context (thin weekend liquidity — discount session quality if the move looks thin/random).

---

## 6. Krok 0 — Makro & news review (mandatory, first action of every routine run)

Execute before any setup selection, carry-over check, or chart analysis. Label this explicitly as "KROK 0" in every handoff and daily_journal entry.

### 6.1 News check — two mandatory passes per run

**Pass A — upcoming events (scheduled for this session window):**
Run `node src/cli/index.js calendar today --impact High` (ForexFactory CLI, secondary) + WebSearch/WebFetch forexfactory.com and investing.com for primary source. Identify all High Impact events scheduled in the current session window (+next 3h). For each: time (UK), currency/region, name, expected impact on correlated instruments.

**Pass B — already-published events (actual vs forecast):**
For any High Impact event that published in the last 2h: check actual vs forecast. If actual significantly deviated from forecast, assess: was there a vol spike? Has the reaction completed (price returned to structure) or is it still in the first-candle reactive phase (OBSERVE ONLY per first-candle rule)? This determines whether post-news re-entry candidates are valid or still in the observation window.

(`WebSearch`/`WebFetch` run in the Claude Code agent process, not the sandboxed TradingView MCP subprocess — the MCP server has no internet access, see `context/telegram_config_notes.md`.)

### 6.2 NO-ENTRY window

**Hard NO-ENTRY window: from 5 minutes BEFORE to 25 minutes AFTER each High Impact publication** for instruments correlated to that event's currency/region.

- BEFORE publication (−5 min): spreads widen, fake moves possible — do not generate or publish a new setup.
- AFTER publication (first 25 min): first-candle rule in force — OBSERVE ONLY, wait for the first completed retracement structure (LTF pullback with clear CHoCH/BOS).
- **Active setups published prior to the window are NOT cancelled.** SL and TP remain in force. Mark in handoff: "aktywny podczas okna newsowego — podwyższone ryzyko."
- Note the window times explicitly in the session card (§7 step 14a).

*Replaces the prior "25 min before / 30 min after" rule. Rationale: 25-minute pre-event ban cut into legitimate pre-news structure; the 25-min post-event observation window is sufficient given the first-candle rule.*

### 6.3 DXY, VIX, macro context

1. `quote_get` after `chart_set_symbol("TVC:DXY")` — read trend, compare to yesterday close.
2. `quote_get` after `chart_set_symbol("TVC:VIX")` — assess fear level.
3. WebSearch/WebFetch investing.com for any material geopolitical development affecting gold/indices/FX/crypto.

Assess: direction bias, volatility regime, session quality, confidence adjustments, NO-ENTRY times.

**Macro conflict rule:** if DXY/VIX/news clearly oppose the technical direction → `macro_conflict: true`, lower confidence, prefer no signal. Mark in handoff.

### 6.4 Krok 0 output (mandatory fields for every run)

Before leaving Krok 0, record explicitly (in handoff and daily_journal):
- List of High Impact events today (time UK, name, currency) — empty list is a valid answer, write it.
- NO-ENTRY windows with exact times (e.g. "14:25–15:15 UK: US Retail Sales → affects USD, XAUUSD, NAS100, SP500, DJ30").
- Upcoming events this session: Y/N with times.
- Published events this session: Y/N with actual-vs-forecast note.
- DXY: direction + level. VIX: level + regime (calm/elevated/fear).
- macro_conflict: true/false.

---

## 7. Operational sequence (every routine run)

1. Read `memory/handoff_latest.md` and `memory/active_setups.json`.
2. **Carry-over status check (mandatory, every run, no exceptions):** for every entry already in `memory/active_setups.json`, `chart_set_symbol` and check status vs entry/SL/TP1/TP2/TP3. **Both states require an intrabar bar-walk, not just a live quote** — pull `data_get_ohlcv` covering the period since `last_checked_at` (M5 for tight levels, M15 otherwise; if the gap since `last_checked_at` exceeds ~40h of traded time, use M15 so the 500-bar cap still covers the whole window) and walk the bars chronologically:
   - **Not-yet-triggered setup:** first check whether any bar touched the entry zone. If never touched, a fresh `quote_get` completes the status (and if price has gapped *past* the zone without touching it, mark `missed`/`expired`). If a bar DID touch the zone, the setup activated between runs — continue the walk from that bar for SL/TP touches exactly like a triggered setup. A live quote back outside the zone looks identical to "never entered"; only the bar-walk distinguishes them.
   - **Triggered/active setup:** walk bars for SL/TP touches (this exact failure happened with sig-084: SL swept intrabar in an 11.5h gap, price recovered, live quote looked fine). Only if no bar touched any level is the setup still genuinely active.
   - **Ambiguous bar convention (accounting rule, fixed):** if a single bar touches both SL and a TP level, count it as **SL hit** and record `ambiguous_bar: true` in the results_log entry. Deliberately conservative — it offsets the opposite optimistic bias of gap-through-SL being logged at exactly -1.0R. Classify each as one of: `not yet triggered — waiting in zone`, `triggered — running toward TP1 (~X% of the way, or X price-units away)`, `triggered — near SL (flag for tight monitoring)`, or resolved.
   - **Krok 2b — Scenario SL/TP update [added 2026-07-07]:** after confirming the setup is still active (no SL/TP touch), check whether any defined scenario trigger has fired. Only runs if `setup.scenarios` is present and non-empty. Process scenarios in priority order A → B → C:
     1. Skip scenario if `flags.applied = true` or `flags.disabled = true` or `trigger = null` (informational-only).
     2. Pull OHLCV for the trigger's `timeframe` if not already loaded — reuse bar-walk window (`last_checked_at` → now).
     3. Evaluate trigger type against bar data (chronological walk):
        - `close_above level` — any bar.close > level in window
        - `close_below level` — any bar.close < level
        - `high_above level` — any bar.high > level (intrabar touch)
        - `low_below level` — any bar.low < level
        - `zone_reclaim zone_low zone_high` — bar.low < zone_low appears, then later bar.close > zone_high
        - If `precondition` is defined: precondition bar must precede the main trigger bar chronologically (e.g., "price dipped to zone first, then closed above").
     4. **If trigger FIRED:**
        - Validate SL update safety (if `sl_update` defined): LONG: `new_sl > setup.sl` (reduces risk) AND `new_sl < entry_lower`; SHORT: `new_sl < setup.sl` AND `new_sl > entry_upper`. If validation fails → skip SL update, log warning note in handoff, continue.
        - Apply to `memory/active_setups.json`: `sl = sl_update.value` (if valid); `tp1/tp2 = tp_updates.tp1/tp2` (if defined); `scenarios.X.flags.applied = true`; `sl_updated = true`; `sl_update_reason = "scenario_X"`; `sl_update_at = ISO timestamp`; set `flags.disabled = true` on all scenario IDs listed in `flags.mutually_exclusive_with`.
        - Append to `journal/signals_log.jsonl`: `{ "type": "sl_tp_update", "setup_id": "...", "scenario": "a", "old_sl": X, "new_sl": Y, "trigger_timeframe": "H1", "trigger_bar_time": ISO_of_first_triggering_bar, "updated_at": ISO_now }`.
        - Card generation (step 4 below) reads the already-updated `setup.sl` — no extra logic needed in the card step. If `sl_update_at` is set, also set `SL_UPDATE_BADGE` placeholder to `↑ scen. A` (or B/C); else empty string.
     5. **If trigger NOT FIRED:** no changes. Proceed to next scenario.
     6. After all scenarios: proceed to card generation with the (possibly updated) levels.
   - **Publiczny status = karta graficzna (locked 2026-07-06):** every still-open carry-over setup gets a **graphic status card** (`context/carryover_card_template.html`, render `card render --width 800`) in this session's Telegram output, before any new setups — never a bare text block for subscribers (full text goes to the journal instead). Per-card workflow: (1) bar-walk as above; (2) build the **TF structure block in Polish** — `D1:` trend + % zmiany od początku tygodnia, `H4:` trend + % od wczoraj/poprzedniej sesji, `H1:` struktura intraday (trend/range/CHoCH/BOS), `M15:` lokalny order flow przy setupie (pullback/range/sweep/CHoCH) — computed from real OHLCV (`data_get_ohlcv` on D/240/60/15), never invented; (3) **Screenshot — carry-over card standard (M15, updated 2026-07-07):** Standard TF for all carry-over screenshots = **M15 for every instrument** (XAU, DJ30, indices — no exceptions). M5 scalp screenshots stay on M5. H1 is the setup analysis timeframe but the carry-over card screenshot always uses M15. Sequence in order, do not reorder: (a) `chart_set_timeframe("15")` — switch to M15 *before* any reset or draw; (b) `ui_keyboard` key `"r"` modifiers `["alt"]` — Auto (fits data to screen): resets both time axis and price axis to fit all loaded bars; fixes broken/compressed candle rendering caused when `chart_set_visible_range` receives a `to` timestamp beyond the last loaded bar (confirmed bug trw2-ny2 2026-07-06); (c) `draw_shape` ENTRY box (rectangle) + SL + TP1–TP3 (horizontal_line) — draw AFTER Alt+R, not before; (d) **verify before capture** — check logically: (i) are ENTRY, SL, TP1 (and TP2/TP3 if defined) within the currently visible price range? (ii) is the ENTRY box clear of the right chart edge with at least a few bars of breathing room? (iii) are there ≥10–15 bars of context to the left of entry? If any check fails → widen time range: call `chart_set_visible_range` with an earlier `from` (e.g. 2× the setup age back from `created_at`), then repeat Alt+R to refit, and re-verify before proceeding; (e) `chart_set_visible_range` with `from` = unix timestamp of the setup's `created_at` and `to` = unix timestamp of the **last bar** from the OHLCV call in step (1) — **never use a future or guessed `to` timestamp**; if unsure about any timestamp, skip this step entirely (Alt+R is sufficient); (f) `capture_screenshot region=chart` — prefer a real TradingView screenshot; **all levels (ENTRY box, SL, TP1/TP2) must be visible in frame (rule 2026-07-08 — "accept the gap" retired)**. If a far TP lies beyond the price range of the loaded bars (TradingView auto-fit can never include it — e.g. legacy-071: TP2 4259 vs 300-bar M15 max 4202), use the **`tv chart-render` fallback** instead: `tv ohlcv --count 120` → save the `bars` array to JSON (via Bash, not a PowerShell pipe — BOM corrupts the JSON) → `tv chart-render --data <bars.json> --entry-low --entry-high --sl --tp1 --tp2 --symbol <SYM> --tf 15 --out <m15_standard path>` — custom canvas render with the price scale extended to include every level (yellow ENTRY ZONE box with in-box label, red dashed SL, green TP1/TP2 with axis labels); record `"render_engine": "chart-render"` in the companion meta.json; (g) **Rename** the returned PNG to `screenshots/<group>/<id>_m15_standard_<YYYY-MM-DD>_<HHMM>.png` — this exact naming is **mandatory**: `card fill-carryover` refuses any screenshot without `m15_standard` in the filename (enforces TF discipline — H1 screenshots cannot accidentally replace M15 ones); (h) **Write companion meta.json** at the same path with `_meta.json` suffix: `{ "setup_id": "<id>", "screenshot_type": "m15_standard", "timeframe": "15", "has_entry_box": true, "has_sl_line": true, "has_tp_lines": true, "auto_fit": true, "captured_at": "<ISO>" }` — if entry_box/sl_line/tp_lines were NOT drawn before capture, set the corresponding field to `false` (card will show INCOMPLETE banner); (i) **Update `memory/active_setups.json`**: set `setup.screenshot_m15_path = "screenshots/<group>/<id>_m15_standard_<YYYY-MM-DD>_<HHMM>.png"` (relative path). **H1 screenshots must never be stored in `screenshot_m15_path`** — H1 is the analysis timeframe, not the card screenshot timeframe; (4) fill and render: `tv card fill-carryover --id <id> --out screenshots/<group>/<id>_card.png --headline "..." --tf-d1 "..." --tf-h4 "..." --tf-h1 "..." --tf-m15 "..." --barwalk "..." --news-risk <none|low|high> --news-ctx "..."` — reads `screenshot_m15_path` from JSON, validates via `_meta.json` (TF=15, entry_box, sl, tp); if validation fails → INCOMPLETE banner in card, do NOT bypass — fix the screenshot first; legacy fallback if signals_log entry has (e.g. "LONG nadal aktywny, brak dotknięcia SL/TP"), one-sentence bar-walk summary (TF, ostatnie high/low vs SL/TP, touch/no-touch), transaction levels, and the four system fields `setup_type`/`rr_planned`/`news_risk`/`news_context` (pull from the setup's `signals_log.jsonl` entry; news fields re-checked this run; **legacy fallback:** if the signals_log entry has these as `null` — legacy migration rows — classify `setup_type` from the pattern (sweep-reversal→A, continuation→B) and compute `rr_planned` to TP1 (`(TP1−entry_mid)/(entry_mid−SL)`, full-exit-at-TP1 convention §16) on the fly for the card; do NOT rewrite the historical JSONL line); (5) render, send to the instrument's topic, `draw_clear`. All card text in Polish. If there's genuinely nothing carried over, skip silently (no need to announce "no active setups").
   - **Screenshot example — carry-over card (M15 reference, 2026-07-07):** XAUUSD 15m, ~3 days in frame (03–07 Jul), ~34 bars of left context, ENTRY box (4146.73–4163.06, yellow), SL (4098, red dash), TP1 (4221, green dash), TP2 (4259, green dash) all visible in the vertical price range, ENTRY box ≥5 bars clear of the right chart edge. Auto fit active (no compressed candles). Ticker + session readable in topbar. If SL or a far TP cannot fit in a TradingView capture, do NOT accept the gap — switch to the `tv chart-render` fallback (step (f) above) so every level is visible (rule 2026-07-08). This example is the visual reference standard for all carry-over card screenshots.
   - **Every still-open setup gets its `memory/active_setups.json` entry updated this run** (`last_checked_at`, status note) — the *only* exception is a setup that has actually hit SL or TP. In that one case, don't just "update" it: remove it from `active_setups.json` entirely and log the real outcome as a new line in `journal/results_log.jsonl` (per lifecycle, §12). Never leave a resolved setup sitting in `active_setups.json` marked as still active, and never skip updating one that's still genuinely open.
3. Read the last `journal/daily_journal.md` entry (and `journal/weekly_review.md` if Sunday).
4. Read `context/strategy_reference.md` → `PROJECT_CONTEXT.md` for strategy/indicators/assets.
5. **Krok 0 — Makro/news/DXY/VIX review** (§6) — execute fully before any chart analysis.
6. Establish HTF context for the full watchlist (4H/1D, +1W on Sunday).
6.5. **M5 Scalp "na dzień dobry" [optional, session-open only]** — run this block only when ALL 5 prerequisites pass; otherwise skip silently (no journal entry needed for a clean skip).
   **Timeframe structure for this module only** (does NOT affect day-trading H1/M15/M5 or swing D1/H4 in other sections):
   - **M15** = short-term bias / context frame — replaces former D1+H4+H1 alignment. Check direction of the last M15 impulse (BOS/CHoCH) and price relation to the reference range.
   - **M5** = structure identification — BOS/CHoCH after sweep, OB/FVG on pullback.
   - **M3** = entry trigger (precision timing) — BOS on M3 or engulfing candle in the M5 OB/FVG zone.
   - **M30** = optional bonus filter only — if a fresh M30 swing high/low or confirmed OB is visible, add +3–5 confidence pts. Absence of M30 structure does NOT block the trade.

   **Prerequisites:**
   - **P1 — session window:** London 08:30–09:30 UK **or** NY **14:25–15:15 UK** only (extended from 15:00 — late-window entry allowed 15:00–15:15 UK jeśli trigger identyfikowany przed 15:00; szczegóły w E7 pkt 10). Asia does not qualify.
   - **P2 — news buffer:** no high-impact event within ±25 min of now (same rule as §6).
   - **P3 — M15 bias confirmed:** M15 BOS/CHoCH after the session-open sweep, pointing in the sweep-reversal direction; `macro_conflict = false` from §6. (D1/H4/H1 alignment is NOT required for scalps — they operate on a 30–60 min horizon where HTF bias is too slow and often stale.)
   - **P4 — open risk headroom:** triggered carry-over risk (from step 2) < 1.0% equity — leaves room for the 0.5% scalp unit (total cap 1.5%).
   - **P5 — slot free:** no entry in `memory/active_setups.json` with `lifecycle: "scalp"` from this same session window.

   **Execution sequence (only if P1–P5 all pass):**
     1. `chart_set_symbol` → primary instrument (XAUUSD on London; top watchlist pick on NY). Pull reference range: London → Asian high/low (`data_get_ohlcv` M5 window 01:00–08:00 UK); NY → London high/low (M5 window 08:00–14:00 UK).
     2. **Sweep check (M15/M5):** did any bar after 08:15/14:15 UK breach the reference range high or low? NO → stop. YES → continue.
     3. **M15 BOS/CHoCH:** after the sweep, is there a confirmed M15 structural break back in the reversal direction? NO → stop. YES → continue. (`chart_set_timeframe("15")`, `data_get_ohlcv count:30`)
     4. **M5 structure:** `chart_set_timeframe("5")`. Find OB or FVG M5 on the pullback. Pullback depth ≤ 50% of the post-CHoCH impulse? NO → stop (structure too weak). YES → continue.
     5. **M3 trigger (nie wcześniej niż T+5 min od otwarcia okna):** `chart_set_timeframe("3")`. Wait for / confirm BOS on M3 or engulfing candle inside the M5 OB/FVG zone. **Fallback:** jeśli brak czystego M3 sygnału po 3 świecach M3 od uformowania OB/FVG → użyj M5 close jako triggera fallback (SL za M5 extreme + 0.1% bufor zamiast M3 extreme); zapisz `trigger_type: "m5_fallback"` w signals_log. Brak obu triggerów → stop.
     6. **(Optional) M30 bonus:** `chart_set_timeframe("30")`. If a fresh M30 swing high/low or confirmed OB aligns with the setup direction → add +3–5 pts to confidence. Skip if M30 shows no clear structure — it does not block.
     7. Compute ENTRY (limit at M5 OB/FVG mid, confirmed by M3 trigger) / SL (beyond sweep extreme + 0.1% buffer) / TP1 (nearest M5 imbalance, min **2.0R**) / TP2 (session reference high/low, min 2.5R). If TP1 < 2.0R → stop.
     8. Score confidence (§8). Minimum threshold: **65**. Confidence < 65 → stop. **Routing do swing (2026-07-17):** NIE przez wysokość confidence — przez `structural_significance`. Oceń czy wykryto strukturalne cechy swing (D1/H4 BOS, harmoniczny pattern H4/D1, RSI H4 <25, sweep D1 z rejection) — jeśli tak → `structural_significance: true` → route to §7d swing, nie do scalp execution. Dobry scalp z wysokim confidence (np. 78) pozostaje scalpem jeśli `structural_significance: false`. Scalp moduł domyślnie ustawia `structural_significance: false` (D1/H4 nie są tu sprawdzane).
     9. Signal Risk Engine (§9): `setup_type` forced = `"A"` (sweep-reversal only — continuation/Setup B is banned for scalps). `risk_pct = 0.5` (uniform from 2026-07-17).
     10. Screenshot per §11 + 2026-07-07 reset rule: switch to M5 for the screenshot (`chart_set_timeframe("5")`), `ui_keyboard Alt+R` → `draw_shape` ENTRY box + SL + TP1 + TP2 → `chart_set_visible_range` (sweep bar → last OHLCV bar, real timestamps only) → `capture_screenshot`.
     11. Append to `journal/signals_log.jsonl` with extra fields: `"lifecycle": "scalp"`, `"session_close_by": "12:00 UK"` (London) or `"18:00 UK"` (NY), `"risk_pct": 0.5`, `"trigger_type": "m3"|"m5_fallback"`, `"structural_significance": false`, `"late_window_entry": true|false`.
     12. Add entry to `memory/active_setups.json` with same fields as above.
     13. Send via Bash CLI → instrument's Telegram topic. Caption must include the four v2 fields + tag `"⚡ SCALP · zamknięcie do [HH:MM] UK"`.
   - **Session-close enforcement (carry-over runs):** any entry with `lifecycle: "scalp"` whose `session_close_by` has passed must be resolved at the current price in the next routine's bar-walk — treat it as a time-expired close regardless of P&L. Log to `results_log.jsonl` with `exit_reason: "scalp_session_deadline"`. Never carry a scalp through a session boundary.
   - **Monitoring aktywnych scalpów (2026-07-17):** jeśli aktywny scalp jest w `active_setups.json` i przerwa od `last_checked_at` > 10 min → wykonaj lightweight check: `quote_get` → porównaj z SL, TP1, `session_close_by`. Jeśli hit → rozwiąż i zaloguj. Nie czekaj na pełną rutynę do wykrycia zakończenia scalpa.
7. **XAU STREAM (zawsze pierwszy, osobny od reszty watchlisty):**
   a. `chart_set_symbol("XAUUSD")` → pełna analiza D1/H4 (bias makro), H1 lub M30 fallback (bias struktury/BOS/CHoCH), M15 (impuls + OTE), M5 (trigger wejścia).
   b. Metoda 1: formalny confidence §8 + OTE (0.618–0.786, lub 0.5 przy wysokim wolumenie §7b E3).
   c. Metoda 2: confluence multi-element — `data_get_pine_boxes` (liquidity zones), `data_get_ohlcv` summary, Fib levels (0.618 entry / 1.272 TP1 / 1.618 TP2), DXY correlation (from Krok 0), BOS/CHoCH direction.
   d. Freshness Check 1 przy generowaniu (§10): entry box musi być PRZED aktualną ceną, nie „w trakcie", nie wsteczny.
   e. Wynik XAU — **GWARANCJA 1 SETUP KAŻDA SESJA (2026-07-18):**
      - Jeśli setup świeży + confidence ≥60 + poza oknem NO-ENTRY → kandydat XAU → temat `xau`.
      - Jeśli brak setupu ≥60 → zastosuj degradację confidence 60→50→40→30 (mechanizm identyczny jak §7 krok 8c Krok 5a-b), wyłącznie na H1/M15/M5. Przy braku struktury nawet na 30 → najbliższy dostępny swing H1 z etykietą `Niska jakość — publikacja z tytułu gwarancji sesyjnej (confidence: [wartość])`. XAU zawsze ma dokładnie 1 setup z kompletnymi Entry/SL/TP1 na karcie sesji.
      - Jedyny przypadek odroczenia: aktywne okno NO-ENTRY w momencie publikacji → opublikuj setup natychmiast po końcu okna (w tej samej sesji), z adnotacją czasu.
   f. XAU nie wlicza się do puli TOP 3 (§9 cap).
   g. Sprawdź RSI H4 XAUUSD (§7c) — osobny trigger swing, niezależny od powyższego setupu intraday.
8. **TOP 3 WATCHLIST (bez złota):**
   Po zakończeniu XAU stream, przeskanuj pozostałą watchlistę tej sesji: XAGUSD, EURUSD, USDJPY, NAS100, UK100, GER40, JP225, SP500, DJ30, UKOIL.
   a. Dla każdego: przelicz confidence Metody 1 (§8) + Freshness Check 1 (§10).
   b. Jeśli setup ma confluence Metody 2 (liquidity zone, Fib, pine boxes) → oznacz „confluence boost" (+5 pts per §7b E3).
   c. **Hierarchia wyboru TOP 3 — 5 kroków (updated 2026-07-17):**

      **Krok 1 — Standardowy skan (H1 bias):** zbierz kandydatów z pełnym H1 BOS/CHoCH + M15 OTE + M5 trigger + confidence ≥60 + poza NO-ENTRY + Freshness Check 1 ✓. Etykieta: `TOP 3 standardowy (H1, confidence ≥60)`.

      **Krok 2 — Komplet:** jeśli ≥3 kandydatów → wybierz 3 najwyższe confidence i zakończ. Przejdź do kroku d.

      **Krok 3 — Gwarancja sesyjna (obniżony confidence):** jeśli <3 kandydatów po kroku 1 → uzupełnij brakujące sloty najlepszymi świeżymi setupami z H1 o confidence <60. Freshness i hard-blocks bezwzględne — bez wyjątku. Etykieta: `TOP 3 — gwarancja sesyjna (confidence <60)`.

      **Krok 4 — Rozszerzenie timeframe (tylko jeśli kroki 1–3 nie dały 3 setupów, WYŁĄCZNIE Strategia A/B):** dla instrumentów, które nie dały wyniku na H1, rozszerz ramę biasu w kolejności:
      - **H4 fallback:** szukaj H4 BOS/CHoCH jako ramy biasu, wejście nadal na M15 OTE + M5 trigger (bez zmiany). Freshness Check 1 i wszystkie hard-blocks (§7b E4) bezwzględne — rozszerzenie ramy nie omija żadnego bloku.
      - **D1 fallback:** jeśli H4 też nie daje wyniku → D1 BOS/CHoCH jako bias, wejście M15/M5 bez zmian. Najwyższy dopuszczalny poziom.
      - Confidence liczony standardowo (§8) — brak automatycznego obniżenia za rozszerzoną ramę. Jeśli wynik <60 → stosuj etykietę gwarancji sesyjnej łącznie.
      - **Strategia C (scalp) NIE podlega temu fallbackowi** — scalp zachowuje sztywny zakres M15/M5/M3/opcjonalnie M30; D1/H4/H1 nie są sprawdzane w module scalp zgodnie z §7b E7.
      - Etykieta: `TOP 3 — rozszerzona rama [H4/D1] (H1 nie dał wyniku)`. Jeśli jednocześnie confidence <60: `TOP 3 — rozszerzona rama [H4/D1], gwarancja sesyjna`.

      **Krok 5 — GWARANCJA 3+1 Z DEGRADACJĄ CONFIDENCE (zastępuje "publikuj tyle ile jest", 2026-07-18 — bez wyjątków):**

      TOP 3 = ZAWSZE dokładnie 3 setupy każda sesja. XAU = ZAWSZE dokładnie 1 setup każda sesja (§7 krok 7e). Próg confidence 60 pozostaje standardem jakości, ale NIE może być powodem zwrócenia mniej niż wymagana liczba setupów.

      - **Krok 5a — degradacja progu:** jeśli po Krokach 1–4 liczba setupów < wymagana → NIE zatrzymuj się. Obniżaj próg confidence stopniowo: **60 → 50 → 40 → 30**, skanując wyłącznie **H1/M15/M5** (bez D1/H4), aż znajdziesz brakującą liczbę setupów z policzalnym Entry/SL/TP.
      - **Krok 5b — ostatnia struktura:** jeśli nawet przy confidence 30 brak strefy OB/FVG lub swinga do OTE → użyj najbliższej dostępnej struktury (nawet starszy swing high/low na H1), z jawną etykietą: `Niska jakość — publikacja z tytułu gwarancji sesyjnej (confidence: [wartość])`.
      - **Krok 5c — zakaz D1/H4 w degradacji:** mechanizm degradacji NIGDY nie sięga po D1/H4 w celu wypełnienia gwarancji liczby — wyłącznie H1/M15/M5. (Rozszerzenie ramy H4/D1 istnieje tylko jako Krok 4, PRZED degradacją, i nie jest jej częścią.)
      - **Krok 5d — karta zawsze pełna:** karta sesji zawsze wyświetla 3 wiersze TOP 3 + 1 wiersz XAU z kompletnymi Entry/SL/TP1 — zero pustych pól, zero "brak setupu", zero "niekompletne".
      - Hard-blocks E4 pozostają w mocy dla gwarancji z JEDNYM wyjątkiem: blok "Low confidence <60" nie stosuje się do slotów gwarancji (zastępuje go drabinka 5a). Freshness, NO-ENTRY window, duplicate, entry-in-zone, SL arbitralny — bezwzględne również dla gwarancji.

   d. Każdy do właściwego tematu Telegram wg routingu §3.
   e. Cap: maks 3 z tej watchlisty per routine (niezależnie od XAU cap).
9. **SWING ROUTING check** — po TOP 3, dla wszystkich instrumentów z watchlisty (włącznie z XAUUSD):
   Sprawdź kryteria §7d (BOS/CHoCH D1 z wolumenem, harmoniczne H4/D1, sweep D1 z rejection, poziomy instytucjonalne). Jeśli który instrument spełnia → publikuj jako setup swing (lifecycle: "swing", oddzielnie od intraday TOP 3). Patrz §7d.
10. Score confidence §8 (dotyczy zarówno XAU stream jak i TOP 3).
11. Run Signal Risk Engine §9 — filtruj kandydatów (XAU cap 2 / TOP 3 cap 3 / swing osobny cap).
11a. Keep only the best setups within the max-exposure caps (§9).
11b. **FRESHNESS CHECK 2 — finalny, tuż przed publikacją** (§10): świeży `quote_get` po każdym `chart_set_symbol`, ponowna weryfikacja każdego poziomu. Jeśli cokolwiek zmieniło się od Freshness Check 1 (cena weszła w strefę, przeszła, lub TP trafiony) → unieważnij lub zaktualizuj, nie publikuj nieświeżego.
12. Write/update setups in `memory/active_setups.json` and append to `journal/signals_log.jsonl`.
13. Clean screenshots (§11): hide indicators/tools not used in this analysis, draw box entry + SL/TP1-3, capture, then restore only what was actually used.
14. **⚠️ SEND-ORDER GATE (added 2026-07-17 after 2 consecutive violations — trw2-newyork and trw2-ny2 both sent carry-over before pre-session):** before sending ANY Telegram card this step, answer explicitly: "Has the pre-session analysis card (14a) already been sent this run?" If the answer is no, send 14a NOW, before touching 14b/14c, even if the carry-over/signal card content was prepared first chronologically. Preparing a card's content out of order is fine; **sending** it out of order is not. Send to Telegram via CLI (never the MCP tool — see `context/telegram_config_notes.md`), in this fixed order:
    a. **Pre-session analysis card (mandatory, every session)** — the approved rich analysis layout at `context/session_analysis_template.html` (approved 2026-07-06 from reference screenshot; locked, don't redesign): header with ticker/price/bias badge, previous-setup status, market context, D1/H4/phase/probability tiles, session plan, scenarios A/B/C with %, liquidity map (BSL/SSL), active FVGs, fibonacci, transaction levels with hit-checkmarks, RR tiles. Weekdays: **XAUUSD, always** → `xau` topic. Weekend crypto sessions: BTCUSDT as primary → `krypto` topic. Render `card render --width 1100`. The card's "POPRZEDNI SETUP" section gives a short summary of the primary instrument's carry-over — it does NOT replace the primary instrument's own carry-over status card (step 2 applies to EVERY active setup, primary included).
      **Obowiązkowe sekcje karty sesji (rozszerzone 2026-07-17):**
      1. **MAKRO** — lista newsów przeszłych (actual vs forecast, 1-zdaniowy wniosek) + nadchodzących (czas UK, nazwa, instrument, szacowany wpływ) + okna NO-ENTRY z dokładnymi godzinami UK (format: "14:25–15:15 UK: ISM Manufacturing → USD, NAS100, SP500").
      2. **XAU STREAM** — **zawsze dokładnie 1 setup z kompletnymi Entry/SL/TP1** (gwarancja §7 krok 7e), confidence, poziomy, etykieta gwarancji jeśli confidence <60. Fraza "BRAK ŚWIEŻEGO SETUPU XAU" jest zakazana na karcie (2026-07-18) — jedyny dopuszczalny wariant: setup odroczony aktywnym oknem NO-ENTRY, publikowany zaraz po końcu okna z adnotacją czasu. RSI H4 status: wartość RSI H4 XAUUSD (trigger <25 lub nie).
      3. **TOP 3 WATCHLIST** — tabela: **zawsze dokładnie 3 wiersze** z kompletnymi Entry/SL/TP1: instrument | topic Telegram | confidence | Fib level (0.5/0.618/0.786) | etykieta (`standardowy H1` / `gwarancja sesyjna (confidence: X)` / `rozszerzona rama H4` / `rozszerzona rama D1` / kombinacje / `Niska jakość — gwarancja sesyjna (confidence: X)`). Zero pustych pól, zero "brak setupu" (gwarancja 3+1, §7 krok 8c Krok 5).
      4. **SWING** (jeśli cokolwiek trafiło do §7d lub §7c) — instrument, kierunek, trigger, lifecycle.
      5. **FRESHNESS STATUS** — podsumowanie: ile setupów przeszło Check 1 / ile opublikowanych po Check 2.
    b. Carry-over **PLAN [SESJA] graphic cards** for ALL active setups — primary instrument included (`context/carryover_card_template.html`) — one card per active setup, each to its instrument topic. Card name: **PLAN ASIA / PLAN LONDYN / PLAN NEW YORK** (auto-detected from UTC time: 00–07/08–12/13–21). Time displayed as London time (BST/GMT). Mandatory pipeline per §7 krok 2 (updated 2026-07-07): (1) bar-walk M5/M15 → SL/TP touch check → scenario engine → (2) `chart_set_timeframe("15")` → Alt+R Auto-fit → `draw_shape` yellow ENTRY box + SL (red) + TP1/TP2 (green) → verify levels in frame → `capture_screenshot region=chart` → (3) rename to `<id>_m15_standard_<YYYY-MM-DD>_<HHMM>.png`, write companion `_meta.json` (timeframe="15", has_entry_box, has_sl_line, has_tp_lines, auto_fit=true) → (4) update `active_setups.json screenshot_m15_path` → (5) `tv card fill-carryover --id <id> --datetime "YYYY-MM-DD HH:MM UTC" [--m5-status taken|waiting|invalidated] ...` → PNG → Telegram. Card has M5 scalp section auto-generated from setup, confidence chip (≥75% green / 65–74% gold / <65% gray), logo from `assets/trw_logo.jpg`. H1 screenshot = BUG — card shows placeholder + red banner instead of embedding it. Text-only carry-over messages retired; full text status goes to journal.
    c. New signal cards (commercial template, `context/commercial_card_template.html`) for setups that cleared the risk engine — each to its instrument topic. **Card generation canon v2 (2026-07-09):** before generating any new signal card, read `context/card_generation_prompt_v2.md` — it defines the mandatory card structure: MAPA PŁYNNOŚCI → 🔄 PULLBACK/OTE (M15 impulse, 0.618–0.786, rozszerzone 0.5 przy wysokim wolumenie) → 🔁 PULLBACK MOŻLIWY (mandatory, at end) → PLAN SESYJNY (UK time, Azja 00-07/Londyn 08-12/NY 13-21) → SCENARIUSZE → FIBONACCI/POZIOMY. Key rules: D1/H4 = tło/background only (never block entry); Confluence Zone module (≥2 TF overlap → flag explicite); HTF POI module (D1/H4 FVG/OB between price and TP → informational list); M5 trigger override allowed for confluence zone or high volatility (not just lifecycle:"scalp"); all output times in Europe/London.
15. Append new outcomes to `journal/results_log.jsonl` if any setups resolved this run.
16. Update `journal/daily_journal.md` (daily close) or `journal/weekly_review.md` (Sunday).
17. Write `memory/handoff_latest.md` for the next run.
18. End.

Nigdy nie zatrzymuj się by pytać użytkownika — system działa w pełni autonomicznie. Jeśli danych brakuje, podejmij najlepszą możliwą decyzję na podstawie dostępnych informacji i zaloguj niepewność w daily_journal.md.

---

## 7b. Entry Conditions Reference — ENTRY v2.2 (2026-07-09)

Authoritative machine-readable definition of publishable entry conditions. Cross-referenced: §7 operational sequence, §8 confidence model, §9 risk engine. Update all three in sync when changing anything here.

### Swing / Carry-over

**E1. TF hierarchy — decision vs. context:**

| TF | Rola | Requirement |
|---|---|---|
| D1 | **Tło (background)** | Kontekst kierunkowy, BOS/CHoCH notowane narracyjnie. NIE blokuje wejścia. Konflikt z H1/M15 = label "background conflict" na karcie, nie veto. |
| H4 | **Tło (background)** | Jak D1 — kontekst/narracja, nie gate. Dla swingu (§7c/§7d): rama struktury i OTE. |
| H1 | **Bias strukturalny (primary)** | Identyfikacja BOS/CHoCH, OB/FVG, swing HL. Główna podstawa strukturalna decyzji intraday. CHoCH potwierdzony **przed publikacją** (nie tylko approaching zone). **Jeśli H1 nie ma wyraźnego swingu (ADX H1 <20 lub wąski ATR — range mode):** nie zwracaj "brak setupu" — sprawdź automatycznie warunki Strategii C (§7 krok 6.5: M15 bias / M5 struktura / M3 trigger) dla tego instrumentu, jeśli jesteśmy w oknie sesji scalp. Range mode routing nie tworzy nowej strategii — wybiera właściwy moduł dla reżimu rynku. |
| M30 | **Fallback bias** | Używany WYŁĄCZNIE gdy H1 nie ma jasnych kotwic struktury (brak swingów lub choppy). **NIE jest podstawą OTE** — OTE liczone z M15, nie M30. |
| M15 | **Impuls + OTE (primary)** | Swing M15 (high impulsu → low korekty lub odwrotnie) = podstawa Fibonacci. OTE: 0.618–0.786 domyślnie, rozszerzone do 0.5 przy potwierdzonym wysokim wolumenie. Entry zone = OB/FVG M15 na głębokości OTE. Lekkie odstępstwo OTE: **0.5–0.6 akceptowalne** gdy pozostałe elementy confluence (CHoCH, M5 trigger, liquidity) są mocne — odnotuj w `reason_short`. |
| M5 | **Trigger wejścia (wymagany)** | BOS na M5 **lub** CHoCH na M15 **lub** świeca engulfing M5 — wymagany przed faktycznym entry. Zakaz wejścia bez potwierdzenia triggerem na M5/M15. |

**E2. Setup type:**

- **A — sweep-reversal (updated 2026-07-17: confidence-weighted gate):**

  sweep → **CHoCH/BOS po sweep [obowiązkowy hard gate]** → entry at OB/FVG of new leg.

  Zamiast binarnego "wszystkie 4 kroki lub nic", wymagaj **CHoCH po sweep (obowiązkowo) + min. 2 z pozostałych 3 elementów:**

  | Element | Status |
  |---|---|
  | Sweep liquidity level | Wymagany w puli (1 z 3) |
  | CHoCH/BOS po sweep | **HARD GATE — obowiązkowy, nie wchodzi do puli 2/3** |
  | OTE 0.618–0.786 (lub 0.5–0.6 przy mocnym confluence) | Wymagany w puli (1 z 3) |
  | M5 trigger (BOS M5 / CHoCH M15 / engulfing) | Wymagany w puli (1 z 3) |

  Minimalny warunek: CHoCH ✓ + min. 2 z {sweep, OTE, M5 trigger} ✓. Jeśli CHoCH brak → hard stop, nie liczymy dalej. Jeśli CHoCH ✓ ale tylko 1 z pozostałych 3 → obniżony confidence (typowo <60), rzadko publikowalny. Publishable at confidence ≥60.

  **Scoring Setup A — komponenty zapisywane osobno w journalu** (eliminacja "dociągania", 2026-07-17):

  | Komponent | Jak mierzyć | Maks pkt (w §8) |
  |---|---|---|
  | Siła sweepa | Wick/bar = ile ATR(H1,14) od poprzedniego swing H/L — zapisz wartość liczbową | HTF alignment block |
  | Jakość CHoCH | Rozmiar impulsu CHoCH w pkt vs ATR(M15,14) — zapisz stosunek | LTF structure block |
  | Odległość OTE od 0.618 | |price − 0.618_level| w pkt — zapisz wartość | LTF structure block |
  | M5 trigger | Typ triggera (BOS/CHoCH M15/engulfing) + rozmiar świecy vs ATR(M5,14) | LTF structure block |

  Każdy z tych 4 wartości liczbowych musi być zapisany jako osobne pole w `signals_log.jsonl` (klucz `confidence_components`) — nie tylko suma. Umożliwia audyt czy próg 60 był realnie osiągnięty.

- **B — continuation:** pullback do OB/FVG M15 (na głębokości OTE ze swingu M15) w istniejącym trendzie HTF. Publikowalny przy confidence ≥60 gdy **H1 CHoCH w kierunku biasu jest potwierdzony** przed publikacją. D1/H4 nie są wymagane (background only) — **brak D1/H4 alignmentu NIE daje malusa do confidence** (zgodnie z projektem: D1/H4 = kontekst narracyjny, nie gate, żaden soft penalty nie istnieje). Trigger wejścia obowiązkowy na M5: BOS M5 lub CHoCH M15 lub engulfing — zakaz entry bez triggera M5/M15. Brak jakiegokolwiek CHoCH (ani H1, ani M15) → downgrade do score &lt;60, nie publikuj.

  **Filtr wyczerpania trendu (Setup B only, 2026-07-17):** oblicz odległość ceny od ostatniego swing origin (punktu, od którego liczy się bieżący trend H1) w jednostkach ATR(H1,14). Jeśli `(price − swing_origin) / ATR(H1,14) > 3.0` → oznacz setup jako `trend_exhaustion: true`. W takim przypadku: próg publikacji rośnie do **70** (nie 60) ORAZ wymagaj potwierdzenia opadającego momentum — RSI H1 divergence (wyższy high ceny, niższy RSI high) jako dodatkowy element; brak RSI divergence przy `trend_exhaustion: true` → nie publikuj nawet przy confidence 70+. **Standardowy próg 60 dla Setup B bez wyczerpania pozostaje bez zmian.** Zapisz `trend_exhaustion: true/false` i `exhaustion_atr_ratio: [wartość]` jako pola w signals_log.jsonl.

  **Szablon opisu karty Setup B (obowiązkowy, 2026-07-17):** "Continuation pullback po CHoCH H1 z [X]% retracement, momentum [rosnące/słabnące]." Gdzie X = procentowa głębokość pullbacku liczona od swingu H1 (np. "pullback po CHoCH H1 z 48% retracement, momentum słabnące").

Confidence composition: HTF alignment (0–40) + LTF structure (0–30) + RR/levels (0–20) + news/macro (0–10). See §8.

**E3. Entry box — price levels + confluence:**

*Core requirements:*
- **ENTRY** — OB or FVG H1/M15 mid; must be ahead of current price at publication time.
- **SL** — beyond structure, OB, or sweep extreme. Never an arbitrary distance chosen to hit an RR target.
- **TP1/TP2/TP3** — from liquidity targets, opposing structure, prior highs/lows, session range. TP2 only if RR ≥ 2.5. TP3 only with an explicit structural target beyond TP2.
- **`rr_planned`** — mandatory numeric field: `(TP1 − entry_mid) / (entry_mid − SL)` ≥ 1.5. Full-exit-at-TP1 accounting convention (§16).

*Fib confluence bonus — XAU only, additive, +5 pts each (roles per `feedback_fibonacci_gold`, aligned 2026-07-08):*
- Entry OB/FVG aligns with **0.618 retracement** of **M15 impulse** (swing M15, OTE shallow variant) → +5 pts.
- TP1 aligns with **1.272 extension** of the corrective leg → +5 pts (TP scoring, not entry).
- TP2 aligns with **1.618 extension** of the corrective leg → +5 pts (TP scoring, not entry).
- Fib coincidence without a valid OB/FVG foundation is **not** a standalone entry trigger. These are additive bonuses only. Cannot bypass any E4 block. Total confidence still capped at 100.

*OTE rozszerzony poziom 0.5 — wysokie wolumeny:*
OTE liczone ZAWSZE ze **swingu M15** (high impulsu M15 → low korekty lub odwrotnie) — nigdy z M30 ani H1. Standardowe OTE: 0.618–0.786. Poziom **0.5** (płytsze OTE) akceptowalny jako alternatywna strefa wejścia, gdy **cumulative tick volume na barach tworzących impuls M15 (BOS/CHoCH swing)** jest ≥ **2.0× średniego wolumenu z ostatnich 20 świec M15**. Liczenie: `sum(volume of impulse bars) / average(volume, 20 bars)` ≥ 2.0. Jeśli tak → tag `"ote_level": "0.5_high_vol"` na karcie, +3 pts confidence (nie +5 — poziom 0.5 jest mniej optymalny). Dotyczy zarówno Metody 1 (OTE) jak i Metody 2 (Fib confluence). Jeśli wolumen niedostępny przez `data_get_ohlcv` (np. CAPITALCOM feed) → nie stosuj, trzymaj 0.618 minimum.

*Liquidity confluence bonus — all instruments, additive, +5 pts:*
- Source: **"Liquidity Swings + SMC Structures 1:1"** indicator (`data_get_pine_boxes` / `data_get_pine_lines` on M15 or higher TF).
- Apply when: (a) ENTRY box (OB/FVG) sits inside or immediately before a marked liquidity zone (equal highs/lows, swing liquidity, session H/L), or (b) TP1/TP2 targets a marked equal high/low or session liquidity level from the indicator.
- Additive only. Cannot bypass E4 blocks. Total cap 100 (scalp cap 80).

**E4. Absolute blocks — any active → no publication:**

| Block | Rule |
|---|---|
| News hard window | **5 min PRZED do 25 min PO** każdej High Impact publikacji dla walut/regionów korelowanych z instrumentem (§6.2). |
| Entry box in-zone | Cena jest **aktualnie w środku entry box w momencie generowania setupu** (live price inside [entry_lower, entry_upper]) → nie publikuj jako nowy setup; może być aktualizacją istniejącego active_setups.json entry. |
| macro_conflict | `macro_conflict = true` from §6 macro review. |
| Low confidence | `confidence < 60` — **NIE dotyczy slotów gwarancji 3+1** (§7 krok 8c Krok 5a: drabinka 60→50→40→30 zastępuje ten blok dla gwarancji; setup dostaje jawną etykietę gwarancji z wartością confidence). Dla setupów poza mechanizmem gwarancji blok obowiązuje bez zmian. |
| Entry box violated | Any M15 **close** inside the entry box pre-publication. Wick-only touch without M15 close does not invalidate. (SL wick = SL hit — handle via bar-walk, separately.) |
| Duplicate setup | Same instrument + same direction + similar logic already in `active_setups.json`. |
| Cap exceeded | XAU max 2 active; all instruments max 3 per routine. |
| SL arbitrary | SL chosen to fit RR target, not from structural invalidation logic. |
| Friday late | After 18:00 UK Friday: do not open new swings if scenarios A/B/C cannot complete before weekend market close. |

**E5. Post-entry management — scenarios A/B/C:**

Defined at publication time in `memory/active_setups.json`. Evaluated mechanically by §7 krok 2b bar-walk every routine run.

- **A — structural milestone:** trigger fires (e.g. H1 close above OB high after OB test) → SL moved toward reduce-risk-only. LONG validation: `new_sl > current_sl AND new_sl < entry_lower`. SHORT: `new_sl < current_sl AND new_sl > entry_upper`.
- **B — observational:** no automatic action. `mutually_exclusive_with: ["a"]` — disabled when A fires.
- **C — structure violated:** trigger fires (e.g. H1 close below OB) → `flag_for_manual_review`, handoff warning added. No auto-close, no SL change.

All scenarios: `one_shot = true`, priority A > B > C, `applied = true` blocks re-application. **Scenarios are position management — not entry conditions.**

---

### M5 Scalp — "na dzień dobry" (§7 krok 6.5)

**E6. Prerequisites — all 5 required:**

| # | Condition | Value |
|---|---|---|
| P1 | Session window | London **08:30–09:30 UK** or NY **14:25–15:15 UK** (extended from 15:00, 2026-07-17) |
| P2 | News buffer | No high-impact event ±25 min of now |
| P3 | M15 bias confirmed | M15 BOS/CHoCH after sweep in reversal direction; `macro_conflict = false` from §6. D1/H4/H1 NIE są sprawdzane — nie wpływają na confidence ani nie blokują wejścia. |
| P4 | Risk headroom | Triggered carry-over risk < 1.0% equity |
| P5 | Slot free | No `lifecycle: "scalp"` in `active_setups.json` for this session window |

Total risk cap: carry-over risk + this scalp ≤ 1.5% equity (0.5% scalp + max 1.0% carry-over).

**E7. Scalp entry conditions — sequential, each must pass (updated 2026-07-17):**

D1/H4/H1 NIE są sprawdzane, NIE wpływają na confidence (bonus ani malus), NIE są warunkiem. Scalp operuje w horyzoncie 30–60 min gdzie wyższe ramy nie mają praktycznego znaczenia predykcyjnego. Ta zasada jest nienaruszalna.

1. **Sweep** of reference range confirmed on M15 or M5 (London → Asian H/L; NY → London H/L). No sweep → STOP.
2. **M15 BOS/CHoCH** after sweep, in the reversal direction. No M15 structural break → STOP.
3. **M5 OB/FVG** on pullback; depth ≤ 50% of post-CHoCH impulse. Too deep → STOP.
4. **M3 trigger (primary) — nie wcześniej niż T+5 min od otwarcia okna sesji:** BOS on M3 or engulfing candle inside M5 OB/FVG zone. **Fallback trigger:** jeśli M3 nie dał czystego sygnału w ciągu 3 świec M3 po uformowaniu OB/FVG M5 → użyj M5 close jako triggera fallback; SL za M5 candle extreme (nie za M3 candle extreme) + 0.1% bufor; zapisz `trigger_type: "m5_fallback"` w signals_log.jsonl. Brak M3 trigger i brak M5 close w strefie → STOP.
5. **TP1 RR ≥ 2.0:1**. Below minimum → STOP.
6. **Confidence ≥ 65**. Below 65 → STOP. M30 alignment adds +3–5 pts (optional bonus only).
7. **Routing do swing — przez structural_significance, NIE przez confidence (updated 2026-07-17):** confidence scalpa ≥65 i dowolnie wysokie NIE triggeruje automatycznego routingu do swing. Routing do swing decyduje WYŁĄCZNIE pole `structural_significance: true`, które jest ustawiane gdy wykryto co najmniej jeden z: D1/H4 BOS w kierunku setupu, harmoniczny pattern H4/D1, RSI H4 <25, sweep D1 z rejection. Jeśli `structural_significance: true` → routine do swing (§7d), NIE scalp. Jeśli `structural_significance: false` → pozostaje scalpem niezależnie od confidence. Domyślna wartość: `false` (scalp moduł nie sprawdza D1/H4 — structural_significance oceniane przez XAU stream lub TOP 3 watchlist, nie tu).
8. **Setup type forced = A** (sweep-reversal only). Setup B banned for scalps.
9. **risk_pct = 0.5** (uniform from 2026-07-17).
10. **Deadline** enforced via `session_close_by` = 12:00 UK (London) / 18:00 UK (NY). **Late-window entry (NY only):** jeśli entry zidentyfikowane przed 15:00 UK ale M3/M5 trigger potwierdza się w oknie 15:00–15:15 UK → dopuszczalne wykonanie; zapisz `late_window_entry: true` w signals_log.jsonl. Po 15:15 UK NY → stop, bez wyjątków.
11. **Monitoring aktywnych scalpów między rutynami:** jeśli aktywny scalp (`lifecycle: "scalp"`) jest w `active_setups.json` i przerwa od `last_checked_at` > 10 min → uruchom lekki monitoring check: `quote_get` dla instrumentu → porównaj live price z SL, TP1, i `session_close_by`. Jeśli którykolwiek osiągnięty → rozwiąż setup i zaloguj wynik bez czekania na pełny run. Jeśli żaden nie osiągnięty → zaloguj `last_checked_at` i kontynuuj.

---

### Scenario JSON schema (active_setups.json v2.1)

```json
"scenarios": {
  "a": {
    "label": "human-readable description",
    "probability_pct": 45,
    "trigger": {
      "type": "close_above | close_below | high_above | low_below | zone_reclaim",
      "level": 4122,
      "timeframe": "H1 | M15 | M5",
      "precondition": {
        "type": "low_below",
        "level": 4124,
        "note": "precondition bar must appear BEFORE trigger bar (chronological order enforced)"
      }
    },
    "sl_update": { "type": "absolute", "value": 4112, "direction": "reduce_risk_only" },
    "tp_updates": null,
    "flags": { "applied": false, "one_shot": true, "disabled": false, "mutually_exclusive_with": ["b"] }
  },
  "b": {
    "label": "observational — no trigger",
    "trigger": null,
    "flags": { "applied": false, "one_shot": true, "disabled": false, "mutually_exclusive_with": ["a"] }
  },
  "c": {
    "label": "structure violated — flag only",
    "trigger": { "type": "close_below", "level": 4116, "timeframe": "H1" },
    "flags": {
      "applied": false, "one_shot": true, "disabled": false,
      "action_on_trigger": "flag_for_manual_review",
      "action_note": "text to append to handoff_latest.md when trigger fires"
    }
  }
}
```

**Scenario engine pseudocode (implements §7 krok 2b):**

```
FOR each setup in active_setups:
  IF setup.scenarios is empty → SKIP

  FOR letter in [a, b, c]:                          # priority order
    s = setup.scenarios[letter]
    IF s.flags.applied OR s.flags.disabled → SKIP
    IF s.trigger is null → SKIP                     # informational-only scenario

    Load OHLCV bars for s.trigger.timeframe         # reuse bar-walk window (last_checked_at → now)

    IF s.trigger.precondition defined:
      precond_bar = first bar satisfying precondition type+level (chronological scan)
      IF precond_bar not found → SKIP this scenario
      scan_start = precond_bar index + 1
    ELSE:
      scan_start = 0

    trigger_bar = first bar from scan_start satisfying trigger type+level
    IF trigger_bar not found → SKIP

    // === Trigger fired ===

    IF s.sl_update defined AND s.sl_update.direction == "reduce_risk_only":
      new_sl = s.sl_update.value
      IF LONG:  assert new_sl > setup.sl AND new_sl < setup.entry_lower
      IF SHORT: assert new_sl < setup.sl AND new_sl > setup.entry_upper
      IF assertion fails:
        append warning to handoff_latest.md
        SKIP sl update (do not apply), continue to flag/log below

      ELSE:
        setup.sl           = new_sl
        setup.sl_updated   = true
        setup.sl_update_reason = "scenario_" + letter
        setup.sl_update_at = ISO_now

    IF s.tp_updates defined:
      apply tp1/tp2 updates to setup accordingly

    s.flags.applied = true
    FOR sibling in s.flags.mutually_exclusive_with:
      setup.scenarios[sibling].flags.disabled = true

    IF s.flags.action_on_trigger == "flag_for_manual_review":
      append warning text (s.flags.action_note) to handoff_latest.md
      // no SL change in this branch

    Append to journal/signals_log.jsonl:
      { "type": "sl_tp_update", "setup_id": setup.id, "scenario": letter,
        "old_sl": previous_sl, "new_sl": setup.sl,
        "trigger_timeframe": s.trigger.timeframe,
        "trigger_bar_time": ISO of trigger_bar open,
        "updated_at": ISO_now }

    BREAK    // only process the first fired scenario per run (priority A > B > C)

  Save updated setup back to memory/active_setups.json
```

---

### Carry-over card — scenario integration

- Card reads `setup.sl` from `active_setups.json` **after** bar-walk has already applied any scenario update. No card-side logic needed.
- If `setup.sl_updated = true` → render `SL_UPDATE_BADGE` = `↑ scen. A` (or B/C) in the SL tile (`.sl-update-badge` CSS class, gold color).
- If `setup.sl_updated = false` → `SL_UPDATE_BADGE` = empty string.
- Card is read-only output. All logic lives in the bar-walk, never in the card generator.

---

**ENTRY v2.1a — summary of changes (2026-07-07, fib roles corrected 2026-07-08):**
- E3: Fib confluence bonus for XAU — entry at 0.618, TP1 at 1.272, TP2 at 1.618 (+5 pts each, additive, non-mandatory).
- E3: Liquidity indicator bonus (+5 pts) from "Liquidity Swings + SMC Structures 1:1" (M15+), applicable to all instruments.
- E4: Entry box violation rule clarified — M15 **close** inside box invalidates; wick-only touch does not.
- E4: Friday 18:00 UK rule added for new swing entries.
- E5 + scenario schema: formalized machine-readable A/B/C system with JSON schema and pseudocode (implementation in §7 krok 2b).
- 2026-07-17: NO-ENTRY window changed from 25min-przed/30min-po → 5min-przed/25min-po. E4: dodany blok "Entry box in-zone". E3: dodany poziom 0.5 przy wolumenie ≥2×avg.

---

## 7c. RSI H4 XAU — Dedykowany trigger swing

### Trigger
**RSI H4 XAUUSD < 25** — samodzielny, silny sygnał BUY swing dla XAUUSD.

### Reguły
- Nie wymaga potwierdzenia BOS/CHoCH na żadnym TF.
- Nie wymaga konfirmacji Metody 1/2 ani OTE.
- Sprawdź każdy run: `data_get_study_values` dla RSI na H4 po `chart_set_timeframe("240")` + `chart_set_symbol("XAUUSD")`.
- **Podlega regule NO-ENTRY (§6.2):** jeśli High Impact USD/Gold w oknie −5/+25 min → odłóż publikację do końca okna; jeśli RSI nadal <25 → publikuj.
- Confidence §8 stosuje się normalnie (kontekst H4/D1 wlicza się), ale trigger jest samodzielny — nie wymaga confidence ≥60 jako gate.

### Treść sygnału (obowiązkowe elementy)
1. RSI H4 = [wartość] (trigger <25 potwierdzony).
2. Struktura H4/D1 jako kontekst: trend, ostatni BOS/CHoCH, poziom historyczny, DXY pozycja.
3. ENTRY: current price lub pullback do najbliższego H4 OB/FVG (oportunistyczny, nie wymagany).
4. SL: poniżej swing low H4 lub session low (strukturalny, nie arbitralny).
5. TP1: 1.272 extension swinga korekcyjnego; TP2: 1.618 extension (jeśli struktura uzasadnia).
6. Lifecycle: `"swing"`.

### Routing
- Telegram: temat **`xau`** z tagiem `⚡ SWING RSI-H4` w tytule karty.
- Lifecycle: `"swing"` w signals_log.jsonl i active_setups.json.
- Swing RSI-H4 nie wlicza się do intraday XAU cap (max 2) — osobna pula swing.
- Żaden inny instrument nie ma tego triggera. RSI H4 <25 na innych instrumentach = +5 pts confidence bonus w Metodzie 1, nie samodzielny sygnał.

---

## 7d. Swing routing — kryteria (poza RSI H4 trigger)

Sprawdzane po analizie TOP 3 każdej rutyny (krok 9 sekwencji §7), dla wszystkich instrumentów watchlisty.

### Kryteria wyzwalające routing swing (wystarczy jedno z poniższych)

| Kryterium | Wymóg |
|---|---|
| BOS/CHoCH D1 z wolumenem | Potwierdzony BOS lub CHoCH na D1 z wolumenem ≥ 1.5× średnia(vol, 20D). Kierunek BOS/CHoCH = kierunek setupu. |
| Harmoniczny pattern H4/D1 | Rozpoznawalny pattern harmoniczny (ABCD, Gartley, Bat, Crab, Butterfly) ukończony na H4 lub D1 z potwierdzeniem zamknięcia D w kierunku patternu. |
| Sweep D1 z wysokim rejection | Bar D1 sweepuje kluczowy swing high/low, a wick rejection > 60% rozpiętości bara (klasyczny liquidity sweep reversal na D1). |
| Poziom instytucjonalny | Cena w okolicach (±0.3% odległości) dowolnego z: Yearly Open, Monthly Open, Quarterly OB, Half-Year level — widocznego na D1/W1. |

### Warunki minimalne dla publikacji jako swing
- Confidence §8 ≥ 65 (wyższy próg niż intraday — dłuższy horyzont, ryzyko overnight).
- NO-ENTRY window (§6.2) clearance.
- RR ≥ 1.5 do TP1 (od current price lub OTE entry, nie wstecznie).
- Freshness Check 1 + Check 2 (§10) — entry box musi być przed aktualną ceną przy generowaniu i przed publikacją.

### Routing
- Telegram: temat właściwy dla instrumentu (wg §3 mapping) + tag `📈 SWING` lub `📉 SWING` w tytule.
- Lifecycle: `"swing"` w signals_log.jsonl i active_setups.json.
- Swing NIE wlicza się do cap TOP 3 intraday (§9) — osobny strumień.
- Swing XAU: temat `xau`. Swing non-XAU: temat właściwy per §3.

### Carry-over swing
- Swing może być przenoszony przez kilka sesji.
- Bar-walk (§7 krok 2) działa identycznie jak dla intraday.
- Session-close enforcement NIE dotyczy swingów (tylko lifecycle:"scalp").

---

## 8. Confidence model

Checklist-based, not intuition. Add points for: HTF alignment, clean market structure, liquidity sweep present, FVG/OB/OTE alignment, logical entry box, freshness, good RR, no macro conflict, good session quality, clean execution/readability. **Additive confluence bonuses (see §7b E3):** Fib alignment (XAU): entry at 0.618 of **M15 swing**, TP1 at 1.272, TP2 at 1.618 (+5 pts each); "Liquidity Swings + SMC Structures 1:1" zone alignment on entry or TP (all instruments, +5 pts). These are stackable but cannot bypass §7b E4 absolute blocks. Total cap 100; scalp cap 80.

Subtract points for: macro conflict, unclear structure, late entry, low RR, imminent high-impact news, counter-trend without a strong trigger, excess volatility without edge, duplicate idea vs an existing active setup.

**Tiers:**
- 90-100 — exceptional, very high factor agreement.
- 80-89 — strong, publish.
- 70-79 — acceptable, publish.
- 60-69 — acceptable (borderline), publish.
- <60 — reject, **CHYBA ŻE slot gwarancji 3+1** (§7 krok 8c Krok 5a): wtedy publikacja z drabinką 60→50→40→30 i jawną etykietą gwarancji z wartością confidence. Poza mechanizmem gwarancji <60 = reject bez zmian.

Every published setup needs a `reason_short` with the 2-4 factors that drove the score — never just the number.

**Audytowalność scoringu (2026-07-17, Setup A):** każdy Setup A musi zapisać w `signals_log.jsonl` pole `confidence_components` z czterema wartościami liczbowymi: `sweep_atr` (siła sweepa w ATR H1), `choch_ratio` (rozmiar impulsu CHoCH vs ATR M15), `ote_deviation_pts` (odległość OTE od 0.618 w pkt), `trigger_type` (BOS/CHoCH_M15/engulfing). Suma tych komponentów musi uzasadniać końcowy score. Brak tych pól = setup niepublikowalny.

**Setup B — trend exhaustion (2026-07-17):** zapisz `trend_exhaustion: true/false` i `exhaustion_atr_ratio: [wartość]`. Jeśli `true` → próg publikacji = 70, wymagany RSI H1 divergence.

**Setup type A vs B (added 2026-07-06, from live performance data — first v2 weekly review: sweep-reversal cohort 9W/0L vs trend-continuation 3W/6L):**
- **Setup A — liquidity-sweep reversal:** confirmed sweep of a liquidity level → CHoCH/BOS in the new direction → entry at OB/FVG/0.618 confluence of the new leg. This is the system's proven pattern — normal confidence scoring applies.
- **Setup B — trend continuation (pullback entry in an established HTF trend):** publishable when **H1 CHoCH in bias direction confirmed** + D1 trend clean + no active carry-overs. Entry requires M5 trigger: BOS M5 / CHoCH M15 / engulfing M5 — no entry without it. Not just price approaching a zone — H1 CHoCH must be printed before publication. No CHoCH at H1 or M15 → downgrade to score &lt;60, don't publish.
- Tag every published setup `setup_type: "A"` or `"B"` in `journal/signals_log.jsonl` — the only way the weekly review can keep measuring the A-vs-B split on structured data.
- Re-evaluate the H1-vs-M15 asymmetry once ≥30 clean v2 B-type trades exist.

---

## 9. Signal Risk Engine

(Renamed from "Risk engine" — see §16 for the separate, analytical-only Portfolio Risk Engine. This section is the only one that gates what gets published.)

**Publish only if all of:** confidence ≥60 (**wyjątek: sloty gwarancji 3+1 — drabinka 60→50→40→30 per §7 krok 8c Krok 5a, z jawną etykietą**), entry box fresh and unviolated, RR acceptable, no strong macro conflict, SL is structurally logical (not arbitrary), not a duplicate of an active setup, aligned with HTF trend (or has a clearly-documented strong counter-trend trigger).

**Max concurrent published setups:**
- **XAU (XAUUSD) — intraday stream:** max 2 aktywne. Osobny strumień — nie wlicza się do TOP 3 cap poniżej.
- **XAU RSI H4 swing (§7c) + swing (§7d):** max 1 aktywny swing per instrument. Swing nie wlicza się do intraday cap.
- **TRW TOP 3 (watchlista bez złota):** maks 3 intraday setups per routine. Swing (§7d) na non-XAU instrumentach to osobna pula — nie wchodzi do limitu 3.
- **Weekend crypto:** max 2 key setups per routine.
If more candidates qualify, keep only the highest quality/clarity-to-risk ones.

**Position sizing (updated 2026-07-17 — uniform risk across all streams):**
- **All setup types (swing, day trading, scalp) = 0.5% equity per setup.** The prior 0.25% scalp distinction is retired.
- `risk_pct` is a **mandatory numeric field** on every new `signals_log.jsonl` entry and `active_setups.json` entry — always `0.5` (never `0.25`).
- Total open risk cap **1.5% equity**: with 0.5%/setup, the §9 caps (XAU max 2 = 1.0%) leave headroom for two additional non-XAU setups; P4's "triggered carry-over risk < 1.25%" is computable as `sum(risk_pct of triggered setups)`.

**RR standard:** don't publish below 1:1.5. Prefer ≥1:2.0. Below 1:1.5 allowed only for XAU, only with very high structure quality, good timing, no macro headwind, and an explicit note about the limited potential.
**`rr_planned` is mandatory (2026-07-06):** compute it at publication time as `(TP1 − entry_mid) / (entry_mid − SL)` (absolute value, LONG/SHORT symmetric) and record it as a **number** in `signals_log.jsonl`. A setup without a numeric `rr_planned` is not publishable — without this field the RR floor above is a declaration, not an auditable rule.

**SL:** must come from invalidation/structure-break/liquidity/OB-FVG logic or session volatility — never an arbitrary distance chosen to hit an RR target.

**TP1/TP2/TP3:** from liquidity targets, opposing structure, prior highs/lows, session range, HTF context. Don't force a TP3 that doesn't make sense.

**News risk filter (hardened 2026-07-06, spec finalized by Magic — in the first v2 weekly review every single loss was a news-proximity entry: 0W/4L in the reaction window vs 13W/2L clear of it):**
- **Source:** the **Investing.com Economic Calendar is the primary source** for scheduled macro releases and impact ratings. The ForexFactory CLI (`calendar today --impact High`) stays as a secondary cross-check. Check the calendar **before each session AND again immediately before publishing any signal**.
- **Scope:** for each instrument, identify the relevant currencies/regions (USD → XAUUSD, US indices, major FX; GBP → GBP pairs and UK100; JPY → USDJPY/NIKKEI; etc.). Any event marked high-impact for those currencies/regions is a news risk event for that instrument.
- **Hard NO-ENTRY window: from 5 minutes before to 25 minutes after** a high-impact release. No new published entries with an entry zone that could fill inside this window. **Active positions and pending setups are managed normally — SL and TP remain in force; never close a trade just because of the event.**
- **First-candle rule:** the first reaction candle after the release is **OBSERVE ONLY** — never publish an entry that requires filling on the first impulse candle. Wait for the first completed retracement structure (LTF pullback with clear CHoCH/BOS) before considering post-news entries — post-NFP chasing on 2026-07-02 produced 0 wins out of 8 attempts.
- Beyond the hard window: approaching high-impact news still lowers confidence, flags elevated risk, and reduces setup count. Very high-impact potential → prefer no signal over a weak one.
- **Signal fields (mandatory, never null):** `news_risk: "none" / "low" / "high"` on every published signal, plus `news_context` — a short note when relevant (e.g. "post-FOMC, outside buffer", "CPI in 90 min").

**Duplicate control:** same instrument + same direction + similar entry/logic + already active → update the existing setup (status/comment/`last_checked_at`), never create a new one.

**Max exposure logic:** if several candidate setups share the same market thesis, publish only the best one — don't spread the same idea across instruments without justification.

**Loss streak control** (read from `journal/results_log.jsonl`, most recent same-session entries):
- 2 losses in a row → no change to publication threshold (still ≥60). Continue normal sequence.
- 3 losses in a row, same day → no change to publication threshold (still ≥60). Continue normal sequence.
- 4 losses in a row → **protection mode** for the rest of the day.

**Protection mode:** confidence floor ≥60 (unchanged), no counter-trend setups, max 1 new setup per routine, XAU + best-of-day only, and note in `daily_journal.md` that the system ran in protection mode.

**Final decision checklist before publishing** (if several answers are weak/uncertain → don't publish, or downgrade to a watch-only note):
1. Still fresh?
2. RR sensible?
3. SL at a logical invalidation point?
4. HTF supportive?
5. Macro not destroying it?
6. No imminent news that invalidates it?
7. Genuinely one of the best setups this routine found?

---

## 10. Box entry & freshness — DOUBLE CHECK (mandatory)

Every setup has a BOX ENTRY: a rectangle with clear entry price range, SL, TP1/TP2/TP3 (if applicable), and a short entry reason.

### Freshness Check 1 — przy generowaniu setupu (before scoring)
Wykonaj natychmiast po wyznaczeniu entry box, PRZED liczeniem confidence i PRZED dodaniem do kandydatów:
1. `quote_get` (lub last bar close z `data_get_ohlcv`) vs entry_lower/entry_upper.
2. **BLOKADA — nie generuj setupu jeśli:**
   - Cena już PRZESZŁA przez entry box (price < entry_lower dla SHORT lub > entry_upper dla LONG) → `status: missed/stale`, nie kandydat.
   - Cena jest AKTUALNIE W STREFIE (entry_lower ≤ price ≤ entry_upper) → setup „w trakcie" — nie publikuj jako nowy sygnał. Może być aktualizacją istniejącego active_setups.json entry.
   - TP1 już osiągnięte (price past TP1 pre-trigger) → invalid.

### Freshness Check 2 — tuż przed publikacją (before final screenshot + Telegram send)
Wykonaj po każdym `chart_set_symbol`, tuż przed `capture_screenshot` i wysyłką:
1. Świeży `quote_get` → porównaj z entry_lower/entry_upper.
2. Jeśli cokolwiek zmieniło się od Freshness Check 1 (cena weszła w strefę, przeszła, lub TP trafiony) → unieważnij lub zaktualizuj, **nie wysyłaj nieświeżego setupu**.
3. Wynik: `fresh_entry: true/false` w `signals_log.jsonl` — mandatory field.

Oba checki obowiązkowe. Pominięcie Check 1 lub Check 2 = błąd proceduralny — loguj w daily_journal.

Drawing style (bez zmian): yellow bold rectangle, `{"linecolor":"#FFFF00","fillcolor":"#FFFF004D","linewidth":3,"linestyle":0,"showLabel":true,"text":"ENTRY","textcolor":"#000000","fontsize":14,"bold":true}`, projected forward in time from the last bar. Always verify with `capture_screenshot` that it actually rendered — `draw_shape` can return `success:true` without a visible shape if the CDP context is stale.

---

## 11. Screenshots

Before capture: hide indicators/drawing tools not used in this specific analysis, clear chart clutter (`draw_clear` — Alt+T fallback if it silently fails, per known CDP flakiness).
Screenshot must show only: instrument, direction, date, UK time, session name, box entry, entry range, SL, TP1/2/3, a short reason, and the TRW logo.
After capture: restore only the indicators/tools actually used in that analysis — don't re-enable everything.
Save to `screenshots/xau/`, `screenshots/trw/`, or `screenshots/crypto/` depending on group (existing flat `screenshots/` root stays as historical/misc, new routine output goes in the subfolders).

---

## 12. Setup lifecycle

`detected` → `validated` → `published` → `active` → `hit` / `invalidated` / `missed` / `expired`.

Never conflate a detected setup with a published one — a setup only becomes `published` once it clears the risk engine and is actually sent. Statistics must only ever count what was genuinely published, not every internal candidate.

---

## 13. Timestamp & audit

Every signal, report, and setup record includes: date, time, UK timezone, session name, `created_at`, `published_at`, `last_checked_at`.

---

## 14. Journal & memory file layout (v2)

```
memory/active_setups.json     — current live setups (lifecycle-tagged)
memory/handoff_latest.md      — continuity note for the next run
memory/model_portfolio.json   — Model Portfolio state (equity, drawdown history) — see §16, analytical only
journal/signals_log.jsonl     — one line per published/tracked signal
journal/results_log.jsonl     — one line per resolved outcome
journal/daily_journal.md      — daily close entries (append-only, dated sections)
journal/weekly_review.md      — Sunday weekly entries (append-only, dated sections)
reports/daily/                — rendered daily report assets (HTML/PNG), if generated
reports/weekly/               — rendered weekly report assets
screenshots/xau/ trw/ crypto/ — clean chart screenshots by group
context/strategy_reference.md, project_assets.md, telegram_config_notes.md — pointers, not duplicates
```

`trade_log.md` is **frozen/archived** (2026-07-04) — historical reference only, migrated into `journal/*.jsonl`. Do not append to it.

### `journal/signals_log.jsonl` fields
`id, instrument, group, session_name, signal_date, signal_time_uk, timezone, direction, pattern, setup_type, entry_lower, entry_upper, sl, tp1, tp2, tp3, confidence, rr_planned, risk_pct, htf_alignment, macro_conflict, news_risk, news_context, session_quality, duplicate_check, protection_mode, confidence_note, fresh_entry, status, reason_short, created_at, published_at`

Mandatory on every new published setup (2026-07-06): `setup_type` ("A" = sweep-reversal / "B" = continuation, §8), `rr_planned` (number, §9), `news_risk` ("none"/"low"/"high", never null, §9) + `news_context` (short note when relevant). Mandatory since 2026-07-08: `risk_pct` (number — always `0.5`, uniform for all setup types since 2026-07-17, §9 position sizing). Numeric fields (`rr_planned`, `risk_pct`, prices, confidence) as numbers, not strings.

**Dodatkowe pola obowiązkowe od 2026-07-17:**
- Setup A: `confidence_components: { sweep_atr, choch_ratio, ote_deviation_pts, trigger_type }` — audyt scoringu (§7b E2, §8).
- Setup B: `trend_exhaustion: true|false`, `exhaustion_atr_ratio: [liczba]` — filtr wyczerpania (§7b E2).
- Scalp: `trigger_type: "m3"|"m5_fallback"`, `structural_significance: false`, `late_window_entry: true|false` (§7b E7, §7 krok 6.5).

### `journal/results_log.jsonl` fields
`setup_id, final_status, win, rr_realized, session_result, macro_context, execution_notes, lesson_learned, risk_grade, followed_plan, setup_quality_after_close, was_news_factor, was_macro_conflict_correct, improvement_note, updated_at`

---

## 15. Daily / weekly discipline

**End of day** (weekday 22:00 close): assess whether there were too many setups, any forced setups, inflated confidence, mis-judged macro conflict, or poorly-enforced freshness. Record in `daily_journal.md`.

**Watchlist symbol verification (EOD, każdy piątek lub przy pierwszym sygnale błędu feed):** dla każdego instrumentu z watchlisty wykonaj `quote_get` po `chart_set_symbol`. Jeśli którykolwiek zwraca błąd lub pusty feed — zanotuj w `daily_journal.md` i zaktualizuj symbol w §3 i §7 krok 8 ROUTINES_V2.md przed następnym runiem. Aktualna watchlista i poprawne symbole:

| Instrument | Symbol TV | Temat |
|---|---|---|
| XAUUSD | XAUUSD | xau |
| XAGUSD | XAGUSD | waluty |
| EURUSD | EURUSD | waluty |
| USDJPY | USDJPY | waluty |
| NAS100 | NAS100 | indeksy |
| UK100 | UK100 | indeksy |
| GER40 | GER40 | indeksy |
| Nikkei | JP225 | indeksy |
| SP500 | SP500 | indeksy |
| DJ30 | DJ30 | indeksy |
| UKOIL | UKOIL | indeksy |
| DXY (kontekst) | TVC:DXY | — |
| VIX (kontekst) | TVC:VIX | — |

Jeśli symbol zmieniony — zaktualizuj tę tabelę jako source of truth. Nie używaj symboli z pamięci bez weryfikacji.

**Weekly** (Sunday 20:00): assess confidence-tier performance (70-79 vs 80-89 vs 90+), HTF-aligned vs counter-trend win rate, performance around high-news days, best/worst session quality, whether risk filtering actually screened out bad setups, whether protection mode was needed/effective. Record in `weekly_review.md`.

---

## 16. Model Portfolio & Risk Engine (analytical overlay)

**Added 2026-07-06.** A light, illustrative overlay on top of the existing system — not a redesign. It answers "if every published signal had actually been traded, how would that account look?" It is analytical only and must never gate or alter signal publication — that job stays entirely with §9's risk engine (renamed **Signal Risk Engine** below to avoid confusion with the **Portfolio Risk Engine** introduced here).

### Model Portfolio (virtual account)

- Start balance: **$10,000**, tracked in `memory/model_portfolio.json` (new file — see §14).
- **Risk per trade: 0.5% of current equity — uniform across ALL setup types (swing, day trading, scalp, XAU, indices, forex). No distinction by stream or lifecycle. Unchanged from 2026-07-17.**
- Trade universe: every entry in `journal/results_log.jsonl` with a resolved `rr_realized`, i.e. every setup that actually cleared the Signal Risk Engine and was published — not raw candidates. Processed in chronological order (`updated_at`) so compounding is correct.
- **Counting rule (weekend-gap fix, 2026-07-06):** each daily-close run processes **every** results_log entry whose `setup_id` is not yet in `counted_trade_ids` — NOT just entries dated today. The daily close only runs Mon–Fri, so weekend-resolved trades (crypto) are picked up by Monday's 22:00 run; a today-only filter would silently drop them forever. `counted_trade_ids` guarantees nothing gets double-counted regardless of when it's swept up. New entries must record `rr_realized` as a **number** (e.g. `-1.0`), not a string.
- **Default (proposed, since the brief didn't specify):** the Model Portfolio starts fresh from 2026-07-06 go-live. It does **not** backfill the 82 migrated legacy signals or the pre-overlay v2 trades — legacy data has known duplicate-setup issues (e.g. legacy-071/076) that would distort the equity curve. If you'd rather backfill, say so and I'll run it once as a separate pass.
- **PnL formula (updated 2026-07-17 — partial-close model):** models a realistic split exit: 70% of position closed at TP1, 30% runs to the resolved exit (`rr_realized` on the runner leg).
  - Standard scenario (TP1 hit + runner): `pnl_usd = (current_equity × 0.005 × 0.70 × rr_at_tp1) + (current_equity × 0.005 × 0.30 × rr_realized_runner)`
  - Full loss before BE: `pnl_usd = current_equity × 0.005 × (−1)`
  - Closed at BE: `pnl_usd = 0`
  - `current_equity += pnl_usd` after each trade.
- **Accounting convention (updated 2026-07-17):** the portfolio models a partial close — 70% at TP1, 30% runner. The runner leg uses `rr_realized` from `results_log.jsonl`. When the runner hits TP2 or TP3 it is recorded as a separate exit; if closed at BE it counts as 0 on the runner leg. This replaces the prior conservative full-exit-at-TP1 convention (2026-07-06) which systematically understated winners. When a resolved trade is excluded from the portfolio (pre-go-live cohort in `counted_trade_ids`), the daily portfolio block must say so in one sentence — otherwise "1 trade resolved, 0 counted" reads like a bug.
- Purely illustrative — never referenced by §9's publish/reject logic, never used to size real trades.

### Portfolio Risk Engine (safety thresholds, not targets)

Applied to the Model Portfolio's daily and running drawdown — **informational status only**, reported in summaries, does not block or alter signal publication:

- Daily drawdown ≥2% (from that day's starting equity) → status `warning`.
- Daily drawdown ≥3% → status `hard_stop` (the model portfolio would have stopped taking trades for the day — reported as a fact, not enforced against real signals).
- Daily drawdown ≥5% → status `emergency`.
- Total drawdown ≥10% (current equity vs the $10,000 starting balance) → status `max_dd_breached`, flagged prominently in both daily and weekly summaries.

### Where it appears

**Daily Close (22:00 UK)** — order of the summary, portfolio always last:
1. Market recap
2. Setups and signals
3. Execution notes
4. Risk notes (Signal Risk Engine: protection mode, loss streak, macro conflicts)
5. Lessons
6. Outlook for next day
7. **Model Portfolio** (short block, end-of-day balance, daily P&L $/R, open overnight risk, risk status, one-line summary)

**Weekly Review (Sunday 20:00 UK)** — order of the summary, portfolio always last:
1. Weekly performance
2. Best and worst setups
3. Execution and discipline review
4. Mistakes and improvements
5. Edge and patterns
6. Plan and outlook for next week
7. **Model Portfolio Summary** (short block, start/end balance, weekly P&L $/R, max daily drawdown, total drawdown vs start, trade count, one-line edge-confirmation conclusion)

The portfolio block is always short (5-7 lines) — it illustrates the week/day, it does not replace the market/setup/execution narrative above it.

---

## 17. Final rule

One excellent setup beats three mediocre ones — but the 3+1 guarantee (§7 krok 8c Krok 5, 2026-07-18) means the required setup count is ALWAYS delivered; quality differences are disclosed through the confidence value and guarantee label, never through a missing setup. Honest statistics beat inflated activity: a guarantee-slot setup carries its real (low) confidence in the journal, so the stats stay truthful.
