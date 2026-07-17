# TRW — Automated Briefing Routines (v1, ARCHIVED 2026-07-04)

> **Superseded by `ROUTINES_V2.md`.** During the 2026-07-04 routine architecture reset it was discovered these 7 tasks were never actually registered in the scheduler (`list_scheduled_tasks` returned empty despite the SKILL.md files existing on disk) — they never fired automatically. 11 new tasks (`trw2-*`) were created properly via `create_scheduled_task` per the new schedule/logic in `ROUTINES_V2.md`. This file is kept as historical reference for the card template/sequence conventions it documents, which v2 still reuses.

Automatyczne analizy uruchamiane przez Claude Code Scheduled Tasks (Mon–Fri).
Zarządzanie: sidebar → **Scheduled** → kliknij task.

---

## Harmonogram

| Czas (London) | Task ID | Sesja | Output | Telegram topic |
|---|---|---|---|---|
| **01:30** | `trw-briefing-0130` | Asian Open | Karty sygnałowe ≥60% | xau / waluty / indeksy / krypto |
| **07:00** | `trw-briefing-0700` | London Pre-Open | Plan Dnia HTML karta (wszystkie symbole) | plan |
| **08:30** | `trw-briefing-0830` | London Open | Karty sygnałowe ≥60% | xau / waluty / indeksy / krypto |
| **13:00** | `trw-briefing-1300` | Mid-London / pre-NY | Karty sygnałowe ≥60% | xau / waluty / indeksy / krypto |
| **15:00** | `trw-briefing-1500` | NY Open ⭐ | Karty sygnałowe ≥60% | xau / waluty / indeksy / krypto |
| **18:00** | `trw-briefing-1800` | NY Mid-Session | Karty sygnałowe ≥60% | xau / waluty / indeksy / krypto |
| **21:50** | `trw-eod-2150` | EOD | Wyniki dnia + bias jutro (piątek = tygodniowe) | wyniki |

---

## Watchlista

| Grupa | Symbole | Temat Telegram |
|---|---|---|
| XAU | XAUUSD | `xau` |
| WALUTY | EURUSD, USDJPY, XAGUSD | `waluty` |
| INDEKSY | SP500, DJ30, NAS100, GER40, NIKKEI, UK100, UKOIL | `indeksy` |
| KRYPTO | BTCUSDT, ETHUSDT | `krypto` |
| MAKRO (cross-check) | TVC:DXY, TVC:VIX | — |

---

## Sekwencja analizy (każdy symbol, każdy briefing)

```
0. draw_clear()                                    ← ZAWSZE pierwszy
1. chart_set_symbol + chart_set_timeframe("D")     ← D1 bias
2. chart_set_timeframe("240")                      ← 4H bias
3. chart_set_timeframe("60")                       ← H1 bias
4. chart_set_timeframe("15")                       ← M15 precyzja
5. chart_set_timeframe("5")                        ← M5 trigger
6. data_get_pine_boxes("Order Block Detector")     ← OB/FVG strefy entry
7. data_get_pine_labels("ICT Pro", max=50)         ← BOS/CHoCH/FVG/Sweep
8. data_get_pine_labels("Liquidity Swings", max=50) ← Fib 0.618/1.618, swing H/L
9. data_get_pine_labels("Smart Money Concepts", max=50) ← EQH/EQL/BOS
10. data_get_pine_lines()                          ← poziomy poziome
11. data_get_study_values("Moving Average Ribbon") ← EMA bias (cena vs EMA)
12. quote_get                                      ← live cena
```

**07:00 dodatkowo:** chart_set_timeframe("30") → M30 po H1 (krok 3.5)

---

## Format outputu

### Briefingi sygnałowe (01:30 / 08:30 / 13:00 / 15:00 / 18:00)

Tylko dla setupów ≥60%. Generują:

1. **Wykres PNG** (`chart-render`) — dark theme, SL/TP/Entry narysowane
2. **Karta HTML** (light theme, white #ffffff, akcent #b87e0a):
   - Header: logo TRW + data + bias badge (LONG/SHORT/NEUTRAL)
   - Symbol + live cena
   - Wykres PNG embedded
   - Kontekst rynkowy (narracja z poziomami)
   - Bias tiles: D1 / 4H / H1 / Probability %
   - Plan sesyjny: London box + NY box
   - Scenariusze A / B / C z % badge
   - Fibonacci: OTE 0.618–0.786 + Extension 1.272/1.618
   - Poziomy: Entry / SL / TP1 / TP2 / TP3
3. **Render PNG** (`card render --width 800`)
4. **Telegram** (`telegram send-doc --topic <xau|waluty|indeksy|krypto>`)

### Plan Dnia (07:00)

Jedna zbiorcza karta HTML ze wszystkimi symbolami:
- Makro: DXY + VIX
- Kalendarz ForexFactory High Impact + NO TRADE zones
- XAU priorytet + wykres M15 (jeśli setup ≥60%)
- Wszystkie symbole: bias tiles D1/4H/H1/M30/M15/M5 + probability
- `telegram send-doc --topic plan`

### EOD Review (21:50)

- Czyta `trade_log.md` → sprawdza aktywację setupów (M5 OHLCV od czasu sygnału)
- Liczy RR realny, TP/SL hit chronologicznie
- Karta HTML: wyniki, DXY korelacja, wnioski, bias na jutro
- Piątek: + tygodniowe statystyki (win rate, best setup, per dzień)
- `telegram send-doc --topic wyniki`

---

## Zasady krytyczne

- **No stale setups** — `quote_get` (po `chart_set_symbol`) sprawdza TP przed wysłaniem
- **NIE używaj MCP** `telegram_send_signal` / `telegram_send_text` — zawsze "fetch failed"
- **Bash CLI** dla Telegrama: `node src/cli/index.js telegram send-doc ...`
- **Fib 0.618/1.618** zawsze z danych Liquidity Swings labels
- **draw_clear()** przed KAŻDYM `chart_set_symbol`
- Scheduled tasks wymagają otwartej aplikacji Claude Code

---

## Pierwsze uruchomienie po reinstalacji

Kliknij każdy task → **"Run now"** żeby zatwierdzić zgody (MCP TradingView, Bash).
Po jednorazowym zatwierdzeniu — wszystkie kolejne runy automatyczne bez pytań.
