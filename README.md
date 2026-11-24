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
| 2 | Teknik- och fundamentaanalys, poängsystem, redigerbar bevakningslista, livekurser | ✅ |
| 3 | Nyheter (RSS + sentiment), bolagshändelser och sidan "Läget idag" med prognoser | ✅ |
| 4 | Världsläget / makro | – |
| 5 | Botten: daglig körning, referensportföljer, backtest, utvärdering | – |
| 6 | Min portfölj, schemaläggning, ljust tema, kortkommandon | – |

---

## ⚡ Enklast: kör i webbläsaren (inget att installera)

1. Klicka här: **<https://codespaces.new/w1lliam881/AI-trading-system?ref=claude/trusting-euler-ncxbli>**
2. Klicka på gröna knappen **Create codespace**.
3. Vänta 2–4 minuter första gången (allt installeras och startar av sig självt).
4. Appen öppnas i en ny flik. Om Chrome blockerar fliken: klicka **Open in Browser**
   i rutan nere till höger, eller fliken **PORTS** → klotet vid port 3000.

Nästa gång: gå till <https://github.com/codespaces> och klicka på din codespace.
Gratis för privatpersoner upp till ca 60 timmar/månad och pausas automatiskt efter
30 minuter utan aktivitet.

---

## 🚀 På din egen dator (dubbelklick)

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

- **Översikt** – tickerband och index med **livekurser** (uppdateras var 20:e sekund), dagens läge
  i korthet, topp 5 idéer, marknadsläge och viktiga nyheter.
- **Läget idag** – den enkla dagsbriefen: vad ser **bra** respektive **svagt** ut, en
  **prognos för 1–4 veckor** per bolag (utifrån nyheter och momentum), vad världsnyheterna kan
  betyda för olika sektorer, och hur träffsäkra prognoserna har varit hittills.
- **Idéer** – alla bolag med poäng 1–10. Klicka på en poäng för att se motiveringen. Filtrera på
  minsta poäng, riktning, risk, horisont, sektor, land, datasäkerhet och pris.
- **Aktiesida** – kursgraf (1D–5Å) med medelvärden, volym och markörer för nyheter (N),
  rapporter (R) och utdelningar (U). Poängkort, prognos, för/emot, nyckeltal mot sektorsnittet,
  nyheter, bolagshändelser och poänghistorik.
- **Inställningar** – lägg till/ta bort bolag, ändra poängvikterna och sentimentordlistan.

## Så läser du poängen

Varje bolag får fem **delpoäng** från 1 (dåligt) till 10 (bra). 5 = neutralt.

| Delpoäng | Förval | Vad den mäter |
| --- | --- | --- |
| Momentum/teknik | 20 % | Kurs mot 50/200-dagars medelvärde, RSI, avkastning 1/3/6 mån, volym |
| Fundamenta | 25 % | P/E, P/S, skuldsättning, vinstmarginal, omsättningstillväxt, direktavkastning – mot sektorsnittet |
| Nyhetsflöde | 20 % | Ton i rubrikerna (ordlista) och om det skrivs ovanligt mycket |
| Makro/sektor | 20 % | Marknadsläge (Risk-on/off), sektorns styrka mot index, världsnyheter för sektorn |
| Bolagshändelser | 15 % | Stora kursrörelser (> 5 %), kommande rapport och utdelning |

**Totalpoängen** är ett viktat snitt. **7 eller mer = Köpintresse, 4 eller lägre = Undvik**,
däremellan **Bevaka**. Saknas data blir delpoängen 5 och märks "otillräcklig data".
**Risk** kommer från kursens svängighet och skuldsättning. **Prognosen** (Positiv/Neutral/Negativ)
är en grov utsikt för de närmaste veckorna – appen sparar den varje dag och mäter i efterhand om
den stämde.

## Bra att veta

- **Svenska aktier** har tickers som slutar på `.ST`, t.ex. `VOLV-B.ST`.
- **Om internet eller Yahoo inte svarar** visar appen senast sparade data och en gul notis.
  Den kraschar inte.
- **Tangentbord:** tryck `/` för att söka.
- **Livekurser:** Yahoo kan ha upp till 15 minuters fördröjning på vissa börser. Den gröna
  "LIVE"-pricken uppe till höger visar när kurserna senast uppdaterades.
- **Nyhetstonen** räknas fram med en ordlista (ingen AI) och är en grov uppskattning.
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
