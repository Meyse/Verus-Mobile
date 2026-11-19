// PR 266 review 1118 PF3: the price cache is shared by all wallets on the phone.
// A wallet must never get a shorter cached window than its record needs, and a
// missing day must never get an invented price.
// The network is the only mock. Other modules on the import path create axios clients.
jest.mock('axios', () => ({get: jest.fn(), create: () => ({get: jest.fn(), post: jest.fn(), interceptors: {request: {use: jest.fn()}, response: {use: jest.fn()}}})}));

const axios = require('axios');
const AsyncStorage = require('@react-native-async-storage/async-storage');
const {SecureStorage} = require('../../keychain/secureStore');
const {getFiatHistory, getSavedUsdHistory, getUsdHistory} = require('../../portfolioHistory/priceHistory');
const {clearPortfolioPriceCache} = require('../../portfolioHistory/priceCache');
const {buildSeries, change, DAY} = require('../../portfolioHistory/chartMath');

const day = d => new Date(2026, 10, d).getTime(); // local midnight, November 2026
const NOW = day(17) + (12 * 3600000);
// Worked example from the review: the daily close is 10 until 14 Nov and 100 from 15 Nov.
const closeOn = t => (t < day(15) ? 10 : 100);
const coin = {id: 'BTC', display_name: 'Bitcoin', proto: 'btc', testnet: false, usd: 100};

let paprikaStarts;
let ecbStarts;
let failFrom;

const paprika = params => {
  const start = Date.parse(params.start);
  paprikaStarts.push(start);
  if (failFrom != null && start < failFrom) throw new Error('Request failed with status code 429');
  const data = [];
  for (let t = day(1); t <= NOW; t += DAY) {
    if (t >= start) data.push({timestamp: new Date(t).toISOString(), price: closeOn(t)});
  }
  return {data};
};

// Minimal SDMX-JSON: one USD-per-EUR observation per day from the start period.
const ecb = params => {
  ecbStarts.push(params.startPeriod);
  const times = [];
  for (let t = Date.parse(params.startPeriod); t <= NOW; t += DAY) times.push({id: new Date(t).toISOString().slice(0, 10)});
  const observations = Object.fromEntries(times.map((_, i) => [i, [1.1]]));
  return {data: {
    structure: {dimensions: {
      series: [{id: 'FREQ'}, {id: 'CURRENCY', values: [{id: 'USD'}]}],
      observation: [{id: 'TIME_PERIOD', values: times}],
    }},
    dataSets: [{series: {'0:0': {observations}}}],
  }};
};

beforeAll(async () => {
  global.__DEV__ = false;
  await AsyncStorage.setItem('secureStoreFlags', '1');
  await SecureStorage.initialize('device-secure-storage-credential');
});

beforeEach(async () => {
  paprikaStarts = [];
  ecbStarts = [];
  failFrom = null;
  axios.get.mockReset();
  axios.get.mockImplementation(async (url, {params}) => (url.includes('coinpaprika') ? paprika(params) : ecb(params)));
  await clearPortfolioPriceCache();
});

afterEach(() => jest.restoreAllMocks());

const walletSeries = (start, prices) => buildSeries({
  record: {start, coins: {BTC: [[start, '1']]}},
  coins: [coin],
  prices: {BTC: prices},
  total: 100,
  range: '1M',
  now: NOW,
});

it('gives the long-history wallet its own earlier days after a short-history wallet filled the cache', async () => {
  await getUsdHistory(coin, day(15), NOW, () => true, false); // wallet A, record from 15 Nov
  const prices = await getUsdHistory(coin, day(1), NOW, () => true, false); // wallet B, record from 1 Nov
  const series = walletSeries(day(1), prices);

  expect(paprikaStarts).toEqual([day(15), day(1)]);
  expect(series.points[0]).toMatchObject({t: day(1), v: 10});
  expect(change(series.points)).toBe(900);
});

it('reuses a covered range for the rest of the day', async () => {
  await getUsdHistory(coin, day(1), NOW, () => true, false);
  await getUsdHistory(coin, day(15), NOW, () => true, false);
  await getUsdHistory(coin, day(1), NOW + 3600000, () => true, false);

  expect(paprikaStarts).toEqual([day(1)]);
});

it('shows no invented days when the backfill fails, and does not retry it at once', async () => {
  const clock = jest.spyOn(Date, 'now').mockReturnValue(NOW);
  await getUsdHistory(coin, day(15), NOW, () => true, false);
  failFrom = day(15);
  await expect(getUsdHistory(coin, day(1), NOW, () => true, false)).rejects.toThrow('429');
  // Home then draws the saved prices, as usePortfolioHistory does after a failure.
  const series = walletSeries(day(1), getSavedUsdHistory(coin, day(1), NOW));

  // The line starts at the first real price; no point before it is valued.
  expect(series.points[0]).toMatchObject({t: day(15), v: 100});
  expect(series.points.every(point => point.t >= day(15))).toBe(true);
  expect(series.partial).toBe(true);
  expect(series.start).toBe(day(15));

  // The next refresh, and the hourly load after the daily one, do not ask again.
  await expect(getUsdHistory(coin, day(1), NOW, () => true, false)).rejects.toThrow();
  await expect(getUsdHistory(coin, day(1), NOW, () => true, true)).rejects.toThrow();
  expect(paprikaStarts.filter(start => start === day(1))).toHaveLength(1);

  // Later it tries once more.
  failFrom = null;
  clock.mockReturnValue(NOW + (11 * 60000));
  const later = await getUsdHistory(coin, day(1), NOW + (11 * 60000), () => true, false);
  expect(paprikaStarts.filter(start => start === day(1))).toHaveLength(2);
  expect(walletSeries(day(1), later).points[0]).toMatchObject({t: day(1), v: 10});
});

it('fetches the earlier exchange rates for the long-history wallet', async () => {
  await getFiatHistory('EUR', day(15), NOW);
  const fx = await getFiatHistory('EUR', day(1), NOW);

  expect(ecbStarts).toEqual([
    new Date(day(15) - (7 * DAY)).toISOString().slice(0, 10),
    new Date(day(1) - (7 * DAY)).toISOString().slice(0, 10),
  ]);
  expect(fx[0][0]).toBeLessThanOrEqual(day(1));
});
