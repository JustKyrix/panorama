# Panorama — ADBK Startseite

Ein moderner Neubau der Startseite des **Albrecht-Dürer-Berufskollegs** Düsseldorf
(Schulprojekt, LF11). Die Seite übernimmt Struktur, Farbwelt und Inhalte des
Originals und überträgt sie in ein aktuelles Front-End: **Bootstrap 5.3 aus dem
Sass-Quellcode**, eine eigene **SCSS-Bibliothek nach dem 7-1-Muster** und
durchgängig responsives, zugängliches Markup.

> Nur die Startseite wurde umgesetzt. Weiterführende Links sind Platzhalter.

---

## Schnellstart

```bash
cd website
npm install
npm run build      # CSS einmalig bauen
npm start          # Sass im Watch-Modus
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
| `npm run prefix` | Autoprefixer über das kompilierte CSS laufen lassen |
| `npm run build` | Kompletter Produktions-Build (`build:css` → `prefix` → `build:min`) |

---

## Projektstruktur

```
panorama/
└── website/
    ├── index.html                 # die komplette Startseite
    ├── package.json
    ├── assets/
    │   ├── css/main.css           # kompiliert – nicht von Hand bearbeiten
    │   ├── js/main.js             # Progressive Enhancement
    │   ├── js/vendor/             # Bootstrap-Bundle (damit die Seite ohne npm läuft)
    │   └── images/                # Signet + 16 Partnerlogos
    └── scss/
        ├── main.scss              # einziger Einstiegspunkt
        ├── vendors/_bootstrap.scss
        ├── abstracts/             # variables, functions, mixins (erzeugt kein CSS)
        ├── base/                  # tokens, reset, typography, utilities
        ├── layout/                # header, footer, section-Rhythmus
        ├── components/            # pillar-card, news-card, field-card, mosaic …
        └── sections/              # hero, pillars, about, news, fields, dates, contact
```

---

## SCSS-Architektur

**7-1-Muster auf dem Sass-Modulsystem.** Im gesamten Projekt kommt kein
`@import` vor — das ist in Dart Sass abgekündigt und zieht alle Variablen in den
globalen Namensraum. Stattdessen deklariert jede Datei per `@use` genau das, was
sie braucht:

```scss
@use "../abstracts/variables" as v;
@use "../abstracts/mixins" as mx;
```

**Bootstrap wird konfiguriert, nicht überschrieben.** `vendors/_bootstrap.scss`
lädt das Framework über `@use ... with ()`. Dadurch stehen die Projektwerte
schon fest, *bevor* Bootstrap seine Maps, Utilities und CSS-Variablen daraus
aufbaut — es ist kein einziges `!important` nötig:

```scss
@use "bootstrap/scss/bootstrap" with (
  $primary: v.$blue,
  $theme-colors: $adbk-theme-colors,
  $spacers: $adbk-spacers,
  …
);
```

Weil die Signetfarben in `$theme-colors` liegen, erzeugt die Utility-API
automatisch `.bg-magenta`, `.text-lime`, `.btn-lime`, `.border-sand` usw. Die
Abstandsskala ist um `6`, `7`, `8` erweitert, sodass `py-7` und `gap-6`
existieren.

**Sass-Variablen vs. CSS-Custom-Properties.** Sass-Variablen für alles, was zur
Compile-Zeit feststeht (Maps, Farbmathematik, Schleifen); CSS-Variablen für
alles, was zur Laufzeit gelesen wird — `base/_tokens.scss` spiegelt die Palette
per `@each` in `--adbk-*`.

**Fluid statt Breakpoint-Treppe.** `fluid($min, $max)` in `abstracts/_functions`
rechnet ein `clamp()` aus, das zwischen 360 px und 1440 px linear skaliert.
Schriftgrößen und Sektionsabstände brauchen deshalb keine Media Queries.

---

## Layout-Regeln

Die Wahl zwischen Flexbox und Grid folgt im ganzen Projekt einer Regel:

| Muster | Technik | Wo |
| --- | --- | --- |
| **Bild + Text** — zwei Blöcke auf einer Achse | `display: flex` (`split`-Mixin) | Hero, Willkommen, Termine, Kontakt |
| **4 / 4-Karten** — gleichwertige Kacheln, zweidimensional | `display: grid` | Bildungswege, Fachbereiche, News, Partner, Footer |

Abstände entstehen über **`gap`** auf dem Elternelement, nicht über `margin`
zwischen Geschwistern: `gap` kollabiert nicht, verdoppelt sich nicht und hängt
nicht am letzten Kind. `margin` bleibt für Zentrierung und bewusste Ausreißer.

Kartenraster nutzen `repeat(auto-fit, minmax(…, 1fr))` und fließen dadurch ohne
eine einzige Media Query von vier auf drei, zwei und eine Spalte um.

---

## Zugänglichkeit & Performance

- Semantisches Markup: `header`, `nav`, `main`, `section`, `article`, `footer`;
  Überschriften in korrekter Reihenfolge; Skip-Link zum Inhalt.
- Mobile Navigation über Bootstraps Offcanvas — Fokusfalle und ARIA inklusive.
- Sichtbarer, einheitlicher `:focus-visible`-Ring; dekorative Grafiken mit
  `aria-hidden`; `<dl>` für Kontaktdaten.
- `prefers-reduced-motion` schaltet **alle** Animationen global ab.
- JavaScript ist reine Verbesserung: Inhalte sind ohne JS vollständig lesbar.
  Die Einblend-Animation wird erst per JS aktiviert, damit ohne JS nichts
  unsichtbar bleibt.
- `IntersectionObserver` statt Scroll-Listener; Bilder unterhalb des Falzes mit
  `loading="lazy"`; `width`/`height` gesetzt, um Layout-Shift zu vermeiden.

---

## JavaScript

`assets/js/main.js` — ohne Framework, ohne Abhängigkeiten:

- **Sticky Header** — Schatten ab dem ersten Scroll (Sentinel + Observer).
- **Scroll-Reveal** — gestaffeltes Einblenden per `data-reveal`.
- **Count-Up** — Kennzahlen im Hero, formatiert über `Intl.NumberFormat("de-DE")`.
- **Scrollspy** — markiert den aktiven Navigationspunkt via `aria-current`.
- **Ticker** — pausiert, sobald der Tab in den Hintergrund wechselt.

---

## Hinweis

Schulprojekt zu Übungszwecken. Signet und Partnerlogos gehören dem
Albrecht-Dürer-Berufskolleg bzw. den jeweiligen Organisationen. Original:
<https://bk-albrecht-duerer.eschool.de/adbk_wordpress/>
