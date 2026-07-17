# Project Assets (pointer)

- **Logo:** `assets/trw_logo.jpg` — embed as base64 in every signal card / screenshot per the branding rules in `PROJECT_CONTEXT.md` → Branding section. Already embedded directly in `eod_card_template.html` (no substitution needed there).

- **EOD Review card (APPROVED 2026-07-06):** `context/eod_card_template.html` — dark/gold, logo wbudowane. Sekcje: tiles → RR box → Market Recap → Setups A/B → Sygnały+Wyniki → Execution → Risk Notes → Lessons/Outlook → Model Portfolio → [Weekly piątek]. Render: `card render --width 900`. CSS-embedded colors (RR_BORDER_VAL etc.) podmieniane przez skrypt. Piątek: wstaw WEEKLY_SECTION blok. Locked — nie zmieniaj układu bez re-akceptacji.
- **Card template (rich HTML, light theme):** see `PROJECT_CONTEXT.md` → "Approach & Patterns" and memory `feedback-signal-card-template`. Canonical copy-paste template also lives in the (archived) `C:\Users\Magic\.claude\scheduled-tasks\_signal_template.md`.
- **Screenshot format:** clean chart (indicators hidden except those actually used in the analysis), box entry rectangle + SL/TP horizontal lines, logo watermark — see BOX ENTRY / SCREENSHOTY sections of `ROUTINES_V2.md`.

- **Pre-session analysis card (APPROVED 2026-07-06):** `context/session_analysis_template.html` — rich dark/gold analysis layout (previous setup, context, bias tiles, session plan, scenarios, liquidity map, FVGs, fib, transaction levels, RR tiles). Published before EVERY session for the primary instrument (weekdays XAUUSD → `xau`; weekend BTCUSDT → `krypto`), ALWAYS before any signal cards. Locked — don't redesign.

Do not duplicate the actual HTML/CSS here — this is a pointer file so routine prompts have a stable `context/project_assets.md` path per the v2 file-layout spec.

COMMERCIAL SIGNAL CARD STYLE – GUIDE

**APPROVED 2026-07-05:** Variant A (logo + big ticker top-left, BUY/SELL badge + session/date top-right, chart, 4-tile Entry/SL/TP1/TP2 grid, confidence + disclaimer footer) is the locked house style — approved by Magic after group-approval mockup review. Canonical copy-paste HTML template: `context/commercial_card_template.html`. Use it for every future commercial/marketing card — do not redesign without explicit re-approval. Render via `node src/cli/index.js card render --html "<filled>.html" --out "<out>.png" --width 800`.

Cel:
Zbudować spójny, komercyjny wygląd kart sygnałowych na bazie operacyjnego screena z TradingView:
- wiarygodny (prawdziwy chart),
- czytelny,
- mocno brandingowy,
- nadający się do Telegrama, social i materiałów premium.

Podstawa:
Każda karta komercyjna powstaje na bazie:
- czystego screena operacyjnego (SCREENSHOT STANDARD V3),
- jednego wyraźnego setupu (entry, SL, TP1/TP2/TP3),
- krótkiego opisu.

Layout (propozycja):
1. Tło:
   - ciemne (czarne lub bardzo ciemny szary),
   - wykres zajmuje środkową część poziomu,
   - top/bottom można wykorzystać na tekst i branding.

2. Wykres:
   - świece czytelne, bez wskaźników,
   - BOX ENTRY + SL + TP1/TP2/TP3 jak w screenie operacyjnym,
   - kluczowe poziomy wyróżnione kolorem (np. zielone TP, czerwone SL, neutralny entry box).

3. Tekst:
   - duża nazwa instrumentu w jednym rogu (np. „XAUUSD", „BTCUSDT", „AUD | JPY"),
   - mniejszy podtytuł opisujący setup (np. „Breakout from supply zone", „Retest key level", „London session long"),
   - opcjonalnie mały tag z sesją i datą („London 08:30 UK, 2026-07-05").

4. Branding:
   - logo w jednym rogu (np. lewy górny),
   - spójne kolory brandu (np. jedna główna barwa akcentu),
   - unikać dużych „LIKE & SUBSCRIBE" na kartach stricte sygnałowych – lepsze do contentu edukacyjnego niż do profesjonalnych sygnałów.

5. Minimalizm:
   - mało tekstu, maksimum czytelności,
   - żadnych zbędnych elementów dekoracyjnych,
   - jeden silny fokus: setup + instrument.

Treść sygnału (na karcie lub w opisie):
- Kierunek: BUY / SELL.
- Entry: poziom / zakres.
- SL: poziom.
- TP1/TP2/TP3: poziomy.
- Sesja + czas UK.
- Krótki powód (jedno zdanie).
- Confidence (np. 76/100) jeśli ma sens komunikacyjnie.

Workflow:
1. Wygeneruj czysty screenshot operacyjny (SCREENSHOT STANDARD V3).
2. Na jego bazie przygotuj wersję komercyjną:
   - dodaj większą nazwę instrumentu,
   - dodaj logo,
   - dodaj krótki opis,
   - zachowaj setup w centrum uwagi.
3. Używaj operacyjnego screena w logach, journalu i wewnętrznej analizie.
4. Używaj wersji komercyjnej w:
   - głównym kanale Telegram,
   - social media,
   - materiałach sprzedażowych/pokazowych.

Zasada końcowa:
Karta komercyjna ma być:
- maksymalnie prosta,
- oparta na realnym wykresie,
- mocno brandingowa,
- czytelna w maksymalnie kilka sekund.
Grafika marketingowa nie może ukrywać ani zmieniać rzeczywistych poziomów sygnału.
