import { expect, test } from 'bun:test';
import { WEIGHTS, stratumOf } from '../src/cpi-weights.mjs';

test('staples land in the category BLS prices them in', () => {
  expect(stratumOf('Potatoes')).toBe('potatoes');
  expect(stratumOf('Apples')).toBe('apples');
  expect(stratumOf('Bananas')).toBe('bananas');
  expect(stratumOf('Lettuce')).toBe('lettuce');
  expect(stratumOf('Tomatoes')).toBe('tomatoes');
  expect(stratumOf('Eggs')).toBe('eggs');
  expect(stratumOf('Grapefruit')).toBe('citrus');
  expect(stratumOf('Blood Orange')).toBe('citrus');
});

test('names that look like a staple but are not are kept out of it', () => {
  // Each of these would silently inflate a staple's weight if matched on a shared word.
  expect(stratumOf('Potato chips')).toBe('other');
  expect(stratumOf('Sweet Potatoes')).toBe('otherVegetables');
  expect(stratumOf('Apple Pears')).toBe('otherFruit');
  expect(stratumOf('Apples Processed')).toBe('other');
  expect(stratumOf('Banana Flowers')).toBe('otherVegetables');
  expect(stratumOf('Sugar')).toBe('other');
});

test('meat, dairy, bakery and drinks from the store price data map to their CPI groups', () => {
  expect(stratumOf('All uncooked ground beef')).toBe('beef');
  expect(stratumOf('Bacon')).toBe('pork');
  expect(stratumOf('Chicken breast')).toBe('poultry');
  expect(stratumOf('Bread')).toBe('cereals');
  expect(stratumOf('Cheddar cheese')).toBe('dairy');
  expect(stratumOf('Coffee')).toBe('beverages');
});

test('fresh produce BLS does not price separately falls into its other-fruit or other-vegetable group', () => {
  expect(stratumOf('Blueberries')).toBe('otherFruit');
  expect(stratumOf('Strawberries')).toBe('otherFruit');
  expect(stratumOf('Raspberries')).toBe('otherFruit');
  expect(stratumOf('Avocados')).toBe('otherFruit');
  expect(stratumOf('Aloe Leaves')).toBe('otherVegetables');
  expect(stratumOf('Bok Choy')).toBe('otherVegetables');
});

test('every category has a positive weight', () => {
  for (const [k, w] of Object.entries(WEIGHTS)) expect(w).toBeGreaterThan(0);
});
