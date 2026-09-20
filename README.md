# US Food Price Monitor

**Live: [kadoa.com/food-prices](https://www.kadoa.com/food-prices)**

US produce prices as USDA reports them: what growers were paid at shipping point, what wholesale buyers paid at the New York, Chicago and Los Angeles terminal markets, and what supermarkets advertised each week. 137 fruits and vegetables, updated every business day, with a price chart, year-on-year change and a CSV download for each.

## What is in it

- USDA's low and high quotes per product, market and package, never averaged
- Two years of history for every commodity, seven for onions and potatoes
- Change against 4 weeks and a year earlier, with last year's band drawn behind each chart
- Weekly retail prices from supermarket ads, by region
- Market news: USDA market tone changes plus Markon crop updates

## Data

**Sources.** Eight USDA Market News reports: shipping point prices (Idaho Falls, Fresno), wholesale prices (New York, Chicago, Los Angeles) and the weekly national retail report of supermarket ads. Market news adds USDA report tone changes and Markon crop updates. USDA data is public domain.

**Pipelines.** A [Kadoa](https://www.kadoa.com) pipeline collects the USDA reports after every publication, keeps every record in SQLite and exports the dataset; a Kadoa workflow collects the Markon updates.

**Integration.** The site's build reads the latest export from a CDN and prerenders every page; the browser fetches per-product history and CSV downloads from the same CDN. This repository holds the site only.

## Run it locally

```sh
bun install
bun run dev     # http://127.0.0.1:5188/food-prices/ (needs public/data, see below)
bun test
```

`bun run data` prepares `public/data` from an export of the dataset pipeline (`FOOD_PRICES_DATASET_DIR`). Without that pipeline, point the site at the published data instead: `DATA_SOURCE=cdn bun run build` prerenders every page from the current CDN run into `dist/food-prices`.

React, Vite and plain SVG. No chart library, no backend.

MIT licensed. Built by [Kadoa](https://www.kadoa.com).
