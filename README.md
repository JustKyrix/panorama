# Panorama — ADBK Startseite

Originalgetreuer Nachbau der Startseite des **Albrecht-Dürer-Berufskollegs**
Düsseldorf (Schulprojekt, LF11).

Die Seite übernimmt Layout, Maße und Farbschlüssel des Originals **1:1** — neu
gebaut mit **Bootstrap 5.3 aus dem Sass-Quellcode**, einer eigenen
**SCSS-Bibliothek nach dem 7-1-Muster** und zusätzlich responsiv gemacht.

Original: <https://bk-albrecht-duerer.eschool.de/adbk_wordpress/>

> Nur die Startseite wurde umgesetzt. Weiterführende Links sind Platzhalter.

---

## Schnellstart

```bash
cd website
npm install
npm run build
```

Danach `website/index.html` im Browser öffnen — oder einen kleinen Server starten:

```bash
npx --yes http-server website -p 4173 -c-1
```

### npm-Skripte

| Skript | Zweck |
| --- | --- |
| `npm start` / `npm run watch` | Sass im Watch-Modus (Entwicklung) |
| `npm run build:css` | Einmalig nach `assets/css/main.css` kompilieren |
| `npm run build:min` | Zusätzlich eine komprimierte `main.min.css` erzeugen |
| `npm run build` | Kompletter Produktions-Build |
| `npm run package` | Build + `adbk-site.zip` fürs Deployment schnüren |
| `npm run serve` | Lokalen Server auf Port 4173 starten |

---

## Projektstruktur

```
panorama/
└── website/
    ├── index.html                 # die komplette Startseite
    ├── package.json
    ├── assets/
    │   ├── css/main.css           # kompiliert – nicht von Hand bearbeiten
    │   ├── js/vendor/             # Bootstrap-Bundle (Offcanvas-Menü)
    │   └── images/                # Signet, Titelbild, 16 Partnerlogos
    └── scss/
        ├── main.scss              # einziger Einstiegspunkt
        ├── vendors/_bootstrap.scss
        ├── abstracts/             # variables, functions, mixins (erzeugt kein CSS)
        ├── base/                  # tokens, reset, typography
        ├── layout/                # header, hauptnavi, startseite, footer
        └── components/            # post, icon-bar
```

---

## Originaltreue

Alle Maße stammen aus dem Original-Theme und wurden im Browser gegengemessen:

| Element | Wert |
| --- | --- |
| Inhaltsbreite | 1048 px, zentriert |
| Kopfbereich | 10 rem hoch, Signet max. 120 px |
| Titelbild-Navigation | 33.25 rem hoch, `background-size: auto 100%` |
| Navigationskacheln | 12.5 rem × 12.5 rem, 3.375 rem Abstand, 3 rem Innenabstand oben |
| Teaserkacheln | 12.5 rem × 12.5 rem, `#3357a1` |
| Inhalt / Teaser | 777 px + 32 px + 200 px |
| Newsspalten | 2 Spalten, 2 rem Abstand |
| Footerspalten | 3 × 17.5 rem, 3.375 rem Abstand, `rgb(117,109,107)` |

### Farbschlüssel

Aus dem Kommentarkopf des Original-Stylesheets übernommen:

| Bereich | Hex |
| --- | --- |
| Schulfarbe | `#3357a1` |
| Verwaltung | `#979797` |
| Bau-/Holztechnik | `#928767` |
| BEQ | `#c3d62f` |
| Druck-/Medientechnik | `#c20073` |
| Gastronomie | `#8c2e2a` |
| Gestaltungstechnik | `#d47217` |
| Gesundheitstechnik | `#a3dec7` |
| Berufliche Ausbildung | `#fad200` |
| Fachschulen | `#b80d48` |

Die vier Navigationskacheln liegen mit 80 % Deckkraft über dem Titelbild.

---

## SCSS-Architektur

**7-1-Muster auf dem Sass-Modulsystem.** Im gesamten Projekt kommt kein
`@import` vor — das ist in Dart Sass abgekündigt und zieht alle Variablen in den
globalen Namensraum. Jede Datei deklariert per `@use` genau das, was sie braucht:

```scss
@use "../abstracts/variables" as v;
@use "../abstracts/mixins" as mx;
```

**Bootstrap wird konfiguriert, nicht überschrieben.** `vendors/_bootstrap.scss`
lädt das Framework über `@use ... with ()`. Dadurch stehen die Projektwerte
fest, *bevor* Bootstrap seine Maps, Utilities und CSS-Variablen daraus aufbaut —
kein einziges `!important` ist nötig:

```scss
@use "bootstrap/scss/bootstrap" with (
  $primary: v.$schulfarbe,
  $theme-colors: $adbk-theme-colors,
  $font-family-sans-serif: v.$font-base,
  $container-max-widths: (xl: v.$container, xxl: v.$container),
  …
);
```

Weil der Farbschlüssel in `$theme-colors` liegt, erzeugt die Utility-API
automatisch `.bg-beq`, `.text-schulfarbe`, `.border-gastro` usw.

---

## Layout-Regeln

| Muster | Technik | Wo |
| --- | --- | --- |
| Zwei Blöcke auf **einer** Achse | `display: flex` | Kopfbereich, Kachelreihe, Servicenavigation |
| Gleichwertige Kacheln, **zweidimensional** | `display: grid` | Inhalt + Teaser, Newsspalten, Footerspalten, Partnerlogos |

Abstände entstehen über **`gap`** auf dem Elternelement statt über `margin`
zwischen Geschwistern — `gap` kollabiert nicht und hängt nicht am letzten Kind.

---

## Responsive

Das Original bricht bei 960 px um; der Nachbau nutzt denselben Breakpoint:

- Ab 960 px abwärts: Titelbild aus, Kacheln zweispaltig, Servicenavigation
  klappt in ein **Bootstrap-Offcanvas** (Fokusfalle und ARIA inklusive).
- Ab 454 px abwärts: Kacheln einspaltig, Schrift kleiner.
- Inhalt und Teaser stapeln, Footerspalten fließen über `auto-fit` um.

Geprüft bei 1024 px und 375 px: kein horizontaler Überlauf, keine
Konsolenfehler.

### Ergänzungen gegenüber dem Original

Rein additiv, ohne das Erscheinungsbild zu verändern:

- Skip-Link zum Inhalt, sichtbarer `:focus-visible`-Ring
- semantisches Markup (`header`, `nav`, `main`, `article`, `footer`)
- `loading="lazy"` und feste Maße bei Bildern gegen Layout-Shift
- `prefers-reduced-motion` schaltet Übergänge ab

---

## Deployment

Die Seite läuft auf Plesk unter **<https://panorama.artline-studio.de>**.

Zwei Ziele bei jeder Änderung:

1. **GitHub** – `git push origin main`
2. **Plesk** – Paket bauen und im Webspace entpacken

### Paket bauen

```bash
cd website
npm run package
```

Das erzeugt `website/adbk-site.zip` (CSS wird vorher neu kompiliert) mit
`index.html` und dem kompletten `assets/`-Ordner – rund 2 MB.

`tar` schreibt Pfade mit Schrägstrich. Das ist wichtig: ein mit PowerShells
`Compress-Archive` erzeugtes Archiv nutzt Backslashes, und das Entpacken unter
Linux quittiert das mit einer Warnung.

### Im Plesk hochladen

1. Plesk öffnen → Domain `panorama.artline-studio.de` → **Files**
2. **+ → Upload File** → `adbk-site.zip` auswählen
3. Archiv markieren → **Archive → Extract Files**
4. **„Replace existing files" ankreuzen** – sonst bleibt die alte `index.html` stehen
5. `adbk-site.zip` anschließend wieder löschen, damit sie nicht öffentlich
   abrufbar ist

Der Webspace enthält danach nur `index.html`, `assets/` sowie Plesks eigene
`.php-ini` und `.php-version`.

---

## Hinweis

Schulprojekt zu Übungszwecken. Signet, Titelbild und Partnerlogos gehören dem
Albrecht-Dürer-Berufskolleg bzw. den jeweiligen Organisationen. Die Schrift
*Myriad Web Pro* wird nicht mitgeliefert; wie im Original greift der Font-Stack
auf Arial zurück.
