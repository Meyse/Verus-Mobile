import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';

jest.mock('react-native', () => require('../../../tests/helpers/mockReactNative')({
  AppState: {currentState: 'active', addEventListener: () => ({remove: jest.fn()})},
}));
jest.mock('@react-navigation/native', () => ({useIsFocused: () => true}));
// Storage and network are the boundaries of the portfolio record.
jest.mock('../../keychain/secureStore', () => {
  const store = new Map();
  return {
    PORTFOLIO_RECORD_STORAGE_INTERNAL_KEY: 'portfolioRecord',
    SecureStorage: {
      getItem: jest.fn(async key => store.get(key) ?? null),
      setItem: jest.fn(async (key, value) => { store.set(key, value); }),
    },
  };
});
jest.mock('../../portfolioHistory/priceHistory', () => ({
  getFiatHistory: jest.fn(async () => []),
  getSavedFiatHistory: jest.fn(() => null),
  getSavedUsdHistory: jest.fn(() => null),
  getUsdHistory: jest.fn(async () => []),
}));
jest.mock('../../portfolioHistory/priceCache', () => ({loadPriceCache: jest.fn(async () => {})}));

const {SecureStorage} = require('../../keychain/secureStore');
const {writeBalanceRecord} = require('../../portfolioHistory/balanceRecord');
const usePortfolioHistory = require('../../portfolioHistory/usePortfolioHistory').default;

const account = {accountHash: 'qa-account'};
const savedAmounts = async () => {
  const records = JSON.parse(await SecureStorage.getItem('portfolioRecord') || '{}');
  const coins = records[account.accountHash]?.coins || {};
  return Object.fromEntries(Object.entries(coins).map(([id, points]) => [id, points[points.length - 1][1]]));
};

const Probe = ({balances}) => {
  usePortfolioHistory({
    account, activeCoins: [], balances, total: 1, rates: {}, currency: 'USD',
    ready: true, refreshing: false, testnetPrices: false,
  });
  return null;
};

const settle = async (ms = 0) => {
  await act(async () => {
    jest.advanceTimersByTime(ms);
    for (let i = 0; i < 20; i += 1) await Promise.resolve();
  });
};

describe('portfolio record saves', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('saves a balance change that still waits when Home closes', async () => {
    let renderer;
    await act(async () => { renderer = TestRenderer.create(<Probe balances={{VRSC: '1'}} />); });
    await settle(3000);
    expect(await savedAmounts()).toEqual({VRSC: '1'});

    await act(async () => renderer.update(<Probe balances={{VRSC: '2'}} />));
    await act(async () => renderer.unmount());
    await settle();

    expect(await savedAmounts()).toEqual({VRSC: '2'});
  });

  it('saves the same amounts again after the record is replaced', async () => {
    let renderer;
    await act(async () => { renderer = TestRenderer.create(<Probe balances={{VRSC: '5'}} />); });
    await settle(3000);
    expect(await savedAmounts()).toEqual({VRSC: '5'});

    await act(async () => writeBalanceRecord(account.accountHash, {v: 1, start: Date.now(), coins: {}}));
    await settle();
    expect(await savedAmounts()).toEqual({});

    await act(async () => renderer.update(<Probe balances={{VRSC: '5'}} />));
    await settle(3000);
    expect(await savedAmounts()).toEqual({VRSC: '5'});
    await act(async () => renderer.unmount());
  });
});
