// A composite index for the site's headline.
//
// Method, and why. BLS has used a geometric mean, the Jevons formula, for most basic CPI indexes since January
// 1999, because it allows for a little substitution as relative prices move within a category. That is the right
// elementary formula here and it is what this uses.
//
// The hard part is not the formula, it is that this basket breathes. Onions stop being quoted for 73 days when
// the growing region stops shipping, products enter and leave, and a commodity quoted today may have no quote
// last week. An index computed over "whatever was quoted this week" would move whenever the basket changed
// rather than when prices did, which is the classic way to publish a number that is wrong.
//
// So the index is matched-model and chained: for each step, the geometric mean is taken over only those series
// quoted in BOTH the current period and the previous one, and that ratio is multiplied into a running level.
// A commodity that disappears stops contributing without dragging the level, and one that returns rejoins at
// its own price without a jump. This is standard practice for elementary aggregates.
//
// What this is not: it is unweighted. We have no expenditure weights, so every commodity counts the same, and
// a pound of mushrooms moves the number as much as a pound of potatoes. That is stated on the page rather than
// hidden, and it is the honest limit of what this data can support.

export const BASE_VALUE = 100;

// Prices are compared like with like: the same series, one period apart. The value used is whatever single
// figure that series reports, the middle of a quoted range or the published average.
const valueOf = (row) => {
  if (row.advertised_average !== null && row.advertised_average !== undefined) return row.advertised_average;
  if (typeof row.low === 'number' && typeof row.high === 'number') return (row.low + row.high) / 2;
  return row.low ?? row.high ?? null;
};

// The week a date falls in, keyed by its Monday, so daily and weekly reports aggregate to the same grid.
export function weekOf(date) {
  const d = new Date(date);
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

// One price per series per week: the mean of that week's quotes, so a series reporting five times a week does
// not outvote one reporting once.
export function weeklyPrices(series) {
  const weeks = new Map();
  for (const s of series) {
    for (const row of s.observations) {
      const value = valueOf(row);
      if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) continue;
      const week = weekOf(row.date);
      const byId = weeks.get(week) ?? new Map();
      const acc = byId.get(s.id) ?? { sum: 0, n: 0 };
      acc.sum += value;
      acc.n++;
      byId.set(s.id, acc);
      weeks.set(week, byId);
    }
  }
  return new Map(
    [...weeks.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([week, byId]) => [week, new Map([...byId].map(([id, a]) => [id, a.sum / a.n]))]),
  );
}


// The chained index. `minMatched` refuses to publish a step computed from too few series, because a ratio over
// three commodities is noise wearing the clothes of an index; such a week carries the level forward unchanged
// and is marked thin so the page can say so.
// `startWhenMatched` is the honesty guard. This dataset holds one report back to 2019 and everything else only
// from late 2024, so a chain begun at the earliest date would be a single commodity wearing the label of a food
// index for five years. The published series therefore starts at the first week the basket is actually broad,
// and is rebased to 100 there.
// With `weights` and `stratumOf`, the index is built the way BLS builds the CPI from its basic indexes: an
// unweighted geometric mean within each category, then a weighted combination across categories. A category with
// no matched series in a week drops out and the remaining weights are renormalised, so a missing category never
// drags the step toward zero.
export function buildIndex(series, { minMatched = 20, startWhenMatched = 100, weights = null, stratumOf = null } = {}) {
  const strata = new Map(series.map((s) => [s.id, stratumOf ? stratumOf(s) : 'all']));
  const weekly = weeklyPrices(series);
  const weeks = [...weekly.keys()];
  if (weeks.length < 2) return { base: null, points: [] };
  const points = [];
  let level = BASE_VALUE;
  let previous = weekly.get(weeks[0]);
  points.push({ week: weeks[0], value: level, matched: previous.size, thin: false });
  for (let i = 1; i < weeks.length; i++) {
    const current = weekly.get(weeks[i]);
    const byStratum = new Map();
    let matched = 0;
    for (const [id, price] of current) {
      const before = previous.get(id);
      if (before === undefined || before <= 0 || price <= 0) continue;
      const key = strata.get(id) ?? 'all';
      const acc = byStratum.get(key) ?? { sum: 0, n: 0 };
      acc.sum += Math.log(price / before);
      acc.n++;
      byStratum.set(key, acc);
      matched++;
    }
    const thin = matched < minMatched;
    // A thin week carries the level rather than inventing a move from a handful of series.
    if (!thin) {
      let num = 0;
      let den = 0;
      for (const [key, acc] of byStratum) {
        const w = weights ? (weights[key] ?? 0) : 1;
        if (w <= 0) continue;
        num += w * (acc.sum / acc.n);
        den += w;
      }
      if (den > 0) level *= Math.exp(num / den);
    }
    points.push({ week: weeks[i], value: Number(level.toFixed(3)), matched, thin });
    // The comparison basket is always the latest observed prices, so a series returning after a gap is matched
    // against its own last price rather than against nothing.
    previous = new Map([...previous, ...current]);
  }
  const start = points.findIndex((p) => p.matched >= startWhenMatched);
  if (start < 0) return { base: weeks[0], points };
  const at = points[start].value || BASE_VALUE;
  const published = points.slice(start).map((p) => ({ ...p, value: Number(((p.value / at) * BASE_VALUE).toFixed(3)) }));
  return { base: published[0].week, points: published };
}

// The headline: where the index stands and how far it has moved.
//
// Changes compare four-week averages, not single weeks. Weekly moves in this basket swing by about 0.7 points,
// so a year change taken from one week against one week depended mostly on which week it happened to be: on 21
// September 2026 it read +6.7 per cent, while the same comparison on four-week averages read +4.3 and on monthly
// averages +1.4. Agencies publish averaged periods for exactly this reason.
const WINDOW = 4;
const mean = (points) => points.reduce((a, p) => a + p.value, 0) / points.length;

export function indexSummary(points) {
  if (!points.length) return null;
  const latest = points.at(-1);
  const recent = points.slice(-WINDOW);
  // Compares the latest four weeks with a window the same length ending `weeksBack` earlier.
  const change = (weeksBack) => {
    const end = points.length - weeksBack;
    if (end - WINDOW < 0) return null;
    const then = points.slice(end - WINDOW, end);
    return then.length === WINDOW ? ((mean(recent) / mean(then)) - 1) * 100 : null;
  };
  return {
    week: latest.week,
    value: latest.value,
    matched: latest.matched,
    monthChange: change(WINDOW),
    yearChange: change(52),
    weeks: points.length,
  };
}

// The trend under the headline: each week, the share of foods priced higher than four weeks earlier. Statistical
// agencies publish this as a diffusion index. It says which way prices are moving and how broadly, and every
// point in it is a count of comparisons rather than an average that weighting could dispute. Above half means
// more foods rising than falling.
export function buildDiffusion(series, { lag = 4, minCompared = 50 } = {}) {
  const weekly = weeklyPrices(series);
  const weeks = [...weekly.keys()];
  const out = [];
  for (let i = lag; i < weeks.length; i++) {
    const now = weekly.get(weeks[i]);
    const then = weekly.get(weeks[i - lag]);
    let rose = 0;
    let fell = 0;
    for (const [id, price] of now) {
      const before = then.get(id);
      if (before === undefined) continue;
      if (price > before) rose++;
      else if (price < before) fell++;
    }
    const compared = rose + fell;
    // A week comparing only a handful of foods is not a reading of the market, so it is left out entirely.
    if (compared < minCompared) continue;
    out.push({ week: weeks[i], rose, fell, share: Number((rose / compared).toFixed(4)) });
  }
  return out;
}
