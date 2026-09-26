// Weights for the composite index, from the BLS table of relative importance of CPI components, December 2025,
// which reflects what US households spent in 2024. Each is that category's share of the whole CPI-U, in percent.
// Only the ratios between categories matter here, so the figures are used as published.
//
// The index averages within a category without weights, as BLS does for its own basic indexes, then combines the
// categories by these weights. That is the step that makes potatoes, which households buy a lot of, count for more
// than aloe leaves, which almost nobody buys, instead of the two moving the headline equally.
export const WEIGHTS = {
  apples: 0.073,
  bananas: 0.060,
  citrus: 0.077,
  otherFruit: 0.322,
  potatoes: 0.063,
  lettuce: 0.044,
  tomatoes: 0.063,
  otherVegetables: 0.305,
  beef: 0.638,
  pork: 0.340,
  poultry: 0.363,
  fish: 0.314,
  eggs: 0.133,
  cereals: 1.035,
  dairy: 0.758,
  beverages: 0.995,
  other: 2.273,
};
export const WEIGHTS_SOURCE = 'BLS, relative importance of CPI-U components, December 2025';

// Named categories are matched on the family name. The order matters: "apple pears" must not become apples,
// and "sweet potatoes" must not become potatoes, so the more specific rules come first.
const RULES = [
  // Processed and packaged foods are not fresh produce, whatever they are made from: potato chips are not potatoes.
  [/\bchips\b|\bsugar\b|\bsnacks?\b|\bprocessed\b|\bcanned\b|\bfrozen\b/, 'other'],
  [/\bapple pears?\b|\basian pears?\b/, 'otherFruit'],
  [/\bsweet potato|\bbatatas?\b|\byams?\b/, 'otherVegetables'],
  [/^apples?\b(?! processed)/, 'apples'],
  [/^bananas?\b(?! flowers)/, 'bananas'],
  [/\boranges?\b|\bgrapefruit|\blemons?\b|\blimes?\b|\btangerines?\b|\bmandarins?\b|\bclementines?\b|\btangelos?\b|\bpummelos?\b|\bkumquats?\b|\bcitrus\b/, 'citrus'],
  [/^potatoes?\b/, 'potatoes'],
  [/^lettuce\b/, 'lettuce'],
  [/^tomato/, 'tomatoes'],
  [/^eggs?\b/, 'eggs'],
  [/\bbeef\b|\bsteak|\broast\b|\bground chuck\b|\bveal\b/, 'beef'],
  [/\bpork\b|\bbacon\b|\bham\b|\bchops?\b|\bsausage|\bfrankfurters?\b|\bbologna\b/, 'pork'],
  [/\bchicken\b|\bturkey\b|\bpoultry\b/, 'poultry'],
  [/\bfish\b|\bsalmon\b|\bshrimp\b|\btuna\b|\bseafood\b|\bcod\b/, 'fish'],
  [/\bbread\b|\bflour\b|\brice\b|\bspaghetti\b|\bmacaroni\b|\bpasta\b|\bcookies?\b|\bcereal\b|\bcrackers?\b/, 'cereals'],
  [/\bmilk\b|\bbutter\b|\bcheese\b|\bcheddar\b|\byogurt\b|\bice cream\b|\bmargarine\b/, 'dairy'],
  [/\bcoffee\b|\bjuice\b|\bsoft drinks?\b|\btea\b|\bcola\b/, 'beverages'],
];

// Fresh fruit that BLS does not price on its own falls into "other fresh fruits"; any other fresh produce is a
// vegetable in the CPI's sense, including herbs and sprouts.
// No boundary before 'berr': strawberries and blueberries are single words, and a leading \b missed them all.
const FRUIT = /berr(y|ies)\b|\bgrapes?\b|\bmelons?\b|\bcantaloupe|\bhoneydew|\bwatermelon|\bpeach|\bnectarine|\bplums?\b|\bpluots?\b|\bapricot|\bcherr(y|ies)\b|\bpears?\b|\bmangoe?s?\b|\bpapaya|\bpineapple|\bkiwi|\bavocado|\bfigs?\b|\bpomegranate|\bpersimmon|\bdates?\b|\bguava|\bpassion ?fruit|\blychee|\bstarfruit|\bcarambola|\bdragon ?fruit|\bquince|\bcoconut|\bplantain|\bjackfruit|\bbreadfruit|\bcherimoya|\bfeijoa|\bloquat|\blongan|\brambutan|\bsapote|\btamarind|\bcurrants?\b|\bgooseberr/;

export function stratumOf(familyName) {
  const name = String(familyName ?? '').toLowerCase().trim();
  if (!name) return 'other';
  for (const [pattern, stratum] of RULES) if (pattern.test(name)) return stratum;
  if (FRUIT.test(name)) return 'otherFruit';
  return 'otherVegetables';
}
