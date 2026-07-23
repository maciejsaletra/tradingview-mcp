# TRW Weekly Review (v2)

Written every Sunday 20:00 routine (weekly preview + deep analysis). Each entry evaluates the past trading week using `journal/signals_log.jsonl` + `journal/results_log.jsonl`: confidence-tier performance (70-79 vs 80-89 vs 90-100), HTF-aligned vs counter-trend win rate, best/worst sessions, protection mode triggers, and risk-filtering effectiveness (per WEEKLY RISK REVIEW rules in `ROUTINES_V2.md`).

---

## Week of 2026-06-29 — 2026-07-03 (pre-v2, reference only)

Legacy week, tracked in the old `trade_log.md` format before the v2 reset. Summary (from the archived file): 56 tracked setups, 34 activated, 16 resolved, 11 wins / 5 losses, win rate 68.8%, net RR +25.95R. Best trade: XAUUSD 13:26 LONG (07-01) +8.70R. Weakest cohort: post-NFP chasing entries on 07-02. **Not recomputed under v2 confidence/risk-tier fields** since those fields didn't exist yet at the time — treat as directional context only, not a v2 baseline.

First real v2 weekly review will run the Sunday following go-live.

---

## Week of 2026-06-29 — 2026-07-05 (first v2 weekly review)

**Caveat:** almost the entire week's data (83 of 85 signals, 18 of 19 resolved outcomes) is `legacy` — migrated from the pre-v2 `trade_log.md` before the v2 schema existed, so `htf_alignment`, `macro_conflict`, `news_risk`, `session_quality`, `protection_mode` are all `null` on those rows. Only `sig-083`/`sig-084` (published 2026-07-04, weekend crypto) carry full v2 structured fields. Everything below is recomputed directly from `journal/signals_log.jsonl` + `journal/results_log.jsonl`; HTF-alignment/news-day/session splits on legacy rows are inferred from each entry's free-text `reason_short`, not a structured field — treat those splits as directional, not exact.

**Headline numbers (18 resolved trades with win/loss data, 1 additional `merged_duplicate` excluded from stats):** 14 wins / 4 losses = **77.8% win rate**, net **+27.43R**. Every loss was capped at exactly -1.0R (SL discipline held all week — no blown stops).

### Confidence-tier performance
Every one of the 18 resolved trades scored in the **70-79** tier (range 70-76). Zero resolved trades in 80-89 or 90-100 — those tiers are unused/unvalidated so far. 70-79 tier: 14W/4L, 77.8% win rate, +27.43R.
**Observation:** the best trade of the week (legacy-030, XAUUSD, +8.70R) only scored 75. Worth auditing next week why nothing this week cleared 80, even on the cleanest setups.

### HTF-aligned vs counter-trend (inferred from reason_short, no structured field on legacy rows)
- **HTF-aligned/continuation:** 8 trades (legacy-027, 028, 029, 038, 046, 051, 057, 064) → 3W/5L, **37.5% win rate**, net +1.70R.
- **Counter-trend/reversal-off-sweep:** 9 trades (legacy-030, 033, 034, 036, 040, 041, 049, 050, sig-083) → **9W/0L, 100% win rate**, net +22.56R.
- 1 trade (legacy-082) not cleanly classifiable either way.
**Read:** this was a week defined by a sharp V-shaped reversal (XAU/XAG off the 3942 liquidity sweep, BTC/ETH off the ETF-outflow lows) — fading the prior move at a clean sweep+CHoCH+FVG confluence paid off every time, while several trend-continuation entries got chopped on pullback whipsaws. Don't over-fit "counter-trend is better" as a permanent rule; it's a feature of this week's volatility regime. Do keep prioritizing clean sweep+reversal confluence when it appears.

### News-day / news-proximity performance
Day-level, all four losses cluster on the two high-impact news days: **2026-07-01** (BOE Bailey + Fed Warsh + ISM PMI, NO TRADE 14:00-15:15 UTC+1) and **2026-07-02** (NFP miss). But splitting further by *proximity to the release*:
- Entries taken **in/immediately after** the news reaction window: legacy-027, 028 (07-01 AM, ahead of the BOE/Fed/ISM window), legacy-057, 064 (07-02, NFP-reaction chase) → **4 trades, 0 wins, -4.0R (0%)**.
- Entries taken **clear of** the immediate release window (even same-day): **14 trades, 14 wins, +31.43R (100%)**.
**This is the cleanest, most actionable finding of the week** — it validates the existing NO TRADE buffer rule but suggests the buffer needs to cover the immediate reaction window more strictly, not just the headline hour.

### Session quality
- **London AM (~07:00-08:30 UK):** 5 trades, 3W/2L, +7.05R.
- **NY (~13:00-14:00 UK):** 3 trades, **3W/0L, +14.96R — best session of the week** (includes the +8.70R top trade).
- **NY2/late (~14:00-17:30 UK):** 7 trades, 5W/2L, +1.94R (the two NFP-reaction losses sit in this window).
- **Asia (~00:00-01:00 UK):** 1 trade, 0W/1L, -1.0R — worst session, though single-sample.
- **Weekend crypto:** 2 trades, 2W/0L, +3.48R.

### Risk engine effectiveness
No structured "candidates scanned vs published" counter exists in the legacy log to compare against, but the clearest live evidence this week is the weekend crypto sessions (2026-07-05 02:30/14:00 UK, logged in `daily_journal.md`): the routine correctly screened out 4 of 5 TRW_CRYPTO instruments each run for lacking a fresh pullback/confluence structure, publishing 0 forced setups both times. That's the no-forced-setups rule working as designed.

### Protection mode
Not triggered. Max consecutive same-day losses observed = 2 (legacy-027/028 on 07-01, legacy-057/064 on 07-02) — below the 4-loss threshold for full protection mode. The 2-loss "raise the bar" rule for the same session was never actually tested since no further same-session setup followed either 2-loss cluster that day. Loss-streak control remains unvalidated in live conditions, not broken.

### Best / worst trade of the week
- **Best:** legacy-030, XAUUSD LONG (2026-07-01 13:26), **+8.70R (TP2 hit)** — bullish CHoCH off the 3942 sweep, FVG 4007-4022 entry, DXY inverse-confirmed.
- **Worst (tied at -1.0R, clean SL, no oversize loss):** legacy-027 (XAUUSD SHORT) and legacy-028 (XAGUSD SHORT), both 2026-07-01 morning, both correlated losses from the same BOE/Fed/ISM macro mis-read — effectively one bad correlated cluster rather than two independent mistakes.

### Conclusions for next week
1. Tighten the practical NO TRADE buffer around the exact release minute (not just the headline hour) for high-impact prints — every single loss this week was a news-proximity entry.
2. Keep prioritizing clean liquidity-sweep + CHoCH + FVG reversal confluence; it went 9-0 this week. Don't chase pure trend-continuation entries into known volatility windows without extra confirmation.
3. Confidence model has never produced an 80+ or 90+ published setup — audit the checklist scoring next week against the +8.70R trade to see if the tiers are miscalibrated or genuinely untested at the high end.

---

## Week of 2026-06-29 — 2026-07-05 (CORRECTED — real Sunday 20:00 `trw2-weekly-review` run)

**This entry supersedes the one above.** The prior "first v2 weekly review" entry was written 2026-07-04 17:46 — before `sig-084` (SOLUSDT, weekend crypto) actually resolved (SL hit intrabar, logged at 2026-07-05 14:05) and before ROUTINES_V2 §16 (Model Portfolio) existed. It counted weekend crypto as 2W/0L and omitted the Model Portfolio section entirely. Untracked file (`journal/` was never committed), so corrected in place via a new dated section rather than a silent edit — the old section is left above for audit trail, but treat **this** section as the authoritative record for the week of 2026-06-29–2026-07-05.

**Headline numbers (19 resolved trades with win/loss data, 1 additional `merged_duplicate` [legacy-076] excluded from stats):** 13 wins / 6 losses = **68.4% win rate**, net **+25.43R**. Every loss capped at exactly -1.0R — SL discipline held all week, including the new sig-084 case (SL swept intrabar in thin weekend liquidity, price recovered afterward but the stop had already triggered).

### 1. Weekly performance
19 resolved setups, 13W/6L, 68.4% win rate, net +25.43R. All resolved trades scored in the 70-79 confidence tier (range 70-76) — zero at 80+ or 90+, same finding as the premature draft, now confirmed across a corrected dataset.

### Confidence-tier performance
70-79 tier: 19 trades, 13W/6L, 68.4%, +25.43R. 80-89 / 90-100: unused, still unvalidated after two full weekly cycles.

### HTF-aligned vs counter-trend (inferred from reason_short; sig-084 added to HTF-aligned/continuation bucket as a dip-buy-in-trend entry)
- **HTF-aligned/continuation:** 9 trades (legacy-027, 028, 029, 038, 046, 051, 057, 064, sig-084) → 3W/6L, **33.3% win rate**, net +0.70R.
- **Counter-trend/reversal-off-sweep:** 9 trades (legacy-030, 033, 034, 036, 040, 041, 049, 050, sig-083) → 9W/0L, **100% win rate**, net +22.56R.
- 1 trade (legacy-082) not cleanly classifiable, +2.17R win.
**Read:** unchanged conclusion from the draft, now reinforced — the one entry added this correction (sig-084) landed in the continuation bucket and was a loss, further widening the gap between reversal-style entries (undefeated, 9-0) and continuation-style entries (now 33%, worse than a coin flip this week).

### 2. Best / worst setup of the week
- **Best:** legacy-030, XAUUSD LONG (2026-07-01 13:26), **+8.70R (TP2 hit)** — bullish CHoCH off the 3942 sweep, FVG 4007-4022 entry, DXY inverse-confirmed. Unchanged from the draft.
- **Worst (6-way tie at -1.0R, all clean SL, no oversized loss):** four correlated clusters, not six independent mistakes: (1) legacy-027/028 (XAU+XAG SHORT, 2026-07-01 AM) — shared bad macro read ahead of BOE/Fed/ISM; (2) legacy-057/064 (SP500/DJ30 LONG, 2026-07-02) — NFP-miss chase; (3) legacy-046 (NIKKEI LONG, 2026-07-02 Asia) — "falling knife" catch the setup's own reason_short had already flagged as risky; (4) **sig-084 (SOLUSDT LONG, weekend)** — new this correction: SL swept intrabar during a ~12h gap between scheduled crypto checks, price recovered afterward but the stop had already triggered.

### 3. Execution and discipline review
No forced setups this week (0 across every routine, including 3 consecutive weekend-crypto re-scans — sun 02:30, sun 14:00, tonight 20:00 — that all correctly found nothing to publish). No confidence inflation — every resolved trade sits 70-76, none pushed artificially higher. Several 2026-06-30 entries (legacy-013 through 017) were explicit system/routing tests ("TEST SYSTEMU — NIE JEST TO SYGNAL"), not real signals; excluded from all stats here since they never got a results_log entry, but worth flagging for journal hygiene — recommend a `test: true` field going forward instead of relying on manual filtering.

### 4. Mistakes and improvements
1. The premature draft's "100% win rate clear of news" claim was an artifact of incomplete data — corrected to **86.7%** (13W/2L, +29.43R) once sig-084 (not news-related) and legacy-046 (also not news-related) are properly included as the two non-news losses. News-proximity entries are still catastrophic (4 trades, 0%, -4.00R) and remain the single clearest, most actionable pattern.
2. **New lesson (sig-084):** a setup sitting <1% above SL between scheduled routine checks can still get swept intrabar well before the next check (~12h gap here). Already flagged in the crypto handoff — recommend a tighter interim monitoring cadence or an automated alert for any setup flagged that close to invalidation, rather than waiting a full routine cycle.
3. legacy-046 reinforces: when a setup's own `reason_short` explicitly flags "wait for confirmation before entering," don't publish it as a live entry anyway.

### 5. Edge and patterns
- Confidence 70+ overall: 19 trades, 68.4% WR, +25.43R (only tier used both weeks running).
- HTF-aligned/continuation: 33.3% WR, +0.70R vs counter-trend/reversal: 100% WR, +22.56R — don't over-fit "counter-trend always wins" as a permanent rule (it's this week's volatility regime), but keep prioritizing clean sweep+CHoCH+FVG confluence when it appears.
- News-day: news-proximity 0% (-4.00R) vs clear-of-news 86.7% (+29.43R, corrected from the draft's inflated 100%).
- Session quality: NY (13:00-14:00) best, 3W/0L, +14.96R. Weekend crypto now a modest +0.31R (1W/1L) — corrected down from the draft's overstated +3.48R (2W/0L). Asia worst, single-sample, -1.00R.
- Risk engine: correctly gated all crypto candidates across every weekend routine this week — 2 published (sig-083/084, Sat PM) after clearing the bar, then 0 forced across 3 subsequent full re-scans.
- Protection mode: not triggered. Max same-day loss streak = 2 (threshold is 4) — still untested in live conditions.

### 6. Plan and outlook for next week
1. Tighten the NO TRADE buffer around the exact release minute, not just the headline hour — 4 of this week's 6 losses were news-proximity entries.
2. Keep prioritizing liquidity-sweep + CHoCH + FVG reversal confluence over pure trend-continuation dip-buys into known volatility windows (9-0 vs 3W/6L this week).
3. Audit the confidence checklist — still zero 80+/90+ trades after two full cycles; either recalibrate or accept 70-79 as the realistic operating band.
4. Add tighter interim monitoring (or an alert) for any setup sitting within ~1% of SL, per the sig-084 lesson.

### 7. Model Portfolio Summary
Portfolio has **not gone live yet** — `memory/model_portfolio.json` shows go-live scheduled 2026-07-06 (tomorrow), `current_equity`/`week_start_equity` both still $10,000, `trades_counted: 0`, `daily_history: []`. Weekly P&L: $0.00 / 0.00R. Max daily drawdown this week: 0%. Total drawdown vs start: 0%. Trades counted: 0. **Conclusion:** too early to assess edge — neutral, not a negative signal. `week_start_equity` stays at $10,000 for next week (unchanged, since the portfolio hasn't started compounding yet).

---

## Week of 2026-07-06 — 2026-07-12

**Headline:** 5 resolved trades (3W/2L, 60% win rate, net +2.19R) — the portfolio's first losing week since go-live, but a shallow one (max daily drawdown 0.5%, nowhere near the 2% warning threshold). One trade — the week's first-ever 80+ confidence signal — lost, giving the confidence-tier audit flagged in both prior weekly reviews its first real data point. sig-086 (SOLUSDT SHORT, published Sunday 01:39, still testing its own entry zone as of this 20:00 review) carries into next week unresolved and is excluded from this week's stats.

### 1. Weekly performance
5 resolved setups this week: legacy-078 (XAGUSD LONG, hit_tp +1.28R), legacy-081 (UK100 LONG, hit_tp +1.98R), legacy-079 (DJ30 LONG, hit_tp +0.93R), legacy-071 (XAUUSD LONG, hit_sl -1.0R), sig-085 (XAUUSD LONG, hit_sl -1.0R). 3W/2L = **60% win rate**, net **+2.19R**. Only 2 genuinely *new* setups were published this week (sig-085 Thursday NY, sig-086 Sunday weekend crypto) — the other 3 resolutions were carry-overs from before this window, resolving in-week. Consistent with the no-forced-setups discipline: dozens of routine re-scans (weekday XAU/TRW + 5 weekend crypto runs) logged 0 new setups.

### Confidence-tier performance
- **70-79:** 4 trades (legacy-078 73, legacy-081 72, legacy-079 74, legacy-071 75) → 3W/1L, **75% win rate**, net **+3.19R**.
- **80-89:** 1 trade (sig-085, confidence 86) → 0W/1L, **0%**, net **-1.0R** — the system's first-ever 80+ tier resolution, after two full weekly cycles with zero data at this tier. It lost, but per `results_log` the loss was a structural/execution-timing failure (SL swept in the same violent wick that filled the entry, price recovered afterward and the underlying thesis proved directionally correct) — not a sign the score was inflated or the setup was poorly reasoned. One data point either way is not enough to conclude the 80+ tier is unreliable; keep tracking.
- **90-100:** still unused, three cycles running.

### 2. Best / worst setup of the week
- **Best:** legacy-081, UK100 LONG (D1/4H/H1 aligned bullish continuation), **+1.98R (TP1 hit)**.
- **Worst (tied at -1.0R, both XAUUSD LONG, both clean SL, no oversized loss):** (1) **legacy-071** — Scenario A had already tightened its SL 4098→4112 on 2026-07-07, but a pre-FOMC-week 100pt overnight cascade (high volume, no single confirmed high-impact release at the exact moment) swept through it anyway on 2026-07-07 19:00 UTC; (2) **sig-085** — confidence-86 sweep-reversal entry (Setup A) filled and stopped out inside the *same* M15 candle as the triggering volatility spike, 2026-07-10 14:30-14:45 UTC; price recovered above both levels afterward but the stop had already triggered.

### 3. Execution and discipline review
No forced setups: confirmed across every routine log this week, including 5 separate weekend-crypto re-scans (Sat 02:30/14:00/20:00, Sun 02:30/14:00) that mostly found 0 candidates and correctly stayed silent, publishing only when SOLUSDT finally produced a genuine high-volume H1/H4 BOS (sig-086, Sunday 01:39). No confidence inflation — sig-085's 86 was earned on real OB/FVG/OTE/liquidity-indicator confluence, not padded, and the post-mortem in `results_log` confirms the structural read was sound. **Loss-streak discipline is now the closest it's been to being tested live:** sig-084 (07-05) → legacy-071 (07-08) → sig-085 (07-10) is 3 consecutive losses in the underlying signal series, one below the 4-loss protection-mode threshold (§9) — correctly not triggered, but the "higher quality bar for the next candidate" language was actively applied when sig-086 was screened (SOL's own prior whipsaw was explicitly required to *not* repeat before publishing). **Recurring open items, unresolved for another week:** (1) NIKKEI data-extraction error, now 9 consecutive routines — needs Magic's attention, not a session artifact; (2) weekend-crypto pre-session analysis card (ROUTINES_V2 §7 step 14a calls it mandatory every session) has been skipped for 6 consecutive weekend routines on zero/low-setup runs — still needs an explicit decision (formalize the exception, or start enforcing it).

### 4. Mistakes and improvements
1. **sig-085 lesson (carried from `results_log`):** a technically sound Setup A sweep-reversal entry can still fail when SL sits just beyond the OB/FVG and the triggering move is itself still a high-volume/high-volatility spike (25,977 vs ~7-14K baseline volume) — entering immediately into the tail of an active spike compresses SL survivability even with correct direction. Improvement: require at least one full bar of post-sweep cooldown/consolidation before publishing when the triggering candle's volume is materially elevated over baseline.
2. **legacy-071 lesson:** Scenario A's reduce-risk SL tightening (4098→4112) was correctly applied and still wasn't enough — pre-FOMC weeks carry elevated overnight tail risk for XAU specifically. Improvement note already logged in `results_log`: flag active XAU longs for tighter management or manual review heading into scheduled FOMC weeks.
3. Both losses this week were XAUUSD LONG — same instrument, same direction, four days apart, unrelated setups but a reminder to watch correlated-instrument exposure even when the setups themselves are independent and well-reasoned.

### 5. Edge and patterns
- Confidence 70+ overall (all resolved trades): 5 trades, 60% WR, +2.19R.
- 70-79 tier: 75% WR, +3.19R. 80-89 tier: 0% WR, -1.0R (n=1, first data point, not yet meaningful).
- **Setup type A vs B this week (small sample, does not overturn the multi-week trend):** A (sweep-reversal): 1 trade (sig-085), 0W/1L, -1.0R. B (continuation, inferred from legacy pattern text): 4 trades (legacy-078/079/081/071), 3W/1L, +3.19R. This is the *opposite* of the pattern established over the prior two weekly reviews (A undefeated 9-0, B badly lagging) — a reminder that a single week's setup-type split is a small sample and shouldn't be over-fit either direction; A's one loss this week was an execution/timing issue on an otherwise-correct thesis, not evidence the pattern itself has stopped working.
- News-day/proximity: 1 trade (legacy-071) carried an explicit `was_news_factor: true` (pre-FOMC elevated tail risk, not a hard-window violation) and lost; the other 4 (`was_news_factor: false`) went 3W/1L, +3.19R. Consistent with the standing conclusion that news-adjacent risk — even soft/background risk, not just release-candle chasing — continues to correlate with losses.
- Session quality: **Asia (~01:45-08:00 UK) best this week**, 2 trades (legacy-078, legacy-081), 2W/0L, +3.26R. NY2/late (~20:00-21:15 UK): 2 trades (legacy-079, legacy-071), 1W/1L, -0.07R. NY (~15:30-15:45 UK): 1 trade (sig-085), 0W/1L, -1.0R.
- Risk engine: stayed highly selective — only 2 new setups published across the entire 7-day window (sig-085, sig-086) despite dozens of full-watchlist scans; the "higher quality bar" rule was demonstrably applied to sig-086 while the loss streak sat at 3.
- Protection mode: not triggered, but now the closest it has been (3/4 consecutive losses) since go-live. Worth watching closely into next week — one more loss anywhere in the signal series triggers it.

### 6. Plan and outlook for next week
1. Loss streak sits at 3/4 — the very next resolved loss (regardless of instrument) triggers protection mode (§9: confidence floor unchanged, no counter-trend setups, max 1 new setup/routine, XAU + best-of-day only). Be ready to apply it immediately, don't wait for a dedicated review.
2. sig-086 (SOLUSDT SHORT) carries over unresolved — has been sitting inside/around its own entry zone for ~12.5h without confirming a fresh leg down (bar-walk detail in this run's carry-over note). Monday's Asia routine must re-check it first thing.
3. XAUUSD watch item flagged repeatedly this week remains live for Monday: OTE 4081.90-4090.35 (0.618-0.786 of the 4072.80→4115.51 bounce), confluence with a fresh Bullish OB, untested since the bounce — a clean Setup A LONG candidate if M15 confirms a CHoCH/rejection there. UKOIL Setup A short (77.35-77.69 entry) also remains unfilled, price closed 76.595 below the zone — re-evaluate Monday, not published over the weekend per the Friday-late rule.
4. Macro: active Iran/Strait-of-Hormuz escalation (US strikes + Iranian navy declaring the strait closed, 2026-07-12) is a live, material geopolitical risk for oil/gold/broader risk sentiment even though equities/DXY/VIX haven't re-priced it yet (weekend closure) — flag for Monday's macro review, don't treat DXY/VIX's stale Friday close as current. US June CPI due Tuesday 2026-07-14 — standard hard-window news discipline applies.
5. Still zero 90-100 tier trades after three full cycles, and now exactly one 80-89 data point (a loss). Keep tracking rather than drawing conclusions from n=1.
6. Recurring housekeeping still open: NIKKEI data-extraction bug (9 routines), weekend-crypto pre-session-card practice gap (6 routines) — both need Magic's explicit decision, not another silent pass-through.

### 7. Model Portfolio Summary
Start balance (week_start_equity): **$10,000**. End balance (current_equity): **$9,950**. Weekly P&L: **-$50 / -1.0R** (only `sig-085` counted this week; `legacy-078/079/081` were pre-seeded/excluded as pre-go-live cohort, `sig-086` still open and not yet counted). Max daily drawdown this week: **0.5%** (2026-07-10). Total drawdown vs starting balance: **0.5%** (well below the 10% breach threshold). Trades counted: **1**. **Conclusion:** first losing week since go-live, but shallow and structurally explained (SL swept in an active volatility spike on a directionally-correct thesis, not a bad call) — cautious, not alarmed; one trade is nowhere near enough to question the underlying edge. `week_start_equity` updated to $9,950 for next week.

---

## Week of 2026-07-13 — 2026-07-19

**Headline:** A very quiet week by trade count — only 2 trades actually resolved with a win/loss outcome (1W/1L, 50%, net +0.87R), while 3 of the 5 new setups published this week never got filled at all (expired or missed via TP1 pre-trigger), 0R, no position taken. Discipline held throughout, including a violent -2.07% XAUUSD breakdown day (07-16) with zero forced entries in either direction. Loss streak capped at 1 all week, protection mode never close to triggering.

### 1. Weekly performance
5 setups published this week: sig-087 (XAUUSD SHORT, conf 74, Setup B), sig-088 (XAUUSD SHORT, conf 83, Setup B), sig-089 (BTCUSDT LONG, conf 80, Setup A), sig-090 (BTCUSDT LONG, conf 77, Setup B), sig-091 (BTCUSDT LONG, conf 52, Setup B, guarantee-slot, published this run — still PENDING, excluded from stats below). Plus sig-086 (SOLUSDT SHORT, published 07-12, carried in from last week) resolved this week.

Resolved with an actual win/loss outcome: **sig-086 (hit_tp, +1.87R)** and **sig-087 (hit_sl, -1.0R)** → **1W/1L, 50% win rate, net +0.87R**. The other three resolutions this week — **sig-088 (expired)**, **sig-089 (missed)**, **sig-090 (missed)** — all closed at exactly 0R with no position ever taken; these are correctly excluded from win-rate/RR stats (no trade occurred) but are a notable pattern in their own right: **60% of this week's newly-published setups never triggered.** Both sig-089 and sig-090 failed the identical way — a BTC weekend-guarantee pending limit whose OTE pullback never arrived before price ran straight to TP1 (the "TP1 pre-trigger" condition, ROUTINES_V2 §7 krok 2(c)). sig-088 similarly never saw its entry zone in five-plus routine checks before expiring under the new §9a day-based rule.

### Confidence-tier performance
- **70-79:** 2 trades (sig-086 conf 76, sig-087 conf 74) → 1W/1L, **50% win rate**, net **+0.87R**.
- **80-89:** 0 resolved trades with an outcome (sig-088, conf 83, expired without ever filling — a fill-rate data point, not a win/loss one). Still only one all-time 80-89 result (sig-085's loss, prior weeks), unchanged this week.
- **90-100:** still unused, four full cycles running now.

### 2. Best / worst setup of the week
- **Best:** sig-086, SOLUSDT SHORT (Setup B continuation, H1/M30 BOS breakdown into 0.618 OTE), **+1.87R (TP1 hit)** — survived a sharp 3-4x-volume reversal spike within 0.25 of SL before rolling over cleanly, breaking the prior 3-loss streak.
- **Worst:** sig-087, XAUUSD SHORT (Setup B continuation off the CPI-fade breakdown zone), **-1.0R (SL hit)** — entry filled and SL hit within the same M15 bar as a sharp reversal wick, the second consecutive XAU Setup B loss with this exact failure mode (tight entry-to-SL distance swept in one candle), which directly informed sig-088's much wider SL the next day.
- **Honorable mention (not a loss, but a pattern):** sig-089 and sig-090 (both BTCUSDT LONG, both guarantee-slot publishes) both missed via TP1 pre-trigger in consecutive weekend routines — worth tracking as a structural theme, not a scoring failure (see §5 below).

### 3. Execution and discipline review
No setups were forced outside the guarantee mechanism. The one guarantee-ladder publish this week (sig-091, confidence 52, explicitly labeled "Niska jakość — publikacja z tytułu gwarancji sesyjnej") is the system working exactly as designed — an honest, disclosed low-confidence fill of the BTC weekend guarantee slot rather than either an inflated score or a silent skip. The 60% no-fill rate among this week's new setups (3 of 5) is itself evidence against over-publishing: none of the three were forced trades, all three were struck down by their own entry/expiry logic exactly as intended (§9a day-based expiry for sig-088, §7 krok 2(c) TP1-pre-trigger for sig-089/090).

Two infrastructure issues resolved themselves during the week and are worth noting for the record rather than repeating as open items: the NIKKEI (`CAPITALCOM:JP225`) data-extraction bug that had persisted 17+ consecutive routines appears resolved as of 2026-07-17 (no repeat since); the scheduler timing-anomaly streak (6 consecutive anomalous fires around 2026-07-16) also did not recur for the remainder of the week (07-17 and both crypto weekend days ran on/near their labeled slots). Both remain worth Magic's awareness but no longer need active daily flagging unless they recur.

A genuine bookkeeping bug was found and fixed this run (see §7 below): `model_portfolio.json`'s `week_start_equity` had been left at the post-sig-086-win value (10043.03) instead of the true start-of-week balance (9950), understating this week's P&L by exactly sig-086's win. Corrected in place.

### 4. Mistakes and improvements
1. **Pullback-entry fill-rate pattern (new this week, worth tracking):** three of five new setups this week were pullback/OTE-style entries (Setup B or deep-OTE Setup A) that never got filled — two via TP1-pre-trigger on BTC (sig-089, sig-090, both in a strong shallow-retrace H1 uptrend) and one via full-day expiry on XAU (sig-088, price trended away without returning). This isn't a rule violation — each one correctly followed its own entry logic — but it's the same failure shape three times in one week. sig-090's own `lesson_learned` (logged this run) already flags it: worth evaluating whether the current OTE-depth convention (0.618-0.786, or 0.5-0.618 as a shallower alternative) is systematically too conservative for markets currently trending with only shallow retracements, rather than assuming this is coincidence.
2. **sig-087 lesson (carried forward, already actioned):** the tight entry-to-SL distance pattern that cost sig-085 and sig-087 back-to-back directly produced sig-088's much wider SL (24-32pts vs the ~11-15pt stops that failed twice) — the fix was applied but never got tested in practice since sig-088 never triggered. Still an open validation, not a confirmed fix.
3. **Bookkeeping hygiene:** the `week_start_equity` staleness bug (see §3) is the second data-quality bug caught and fixed in `model_portfolio.json` in as many weeks (after the stray-bracket JSON corruption fixed 2026-07-18) — both were caught by this session's own verification rather than by a dedicated integrity check. Worth considering a lightweight sanity check (e.g., does `week_start_equity` match the `daily_history` entry immediately preceding this week's first trading day?) at the start of every weekly review going forward.

### 5. Edge and patterns
- Confidence 70+ overall (resolved w/ outcome): 2 trades, 50% WR, +0.87R — too small a sample to read into on its own.
- 70-79 tier: 1W/1L, +0.87R. 80-89: 0 resolved-with-outcome trades this week (1 fill-rate data point: 0/1, sig-088 expired). 90-100: still unused.
- Setup type A vs B this week: A (sweep-reversal): 0 resolved-with-outcome trades (sig-089 was type A but resolved missed/0R, not a trade). B (continuation): 2 trades (sig-086 W, sig-087 L) = 1W/1L, +0.87R. Sample too thin to compare against the multi-week A-vs-B trend (A historically undefeated when it does trigger).
- News-day/proximity: neither of this week's two actual trades (sig-086, sig-087) carried an active news-proximity flag — both `news_risk: none`. No news-related losses this week, a change from the pattern established in the first two weekly reviews (though also too small a sample to update that conclusion).
- Session quality: sig-086 resolved during London (TP1 hit ~03:15-03:30 UTC, caught at the 08:30 UK check). sig-087 resolved same-day NY2/evening (~17:30-17:45 UTC). Both single data points, not enough for a session-quality read this week.
- Risk engine: extremely selective all week — dozens of full-watchlist scans (weekday XAU+TRW across 5 daily sessions, plus 6 weekend crypto runs) produced only 5 new setups total, 3 of which self-resolved as non-trades via their own entry/expiry logic rather than ever being forced. The discipline held through a genuinely volatile -2% XAU trend day (07-16) with zero forced entries either direction.
- Protection mode: not triggered, loss streak capped at 1 (sig-087) for the entire week, well below the 4-loss threshold.

### 6. Plan and outlook for next week
1. Track whether the pullback-entry fill-rate pattern (§4.1) persists — if a 4th or 5th OTE-style setup fails to fill via the same TP1-pre-trigger or trend-away mechanism, treat it as a signal to revisit entry-zone depth/timing rather than coincidence.
2. sig-091 (BTCUSDT LONG, guarantee-slot, confidence 52 — explicitly low quality) carries into next week; Monday's Asia routine should re-check it first and treat any fill with appropriate skepticism given the honestly-low score.
3. Confidence tiers remain sparse at the high end — still zero 90-100 trades after four full cycles, and 80-89 has no resolved-with-outcome data point this week either (just one unfilled setup). Continue tracking rather than drawing conclusions.
4. sig-088's widened-SL fix (§4.2) is still unvalidated in practice — flag the next XAU Setup B continuation entry as the real test case.
5. Watch for Monday's `trw2-daily-close` to correctly sweep sig-088/089/090 (all 0R) into `counted_trade_ids` — zero equity impact expected, but confirms the ledger stays complete.
6. FOMC 28-29 July and the ongoing Iran/Strait-of-Hormuz escalation remain live background risk for both gold and crypto going into the week — re-assess macro_conflict scoring if either develops further.

### 7. Model Portfolio Summary
Start balance (week_start_equity): **$9,950** (corrected this run — the file had been left at $10,043.03, the post-sig-086-win value, instead of the true start-of-week balance; see §3/§4 bookkeeping note). End balance (current_equity): **$9,992.82**. Weekly P&L: **+$42.82 / +0.87R** (sig-086 +1.87R and sig-087 -1.0R counted this week; sig-088/089/090, all 0R with no position taken, are not yet swept into `counted_trade_ids` — zero equity impact either way, will be picked up by Monday's daily-close). Max daily drawdown this week: **0.5%** (2026-07-15). Total drawdown vs starting $10,000 balance: **0.07%** (nowhere near the 10% breach threshold). Trades counted: **2**. **Conclusion:** a small positive week on a thin sample — confirms the system is not bleeding capital and the discipline (no forced setups, losses capped at exactly the planned -1.0R) continues to hold, but 2 trades is nowhere near enough to draw a fresh edge conclusion; treat as steady-state, not confirmation. `week_start_equity` reset to $9,992.82 for next week.
