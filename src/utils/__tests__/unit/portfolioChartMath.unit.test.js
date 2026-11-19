// PR 266 review 1118 PF3: a day without a price is not available. The chart
// never values a held coin with a price it does not have.
const {buildSeries, change, DAY} = require('../../portfolioHistory/chartMath');

const day = d => new Date(2026, 10, d).getTime(); // local midnight, November 2026
const NOW = day(17) + (12 * 3600000);
const btc = {id: 'BTC', usd: 120};
const eth = {id: 'ETH', usd: 10};
// Prices from 15 Nov only: 100, 110, 120.
const lateBtc = [[day(15), 100], [day(16), 110], [day(17), 120]];

const series = ({coins = {BTC: [[day(1), '1']]}, prices = {BTC: lateBtc}, fx, fxFallback = 1, total = 120} = {}) => buildSeries({
  record: {start: day(1), coins},
  coins: Object.keys(coins).map(id => (id === 'BTC' ? btc : eth)),
  prices,
  fx,
  fxFallback,
  total,
  range: '1M',
  now: NOW,
});

it('starts the line at the first real price and measures the change from it', () => {
  const result = series();

  expect(result.points.map(point => [point.t, point.v])).toEqual([
    [day(15), 100], [day(16), 110], [day(17), 120], [NOW, 120],
  ]);
  expect(result.partial).toBe(true);
  expect(result.start).toBe(day(15));
  expect(change(result.points)).toBeCloseTo(20);
});

it('keeps the whole record when the prices cover it', () => {
  const result = series({prices: {BTC: [[day(1), 10], ...lateBtc]}});

  expect(result.points[0]).toMatchObject({t: day(1), v: 10});
  expect(result.start).toBe(day(1));
});

it('needs no price for a coin on days the wallet did not hold it', () => {
  const result = series({
    coins: {BTC: [[day(1), '1']], ETH: [[day(1), '0'], [day(16), '2']]},
    prices: {BTC: [[day(1), 10], ...lateBtc], ETH: [[day(16), 5], [day(17), 6]]},
    total: 132,
  });

  expect(result.points[0]).toMatchObject({t: day(1), v: 10});
  expect(result.points.find(point => point.t === day(16)).v).toBe(120);
});

it('has no line and no change when a held coin has no price history at all', () => {
  const result = series({prices: {BTC: []}});

  expect(result.points).toHaveLength(1);
  expect(result.points[0].kind).toBe('now');
  expect(change(result.points)).toBeNull();
});

it('does not use an exchange rate from after the day it converts', () => {
  const fullBtc = [[day(1), 10], [day(14), 10], ...lateBtc];
  // EUR per USD only from 12 Nov.
  const fx = [[Date.UTC(2026, 10, 12), 0.9], [Date.UTC(2026, 10, 16), 0.8]];
  const result = series({prices: {BTC: fullBtc}, fx, fxFallback: 0.85});

  // 1 to 11 Nov have no rate: not available. The line starts on 12 Nov at 10 USD x 0.9.
  expect(result.points[0].t).toBe(day(12));
  expect(result.points[0].v).toBeCloseTo(9);
  expect(result.start).toBe(day(12));
});

it('gives a single point no change', () => {
  expect(change([{t: NOW, v: 120, kind: 'now'}])).toBeNull();
});

it('does not hold the first price back to an earlier record start', () => {
  const start = day(1) + (14 * 3600000); // record starts at 14:00
  const result = buildSeries({
    record: {start, coins: {BTC: [[start, '1']]}},
    coins: [btc],
    prices: {BTC: [[day(2), 10], ...lateBtc]},
    total: 120,
    range: '1M',
    now: NOW,
  });

  expect(result.points[0]).toMatchObject({t: day(2), v: 10});
  expect(result.start).toBe(day(2));
});

it('measures the change from the first priced holding, not an earlier part of it', () => {
  // Review example: 1 BTC from the record start, 1 ETH from 2 Nov, both priced
  // at 10 from 2 Nov, total now 120. The change is +500 %, not +1100 %.
  const start = day(1) + (14 * 3600000);
  const flat = [[day(2), 10], [day(17), 10]];
  const result = buildSeries({
    record: {start, coins: {BTC: [[start, '1']], ETH: [[start, '0'], [day(2), '1']]}},
    coins: [btc, eth],
    prices: {BTC: flat, ETH: flat},
    total: 120,
    range: '1M',
    now: NOW,
  });

  expect(result.points[0]).toMatchObject({t: day(2), v: 20});
  expect(change(result.points)).toBeCloseTo(500);
});

it('starts at the first sample time when it falls between two days', () => {
  const firstPrice = day(14) + (6 * 3600000); // 14 Nov 06:00
  const result = series({prices: {BTC: [[firstPrice, 90], ...lateBtc]}});

  expect(result.points[0]).toMatchObject({t: firstPrice, v: 90});
  expect(result.points[1]).toMatchObject({t: day(15), v: 100});
  expect(result.start).toBe(firstPrice);
});

it('has no line in another currency when no past exchange rates are known', () => {
  // usePortfolioHistory passes no fallback rate for a currency other than USD.
  const result = series({prices: {BTC: [[day(1), 10], ...lateBtc]}, fx: [], fxFallback: null});

  expect(result.points).toHaveLength(1);
  expect(change(result.points)).toBeNull();
});
