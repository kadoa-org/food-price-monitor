# US Food Price Monitor

**Live: [kadoa.com/food-prices](https://www.kadoa.com/food-prices)**

Every business day the US Department of Agriculture (USDA) publishes food price data for about 290 commodities: what growers were paid at shipping point, what buyers paid at the big city wholesale markets, and what supermarkets advertised in their weekly ads. It comes out as dozens of separate text reports and PDFs, one per market, with no history and no way to see how a price has moved over time. We think public data should be simple to find and read, so we built this tracker.

## What is in it

- USDA's low and high quote for each product, market and package, exactly as reported
- Two years of daily history for every commodity, seven for onions and potatoes
- Change against 4 weeks and a year earlier, with the previous years' range behind each chart
- Weekly supermarket ad prices by region for produce, eggs and meat
- Market news from USDA report comments and Markon crop updates

## Data

**Sources.** 29 USDA Market News reports: shipping point prices from Idaho Falls and Fresno, wholesale prices at six terminal markets (New York, Chicago, Los Angeles, Atlanta, Boston, Philadelphia), shell eggs in New York and the national index, and the weekly national retail reports of supermarket ads for produce, eggs, beef, pork, chicken and turkey. USDA data is public domain.

**Pipelines.** A [Kadoa](https://www.kadoa.com) pipeline collects each USDA report after it is published, keeps every record in SQLite and exports the dataset. A Kadoa workflow collects the Markon updates. The pipeline code is not public yet; we are cleaning it up and will open source it here.

**Integration.** The build reads the latest export from a CDN and prerenders every page. The browser fetches per-product history and CSV downloads from the same CDN. This repository holds the site only.

## Run it locally

```sh
bun install
DATA_SOURCE=cdn bun run dev   # http://127.0.0.1:5188/food-prices/
bun test
```

With `DATA_SOURCE=cdn` the dev server reads the published data from the CDN, so the site runs without the dataset pipeline. `DATA_SOURCE=cdn bun run build` prerenders every page the same way into `dist/food-prices`.

`bun run data` and `bun run publish` rebuild and publish the data from a local export of the pipeline; they need `FOOD_PRICES_DATASET_DIR` and Bunny credentials and are only used by Kadoa.

React, Vite and plain SVG. No chart library, no backend.

MIT licensed. Built by [Kadoa](https://www.kadoa.com).
