import React from 'react';
import { AboutPage as KitAboutPage } from './kit';

const REPO = 'https://github.com/kadoa-org/food-price-monitor';

// Notes that explain the numbers shown on the site, one collapsible item each.
const METHODS = [
  {
    title: 'Limits',
    body: [
      'BLS store prices are monthly and arrive weeks after the month ends.',
      'USDA stops quoting a product when its growing region is out of season. Charts leave those gaps open.',
      'Extraction can make mistakes. Check the original USDA report before relying on a price.',
    ],
  },
  {
    title: 'Prices',
    body: [
      "A wholesale price is USDA's low and high quote for one product in one market, in dollars per package, as reported.",
      'Retail prices are sale prices from supermarket weekly ads, averaged across stores. They are not shelf prices.',
    ],
  },
  {
    title: 'Changes',
    body: [
      'A change compares the middle of the quoted range with the report closest to 4 or 52 weeks earlier. Red means up, green means down.',
      'The overview calls wholesale prices mostly rising when at least 55% of the foods that moved went up, and mostly falling at 45% or less.',
    ],
  },
  {
    title: 'Store prices and inflation',
    body: 'Staples show the change in BLS average US city prices since August 2019. On store price charts, the dashed line is the first price grown with all consumer prices (CPI-U). Prices are not adjusted for inflation.',
  },
];

export default function AboutPage() {
  return (
    <KitAboutPage
      lede="Daily US food prices at shipping points, wholesale markets and supermarkets, from USDA and BLS reports. Free to search, download and reuse."
      steps={[
        { title: 'Monitor', text: 'Kadoa checks USDA and BLS for new price reports every day.' },
        { title: 'Extract', text: 'It pulls every price quote out of each report.' },
        { title: 'Clean', text: 'Quotes for the same product, market and package join one price series.' },
        { title: 'Publish', text: 'Charts and CSV downloads update with each new report.' },
      ]}
      sources={[
        { name: 'USDA Market News', href: 'https://mymarketnews.ams.usda.gov/', what: 'Shipping point, wholesale and retail ad prices' },
        { name: 'BLS average prices', href: 'https://www.bls.gov/cpi/factsheets/average-prices.htm', what: 'Monthly store prices for staple foods' },
        { name: 'BLS Consumer Price Index', href: 'https://www.bls.gov/cpi/', what: 'All consumer prices, for the inflation line' },
        { name: 'Markon', href: 'https://www.markon.com/news-press/', what: 'Crop updates in Market news' },
      ]}
      methods={METHODS}
      corrections={
        <>
          Found an error? <a href={`${REPO}/issues`}>Open an issue on GitHub</a>.
        </>
      }
    />
  );
}
