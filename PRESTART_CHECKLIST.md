# Checklista przedstartowa automatu — TRW Trading System

Uruchom przed każdą sesją analizy. Auto-weryfikacja: `tv prestart-check`.
Pozycje oznaczone ⚙ sprawdza CLI automatycznie. Pozostałe — weryfikacja manualna.

---

## 1. System / środowisko

- [ ] Internet działa, TradingView Desktop uruchomiony, CDP na porcie 9222 aktywny (`tv_health_check`).
- [ ] Platforma / VPS: brak reconnectów, brak errorów w konsoli Node.js.
- [ ] ⚙ Czas systemowy zgodny z UTC (dopuszczalne odchylenie ≤ 30s). CLI sprawdza `Date.now()` vs systemowy.
- [ ] Sesja, którą automat ma analizować, to faktycznie ta właściwa — potwierdź godzinę London (BST/GMT).

## 2. Pipeline §7b / screeny

- [ ] ⚙ `validateM15Screenshot` na aktywnym screenie: `meta.json.timeframe == "15"` → true.
- [ ] ⚙ Karta planu osadza `*_m15_standard_*.png` (nie H1). Badge na karcie = PLAN LONDYN/ASIA/NY, nie STATUS CARRY-OVER.
- [ ] ⚙ Logo ładuje się z `assets/trw_logo.jpg` (46×46px) — plik istnieje i jest czytelny.
- [ ] ⚙ Sekcja PLAN ma poprawne pola systemowe (session, lifecycle, setup_type, rr_planned, confidence, news_risk).

## 3. Logika planu / pamięć

- [ ] ⚙ `memory/active_setups.json`: co najmniej jeden setup z `lifecycle: "active"` lub `"pending"`.
- [ ] ⚙ `screenshot_m15_path` ustawione (nie null) dla każdego aktywnego setupu.
- [ ] ⚙ `memory/MEMORY.md` zawiera wpis `feedback_fibonacci_gold.md` (0.618 entry, 1.272/1.618 TP).
- [ ] ⚙ `memory/MEMORY.md` zawiera wpisy: London time, M5 scalp, confidence progi, logo source.
- [ ] Scoring/confidence zaktualizowany: nowy próg ~65% wysokiej confidence, liquidity swing jako bonus (+5%), nie warunek.

## 4. Automat analizy

- [ ] ⚙ Scheduler / scheduled task dla tej sesji jest włączony i zaplanowany na właściwą godzinę.
- [ ] ⚙ Logi ostatniego runu: brak `"failed"`, `"error"`, `"timeout"` w ostatnich 50 liniach.
- [ ] Ostatni run zakończył się normalnie (exit 0, pełny pipeline do Telegrama).

## 5. Plan sesji / news

- [ ] Kalendarz makro: brak high-impact news (USD, GBP, EUR) w trakcie pierwszej godziny sesji.
  Jeśli jest → automat nie wchodzi w nieplanowane okno; NO TRADE ZONE do +30 min po newsie.
- [ ] Bias GOLD (D1/H4) potwierdzony: setup legacy-071 nadal ważny.
  Niespełnione gdy: CHoCH na H1/H4 przeciw kierunkowi, nowe HH/LL negujące strukturę, SL touch.
- [ ] Entry box legacy-071 (4146.73–4163.06) świeży — cena go jeszcze nie naruszyła (M15 close inside = invalid).

---

## Auto-weryfikacja: `tv prestart-check`

```
node src/cli/index.js prestart-check [--id legacy-071]
```

Zwraca JSON z listą wszystkich pozycji ⚙ i ich statusem (pass/fail/warn).
Pozycje manualne (internet, VPS, news, bias) — wypisuje przypomnienie z linkami.

---

## Changelog

| Data | Zmiana |
|---|---|
| 2026-07-07 | Inicjalny dokument. Pipeline §7b M15, PLAN [SESJA], M5 scalp, Fibonacci gold, London time, logo source. |
