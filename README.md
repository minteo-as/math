# Matkryds

Et krydsregne-spil med hele tal, brøker, decimaltal, procent og algebra til 9. klasse. Kører i browseren (Vue 3), uden backend og uden login.
Elevens stjerner gemmes kun i browserens `localStorage`.

- Virker uden net, når siden har været åbnet én gang (service worker), og kan installeres som app på Android og føjes til hjemmeskærmen på iPhone.
- Spiller man i browseren på iPhone, iPad eller Android, foreslår forsiden at lægge spillet på hjemmeskærmen (`src/components/InstallHint.vue`, `src/installHint.ts`). iOS har ingen funktion, som et script kan bruge til at installere siden, så der vises en vejledning trin for trin. På Android åbner knappen "Installér" browserens egen installationsdialog, når browseren tilbyder det (`beforeinstallprompt` i Chrome og Samsung Internet) – ellers vises en vejledning. "Ikke nu" huskes i 30 dage.
- Mørk tilstand følger enhedens indstilling.
- Kan spilles med tastatur alene: Tab til brættet eller bunken, piletaster mellem felter og brikker, Enter for at vælge og lægge, Escape for at fortryde et valg.
- Opgaveark: printer-knappen på en bane eller et niveau viser banerne klar til udskrift (én bane pr. side, felter til at skrive i og brikkerne som liste). Der er bevidst intet facit, for siden kan åbnes af alle elever.

## Kom i gang

```bash
npm install
npm run dev        # udviklingsserver
npm test           # tests af motoren og af alle baner
npm run build      # statiske filer i dist/ – kan lægges på enhver webserver
npm run generate   # lav banerne igen (src/data/puzzles.json)
npm run format     # formatér koden med Prettier (CI tjekker med npm run format:check)
```

## CI

`.github/workflows/ci.yml` kører ved hvert push til `main` og ved hver pull request. Den:

- installerer, tjekker formateringen (Prettier), typetjekker og kører tests,
- tjekker, at `src/data/puzzles.json` passer til generatoren,
- bygger og gemmer `dist/` som en zip (under _Artifacts_ på workflow-kørslen, gemmes i 30 dage).

Zip-filen indeholder `index.html`, `.htaccess` og `assets/` direkte i roden og kan pakkes ud på webserveren, som den er.

## Webserver og cache

`public/.htaccess` kommer automatisk med i `dist/`. Den sætter cache-regler på Apache (fx Simply.com):

- `index.html` sendes med `Cache-Control: no-cache`, så browseren altid tjekker, om der er en ny version.
- Filerne i `assets/` har et hash i navnet og må caches i et år (`immutable`).

Uden reglerne kan en browser genbruge en gammel `index.html` efter et deploy. Den peger så på JavaScript-filer, der ikke længere findes, og eleven ser en tom side.

Kræver at serveren tillader `.htaccess` med `Header` (`AllowOverride FileInfo` og `mod_headers`).

Tjek efter deploy:

```bash
curl -sI https://math.sundskard.dk/ | grep -i cache-control                 # no-cache
curl -sI https://math.sundskard.dk/assets/<js-fil> | grep -i cache-control  # max-age=31536000, immutable
```

## Versioner og releases

`package.json` indeholder altid **seneste udgivne version**. Workflowen retter den selv efter hver release, så den skal ikke rettes i hånden.

Versionsnummeret vises nederst på alle sider:

- En **release** viser sit tag, fx `Version 0.2.0`.
- **Andre builds** (lokalt og i CI) viser seneste versions-tag plus commit-id, fx `Version 0.2.0+c344353`. Så kan man se, hvad der faktisk ligger på serveren.

Releases laves **kun på GitHub**:

1. _Releases → Draft a new release_.
2. Skriv et nyt tag, fx `v0.2.0`, og vælg `main` som _target_.
3. Tryk evt. _Generate release notes_ og derefter _Publish release_.

Det starter `.github/workflows/release.yml`. Først tjekker den:

- at versionen følger lige efter seneste udgivne release (eller `package.json`, hvis der ikke er nogen endnu). Fra `0.1.0` er kun `v0.1.1`, `v0.2.0` og `v1.0.0` tilladt,
- at tagget peger på en commit på `main`, og at det ikke er en pre-release.

Derefter:

- kører den de samme tjek som CI og bygger med tagget som version,
- lægger den `matkryds-vX.Y.Z.zip` på releasen,
- committer den den nye version i `package.json` til `main`.

Fejler noget, før zip-filen er lagt op, sættes releasen tilbage til **kladde** (draft), og fejlen står i workflow-kørslen. Ret fejlen, og udgiv kladden igen (eventuelt med et andet tag).

Zip-filen pakkes ud direkte på webserveren.

Tags, der pushes fra kommandolinjen, laver ikke en release.

Tommelfingerregel for versionsnumre:

| Del       | Hvornår                                                        |
| --------- | -------------------------------------------------------------- |
| **patch** | rettelser                                                      |
| **minor** | nye niveauer eller emner                                       |
| **major** | ændringer, der fx gør gemte stjerner ugyldige (nye bane-id'er) |

## Gameplay

- Hver række (vandret og lodret) er en ligning `a ∘ b = c`. Eleven lægger brikker i de tomme felter.
- Brikkerne lægges ved at trække dem eller ved at trykke på en brik og derefter på et felt.
- **Fælde-brikker** er de svar, man får ved typiske fejl (fx `1/2 + 1/3 = 2/5`). På de lave niveauer forklarer spillet fejlen.
- **Tjek** virker, når alle felter er udfyldt. Hvad et tjek afslører, afhænger af niveauet:
  - de lette niveauer (hele tal 1–3, brøker 1–2, decimaltal 1–2, ligninger 1–3, algebra 1–2): hvilke ligninger der er forkerte, plus en forklaring på fejlen
  - de øvrige niveauer: hvilke ligninger der er forkerte
  - (mulighed til svære niveauer senere: kun hvor mange ligninger der er forkerte)
  - Uanset niveau vises det, hvis en brik har den rigtige værdi, men står på den forkerte form.
- **Hints** (under ?-knappen ved siden af Tjek): Hvor starter jeg? · Vis mellemregning · Placér en brik.
- **Stjerner** (intet ur):
  - ★★★ ingen fejlede tjek og ingen hints
  - ★★ højst ét fejlet tjek eller ét lille hint
  - ★ løst; det er også højeste mulige, hvis "Placér en brik" er brugt
- **Forkortning:**
  - niveau 1–3: en uforkortet brik med den rigtige værdi godkendes, men spillet gør opmærksom på det
  - niveau 4+: svaret skal være forkortet (og skrevet som blandet tal på niveau 4)

Spillet er delt op i emner. Hvert emne har sine egne niveauer.

**Hele tal** (bane-id'er `H1-01` osv.) – alle tal på brættet og på brikkerne er mellem −99 og 99 (aldrig 0, 1 eller −1). Banerne er større end i de andre emner (5–9 ligninger).

| Niveau | Indhold                                                                       | Typiske fejl som fælder                                                   |
| ------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 1      | `+` og `−` – mindst to stykker med mente eller lån                            | `47 + 38 = 75` (glemt mente), `52 − 27 = 35` (mindste ciffer fra største) |
| 2      | `·` og `:` – den lille tabel, division går op                                 | nabotallet i tabellen: `7 · 8 = 48`, `56 : 8 = 6`                         |
| 3      | Alle fire regnearter                                                          | som 1 og 2                                                                |
| 4      | Negative tal, alle fire regnearter                                            | `4 − (−3) = 1`, `−3 + 5 = −8`, `−4 · 6 = 24`, `5 − 8 = 3`                 |
| 5      | Store baner med ekstra tomme felter, som kun kan løses ved at se på brikkerne | som 4                                                                     |

- Et negativt tal efter et regnetegn står i parentes på brættet, fx `5 − (−3)`.
- Mellemregningen viser fx ener og tiere for sig, lån, gangetabellen og fortegnsreglerne – uden at give svaret.

**Brøker**

| Niveau | Indhold                               |
| ------ | ------------------------------------- |
| 1      | `+` og `−` med samme nævner           |
| 2      | `+` og `−` med forskellige nævnere    |
| 3      | `·` og `:`, også helt tal · brøk      |
| 4      | Blandede tal                          |
| 5      | Negative brøker, alle fire regnearter |

**Decimaltal og procent** (bane-id'er `P1-01` osv.)

| Niveau | Indhold                                                                      | Typiske fejl som fælder                                   |
| ------ | ---------------------------------------------------------------------------- | --------------------------------------------------------- |
| 1      | Decimaltal `+` og `−`                                                        | `0,7 + 0,25 = 0,32` (ikke komma under komma)              |
| 2      | Decimaltal `·` og `:`                                                        | kommaet forkert: `0,5 · 0,4 = 2` eller `0,02`             |
| 3      | Procent af et tal (`25 % af 80 = 20`) – find delen, procenten eller det hele | `80 + 25`, `20 : 80 = 0,25 %`, `0,25` i stedet for `25 %` |

På decimal- og procentniveauerne har hvert felt en fast skriveform. Procenter skal skrives med %, og alle andre tal skal skrives som decimaltal. En brik med den rigtige værdi, men i den forkerte form, tæller som forkert.

**Algebra** (bane-id'er `A1-01` osv.) – brikkerne er udtryk i x, og `=` betyder, at udtrykkene er ens for alle x.

| Niveau | Indhold                                                     | Typiske fejl som fælder      |
| ------ | ----------------------------------------------------------- | ---------------------------- |
| 1      | Saml led (`2x + 3x`)                                        | `5x²`, `x + 3 = 4x`          |
| 2      | Gange og dividere led (`2x · 3x`, `6x² : 2x`)               | `6x`, `5x²`, `3x²`           |
| 3      | Parenteser: gange ind, minusparentes, sæt uden for parentes | `3x + 2`, `4x − 1`, `2x + 9` |
| 4      | To parenteser og kvadratsætninger                           | `x² + 9`, `x² + 4`           |

- Kun variablen x, hele koefficienter, højst grad 2.
- Parenteser tegnes af feltet: et udtryk med flere led får parentes, når det står i et gange- eller divisionsstykke eller efter et minus. Brikkerne selv har ingen parenteser.
- Ekstra hint på algebra: **Indsæt et tal**. Det viser, hvad de kendte udtryk giver for et bestemt x, og hvad det manglende udtryk derfor skal give. x vælges, så kun den rigtige brik passer. Hintet koster en stjerne som de andre.
- Når det ukendte er et led i et gangestykke (`3 · ? = 6x + 9`), øver eleven at sætte uden for parentes.

**Ligninger** (bane-id'er `L1-01` osv.) – en anden spilmekanik: **ligningstrappen**. Ligningen står øverst, og eleven løser den trin for trin. I hvert trin lægger eleven en operation (fx `−5`, `: 3`, `−2x`) i den stiplede boks og derefter det, der så står på hver side, i rækken under. Nederst står `x = ?`. Emnet ligger før algebra.

| Niveau | Indhold                                               | Typiske fejl som fælder                                                           |
| ------ | ----------------------------------------------------- | --------------------------------------------------------------------------------- |
| 1      | `x + a = b`, `x − a = b` (ét trin)                    | `x + 5 = 12`: `+5` (samme regnetegn), `x = 17` (5 flyttet uden at skifte fortegn) |
| 2      | `ax = b`, `x/a = b` (ét trin)                         | `−3` i stedet for `: 3`, gange/dividere byttet om                                 |
| 3      | `ax + b = c` (to trin)                                | som 1 og 2                                                                        |
| 4      | x på begge sider, `ax + b = cx + d` (tre trin)        | `+2x` i stedet for `−2x`, operationen kun på den ene side                         |
| 5      | Parenteser og brøker: `a(x + b) = c`, `(x + b)/a = c` | som ovenfor                                                                       |

- Et trin er rigtigt, når operationen er udført korrekt på begge sider – sat sammen med rækken under. Tjek markerer de forkerte trin.
- Løsningerne er hele tal. På niveau 1–3 er alle tal positive, fra niveau 4 kan x være negativ.
- Når ligningen er løst, vises prøven: x sat ind i den oprindelige ligning, fx `Prøve: 3 · 5 + 5 = 20 ✓`.
- Hints: "Hvor starter jeg?" markerer det næste trin, og "Vis mellemregning" forklarer, hvad der skal fjernes, eller hvad der skal regnes ud på hver side.
- Udskrift virker også: trappen står med tomme felter og brikkerne under.

## Struktur

```
src/engine/        Ren TypeScript – ingen Vue. Kan testes for sig.
  fraction.ts      Brøkregning og visning (uforkortede brøker bevares)
  value.ts         Brikker (tal eller udtryk) og polynomieregning – tjek og løser regner på polynomier
  algebra.ts       Algebra: typiske fejl, mellemregninger og hintet "Indsæt et tal"
  algebraGenerator.ts  Banegenerator til algebra
  ladder.ts        Ligningstrappen: tjek af trin, løser, hints og prøve
  ladderGenerator.ts  Banegenerator til ligninger
  levels.ts        Emner og niveauer med deres regler (forkortning, feedback-type …)
  evaluate.ts      Tjek af brættet
  solver.ts        Løser: entydig løsning? kan den løses skridt for skridt?
  misconceptions.ts  Typiske fejl → fælde-brikker og forklaringer
  hints.ts         Hints og stjerneberegning
  difficulty.ts    Sværhedsgrad pr. bane (bruges til at sortere banerne)
  generator.ts     Banegenerator (køres på forhånd via npm run generate)
  templates.ts     Layout-skabeloner (højst 7 kolonner af hensyn til mobil – 9 til hele tal)
src/data/puzzles.json  De færdiglavede baner (20 pr. niveau)
                       Brøkbanerne ændrer sig ikke, når der kommer nye emner til,
                       så elevernes gemte stjerner stadig passer til de samme baner.
src/composables/useGame.ts  Spillets tilstand i brugerfladen
src/components/, src/views/  Vue-komponenter
design/ikon.svg     Ikonet (kilde). PNG'erne laves med: node design/render-icons.mjs
scripts/service-worker.ts  Laver dist/sw.js ved build, så spillet virker uden net og kan
                       installeres som app (sammen med public/manifest.webmanifest)
public/favicon.svg  Forenklet ikon til browserfanen (uden tal)
```

Banerne laves af et script, og scriptet tjekker hver bane:

- Der er præcis én løsning.
- Undtagen på brøker 5 og hele tal 5 kan banen løses ved hele tiden at finde en ligning, hvor der kun mangler ét tal.
- Ingen fælde-brik giver også en rigtig løsning.
- På brøk 5 er der altid mindst én ligning at starte med, og fællesnævneren i hver ligning er højst 24.
- Banerne i hvert niveau står fra let til svær (`src/engine/difficulty.ts`: startpunkter, runder, gæt og talstørrelse).
  Stjerner gemt før sorteringen flyttes automatisk med over på samme bane (`formerId`, se `src/progress.ts`).

Alt dette tjekkes igen i `src/engine/puzzles.test.ts`.
Ligningerne tjekkes på samme måde (én løsning, fælderne er forkerte, tallene er hele og højst 99) i `src/engine/ladder.test.ts`.
