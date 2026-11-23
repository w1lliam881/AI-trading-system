# Terminalen

En lokal "mäklarterminal" som körs på din egen dator. Den analyserar marknaden, nyheter och
bolagshändelser och ger regelbaserade investeringsidéer med poäng 1–10. Den får också en
låtsashandlare ("Botten") som handlar med 10 000 låtsaskronor.

> **Ej finansiell rådgivning.** Allt är regelbaserade bedömningar som kan vara fel.
> Appen loggar aldrig in någonstans och gör aldrig riktiga affärer. Den länkar bara till Avanza.

**Allt är gratis:** inga API-nycklar, inga konton, inga AI-tjänster. Kursdata kommer från
Yahoo Finance via det öppna paketet `yahoo-finance2`.

---

## Status

| Fas | Innehåll | Klar |
| --- | --- | --- |
| 1 | Grund, design, Översikt, Idéer, Aktiesida med riktiga kursgrafer | ✅ |
| 2 | Teknik- och fundamentaanalys, poängsystem, redigerbar bevakningslista | – |
| 3 | Nyheter (RSS + sentiment) och bolagshändelser | – |
| 4 | Världsläget / makro | – |
| 5 | Botten: daglig körning, referensportföljer, backtest, utvärdering | – |
| 6 | Min portfölj, schemaläggning, ljust tema, kortkommandon | – |

---

## 🚀 Snabbstart – det enkla sättet

1. **Installera Node.js** (bara första gången): gå till <https://nodejs.org/sv/download>,
   ladda ner **LTS** och installera som vanligt (klicka Nästa/Fortsätt hela vägen).
2. **Ladda ner Terminalen:** på GitHub-sidan, klicka på gröna knappen **Code → Download ZIP**.
   Packa upp ZIP-filen (dubbelklicka på den).
3. **Dubbelklicka på startfilen** i den uppackade mappen:
   - Mac: **`Starta Terminalen (Mac).command`**
     (första gången: högerklicka → **Öppna** → **Öppna**, eftersom Mac varnar för nedladdade filer)
   - Windows: **`Starta Terminalen (Windows).bat`**
     (om Windows varnar: klicka **Mer information → Kör ändå**)

Första gången installeras allt automatiskt (1–3 minuter). Sedan öppnas appen av sig själv i
webbläsaren. **Låt det svarta fönstret vara öppet** medan du använder appen – stäng det för att
stänga av. Nästa gång startar det på några sekunder.

---

## Installation för den vane (terminal)

1. **Installera Node.js** (version 20 eller senare) från <https://nodejs.org> – välj "LTS".
   Kontrollera i en terminal:

   ```bash
   node -v
   ```

2. **Hämta koden** (om du inte redan har den) och gå in i mappen:

   ```bash
   git clone https://github.com/w1lliam881/AI-trading-system.git
   ```

   ```bash
   cd AI-trading-system
   ```

3. **Installera paketen** (tar en minut eller två):

   ```bash
   npm install
   ```

## Starta appen

```bash
npm run dev
```

Öppna sedan <http://localhost:3000> i webbläsaren. Stäng av med `Ctrl + C` i terminalen.

Första sidladdningen tar några sekunder eftersom kursdata hämtas. Därefter sparas allt i en
lokal databas (`data/terminalen.db`) och samma data hämtas inte igen inom 15 minuter.

## Sidorna

- **Översikt** – tickerband med index, valutor, råvaror, VIX och USA:s 10-årsränta, indexkort och
  dagens största rörelser.
- **Idéer** – alla bolag i bevakningslistan. Klicka på kolumnrubriker för att sortera, filtrera på
  sektor, land, namn och pris.
- **Aktiesida** (klicka på ett bolag eller sök med `/`) – interaktiv kursgraf (1D, 1V, 1M, 6M, 1Å,
  5Å) med glidande medelvärden (MA50, MA200) och volym, samt kursstatistik.
  Knappen **Öppna på Avanza** öppnar Avanzas sökning för bolaget i en ny flik.

## Bra att veta

- **Svenska aktier** har tickers som slutar på `.ST`, t.ex. `VOLV-B.ST`.
- **Om internet eller Yahoo inte svarar** visar appen senast sparade data och en gul notis.
  Den kraschar inte.
- **Tangentbord:** tryck `/` för att söka.
- Kursdata från Yahoo kan vara fördröjd ca 15 minuter.

## Teknik (för den nyfikne)

Next.js (App Router) + TypeScript · Tailwind CSS · UI-komponenter i shadcn/ui-stil
(Radix + Tailwind, ligger direkt i `components/ui`) · TradingView lightweight-charts ·
Recharts · SQLite (better-sqlite3) · Zod · rss-parser · tsx för skript.

```
app/                 Sidor (Översikt, Idéer, Aktiesida …) och API-rutter
components/          UI-komponenter, grafer och layout
lib/data/            Hämtning av data (Yahoo) + sammanställning
lib/analysis/        Analysmoduler (ren kod, inga AI-anrop)
lib/cache.ts         Cache i SQLite med 15-minutersregel och reservdata vid fel
data/                Lokal databas (skapas automatiskt)
```
