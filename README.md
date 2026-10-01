# Matkryds

Et krydsregne-spil med brøker, decimaltal og procent til 9. klasse. Kører i browseren (Vue 3), uden backend og uden login.
Elevens stjerner gemmes kun i browserens `localStorage`.

## Kom i gang

```bash
npm install
npm run dev        # udviklingsserver
npm test           # tests af motoren og af alle baner
npm run build      # statiske filer i dist/ – kan lægges på enhver webserver
npm run generate   # lav banerne igen (src/data/puzzles.json)
```

## CI

`.github/workflows/ci.yml` kører ved hvert push til `main` og ved hver pull request. Den:

- installerer, typetjekker og kører tests,
- tjekker, at `src/data/puzzles.json` passer til generatoren,
- bygger og gemmer `dist/` som en zip (under *Artifacts* på workflow-kørslen, gemmes i 30 dage).

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

1. *Releases → Draft a new release*.
2. Skriv et nyt tag, fx `v0.2.0`, og vælg `main` som *target*.
3. Tryk evt. *Generate release notes* og derefter *Publish release*.

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

| Del | Hvornår |
|---|---|
| **patch** | rettelser |
| **minor** | nye niveauer eller emner |
| **major** | ændringer, der fx gør gemte stjerner ugyldige (nye bane-id'er) |

## Gameplay

- Hver række (vandret og lodret) er en ligning `a ∘ b = c`. Eleven lægger brikker i de tomme felter.
- Brikkerne lægges ved at trække dem eller ved at trykke på en brik og derefter på et felt.
- **Fælde-brikker** er de svar, man får ved typiske fejl (fx `1/2 + 1/3 = 2/5`). På de lave niveauer forklarer spillet fejlen.
- **Tjek** virker, når alle felter er udfyldt. Hvad et tjek afslører, afhænger af niveauet:
  - de lette niveauer (brøker 1–2, decimaltal 1–2): hvilke ligninger der er forkerte, plus en forklaring på fejlen
  - de øvrige niveauer: hvilke ligninger der er forkerte
  - (mulighed til svære niveauer senere: kun hvor mange ligninger der er forkerte)
  - Uanset niveau vises det, hvis en brik har den rigtige værdi, men står på den forkerte form.
- **Hints:** Hvor starter jeg? · Vis mellemregning · Placér en brik.
- **Stjerner** (intet ur):
  - ★★★ ingen fejlede tjek og ingen hints
  - ★★ højst ét fejlet tjek eller ét lille hint
  - ★ løst; det er også højeste mulige, hvis "Placér en brik" er brugt
- **Forkortning:**
  - niveau 1–3: en uforkortet brik med den rigtige værdi godkendes, men spillet gør opmærksom på det
  - niveau 4+: svaret skal være forkortet (og skrevet som blandet tal på niveau 4)

Spillet er delt op i emner. Hvert emne har sine egne niveauer.

**Brøker**

| Niveau | Indhold |
|---|---|
| 1 | `+` og `−` med samme nævner |
| 2 | `+` og `−` med forskellige nævnere |
| 3 | `·` og `:`, også helt tal · brøk |
| 4 | Blandede tal |
| 5 | Negative brøker, alle fire regnearter |

**Decimaltal og procent** (bane-id'er `P1-01` osv.)

| Niveau | Indhold | Typiske fejl som fælder |
|---|---|---|
| 1 | Decimaltal `+` og `−` | `0,7 + 0,25 = 0,32` (ikke komma under komma) |
| 2 | Decimaltal `·` og `:` | kommaet forkert: `0,5 · 0,4 = 2` eller `0,02` |
| 3 | Procent af et tal (`25 % af 80 = 20`) – find delen, procenten eller det hele | `80 + 25`, `20 : 80 = 0,25 %`, `0,25` i stedet for `25 %` |

På decimal- og procentniveauerne har hvert felt en fast skriveform. Procenter skal skrives med %, og alle andre tal skal skrives som decimaltal. En brik med den rigtige værdi, men i den forkerte form, tæller som forkert.

**Algebra** (kommer): reduktion af udtryk. Ligningsløsning kommer senere som en anden spilmekanik.

## Struktur

```
src/engine/        Ren TypeScript – ingen Vue. Kan testes for sig.
  fraction.ts      Brøkregning og visning (uforkortede brøker bevares)
  levels.ts        Emner og niveauer med deres regler (forkortning, feedback-type …)
  evaluate.ts      Tjek af brættet
  solver.ts        Løser: entydig løsning? kan den løses skridt for skridt?
  misconceptions.ts  Typiske fejl → fælde-brikker og forklaringer
  hints.ts         Hints og stjerneberegning
  generator.ts     Banegenerator (køres på forhånd via npm run generate)
  templates.ts     Layout-skabeloner (højst 7 kolonner af hensyn til mobil)
src/data/puzzles.json  De færdiglavede baner (20 pr. niveau)
                       Brøkbanerne ændrer sig ikke, når der kommer nye emner til,
                       så elevernes gemte stjerner stadig passer til de samme baner.
src/composables/useGame.ts  Spillets tilstand i brugerfladen
src/components/, src/views/  Vue-komponenter
```

Banerne laves af et script, og scriptet tjekker hver bane:

- Der er præcis én løsning.
- På niveau 1–4 kan banen løses ved hele tiden at finde en ligning, hvor der kun mangler ét tal.
- Ingen fælde-brik giver også en rigtig løsning.

Alt dette tjekkes igen i `src/engine/puzzles.test.ts`.
