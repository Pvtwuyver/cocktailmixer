# Cocktailrecepten

Statische pagina met cocktailrecepten, zoek- en filterfunctie op ingrediënt,
en foto's per cocktail. Volgt hetzelfde patroon als het bioscoopproject:
een front-end die een JSON-bestand uitleest, en een script dat dat
JSON-bestand periodiek ververst via GitHub Actions.

## Structuur

- `index.html`, `style.css`, `script.js` — de pagina zelf. Haalt bij het
  laden `data/cocktails.json` op en bouwt daaruit de kaarten, filters en
  het detail-venster per cocktail.
- `data/cocktails.json` — de cocktaildata. Wordt automatisch ververst door
  de workflow; hoeft niet handmatig bewerkt te worden.
- `scripts/scrape.py` — haalt alle cocktails op bij [TheCocktailDB](https://www.thecocktaildb.com/)
  (gratis test-key, geen registratie nodig) en schrijft ze naar
  `data/cocktails.json`.
- `scripts/test_fixture.py` — lokale regressietest met synthetische data,
  werkt zonder internetverbinding.
- `.github/workflows/update-data.yml` — draait `scrape.py` elke maandag
  05:00 UTC en commit de ververste data. Ook handmatig te starten.

## Databron en foto's

Deze pagina gebruikt TheCocktailDB in plaats van de officiële IBA-lijst,
omdat TheCocktailDB foto's per cocktail meelevert. Zie
`cocktail-databronnen.md` in het Claude-project voor de afweging tussen
beide bronnen. Het gratis niveau van TheCocktailDB heeft geen
gedocumenteerde limiet op dit zoek-per-letter endpoint; mocht dat ooit
veranderen, dan is overstappen naar de IBA-dataset (zonder foto's, of met
eigen foto's) een kleine aanpassing in `scrape.py`.

**Belangrijk over de meegeleverde `data/cocktails.json`:** dit startbestand
bevat een deel van het alfabet (methodisch verzameld tijdens het bouwen van
deze pagina, in een omgeving zonder rechtstreekse internettoegang). Draai
de workflow één keer handmatig na het inrichten van de repository (zie
hieronder) om de volledige, actuele set op te halen.

## Eigen foto's / opmaak toevoegen

Er is bewust ruimte gelaten om later een eigen headerfoto toe te voegen:

- Zet een afbeelding neer op `images/header.jpg` (map zelf aanmaken).
- Open `style.css` en vervang in `.site-header` de achtergrondkleur door
  bijvoorbeeld:
  ```css
  .site-header {
    background: linear-gradient(rgba(43,38,32,0.55), rgba(43,38,32,0.55)),
                url("images/header.jpg") center/cover;
    color: #fff;
  }
  ```
- De kleuren van de pagina (accentkleur, achtergrond) staan gebundeld
  bovenaan `style.css` onder `:root`, aan te passen zonder de rest van het
  bestand door te hoeven.

## Lokaal bekijken

```bash
python3 -m http.server 8000
```
en open `http://localhost:8000/index.html`. Werkt met de meegeleverde
`data/cocktails.json`, geen internet of API-key nodig.

## Op GitHub Pages zetten

Zie `github-pages-context.md` in het Claude-project voor de volledige
uitleg (uploaden via de website, mapstructuur behouden, etc.). Kort
samengevat, eenmalig na het aanmaken van de repository:

1. **Settings → Actions → General → Workflow permissions** → "Read and
   write permissions" → Save. Nodig zodat de workflow de ververste data
   kan terugcommitten.
2. **Settings → Pages** → Source = "Deploy from a branch", Branch = `main`,
   map = `/ (root)` → Save.
3. Tabblad **Actions** → "Update cocktail data" → **Run workflow**, om de
   volledige dataset op te halen (zie hierboven).

Geen API-key nodig — TheCocktailDB werkt op het gratis niveau met een
vaste test-key die al in `scripts/scrape.py` staat.
