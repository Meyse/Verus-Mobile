import BigNumber from 'bignumber.js';
import {
  getOpenPriceChannels,
  isPriceSettled,
  shouldShowNoPriceCaption,
} from '../../assets/homeNoPriceCaption';
import {API_GET_FIATPRICE, GENERAL, WYRE_SERVICE} from '../../constants/intervalConstants';

const held = (balance, rate, priceSettled = true) => ({
  balance: balance == null ? null : BigNumber(balance),
  rate,
  priceSettled,
});
const show = (holdings, extra = {}) =>
  shouldShowNoPriceCaption({ready: true, showBalance: true, totalFinal: true, holdings, ...extra});

describe('Home no-price caption', () => {
  test('an empty wallet and unfunded assets show none', () => {
    expect(show([])).toBe(false);
    expect(show([held(0, null)])).toBe(false);
  });
  test('loading and hidden balances show none', () => {
    expect(show([held(1, null)], {ready: false})).toBe(false);
    expect(show([held(1, null)], {showBalance: false})).toBe(false);
    expect(show([held(1, null)], {totalFinal: false})).toBe(false);
    expect(show([held(null, null)])).toBe(false);
  });
  test('one priced funded asset shows none', () => {
    expect(show([held(1, 2)])).toBe(false);
  });
  test('only unpriced funded assets show it', () => {
    expect(show([held(1, null), held('0.5', undefined)])).toBe(true);
  });
  test('a mix with one priced funded asset shows none', () => {
    expect(show([held(1, null), held(3, 1.5)])).toBe(false);
  });
  test('a zero or non-finite price counts as no price', () => {
    expect(show([held(1, 0)])).toBe(true);
    expect(show([held(1, NaN)])).toBe(true);
    expect(show([held(1, Infinity)])).toBe(true);
    expect(show([held(1, '')])).toBe(true);
  });
  test('a priced asset with a zero balance does not count', () => {
    expect(show([held(1, null), held(0, 5)])).toBe(true);
    expect(show([held(0, 5)])).toBe(false);
  });

  // QA 2026-11-20, Android: a private card at "syncing 0%" never loads, so its
  // asset's balance stays partial. A card that has not loaded does not block.
  test('an asset whose balance has not loaded does not block it', () => {
    expect(show([held(1, null), held(null, null)])).toBe(true);
  });

  // A price request still on its way may bring a price: no caption yet, so a
  // wallet with mainnet VRSC does not flash it before the first price.
  test('a price still on its way shows none', () => {
    expect(show([held(1, null), held(2, null, false)])).toBe(false);
    expect(show([held(1, null), held(null, null, false)])).toBe(false);
  });
});

describe('Home price readiness', () => {
  const state = ({tracker, open = {}}) => ({
    updates: {coinUpdateTracker: tracker},
    channelStore_general: {openCoinChannels: open[GENERAL] || {}},
    channelStore_wyre_service: {openCoinChannels: open[WYRE_SERVICE] || {}},
  });
  const priceTracker = channels => ({[API_GET_FIATPRICE]: {channels}});

  // QA 2026-11-20, iOS: gETH, Kaiju, SUPERNET, AMERICA and DAI.vETH have no
  // open general channel, so no price request runs and the store never gets a
  // rate or an error for them. That counts as an answer: no price.
  test('an asset without an open price channel is settled as no price', () => {
    const channels = getOpenPriceChannels(state({
      tracker: {
        VRSCTEST: priceTracker([GENERAL, WYRE_SERVICE]),
        gETH: priceTracker([GENERAL, WYRE_SERVICE]),
      },
      open: {[GENERAL]: {VRSCTEST: true}},
    }));
    expect(channels).toEqual({VRSCTEST: [GENERAL], gETH: []});
    expect(isPriceSettled({coinId: 'gETH', priceChannels: channels.gETH, rates: {}, rateErrors: {}}))
      .toBe(true);
  });

  test('an asset whose price request has not answered is not settled', () => {
    expect(isPriceSettled({coinId: 'VRSC', priceChannels: [GENERAL], rates: {}, rateErrors: {}}))
      .toBe(false);
    expect(isPriceSettled({coinId: 'VRSC', priceChannels: [GENERAL, WYRE_SERVICE], rates: {[GENERAL]: {}}, rateErrors: {}}))
      .toBe(false);
  });

  test('a rate or an error on an open channel settles it', () => {
    expect(isPriceSettled({coinId: 'VRSC', priceChannels: [GENERAL], rates: {[GENERAL]: {VRSC: {USD: 1}}}, rateErrors: {}}))
      .toBe(true);
    expect(isPriceSettled({coinId: 'VRSC', priceChannels: [GENERAL], rates: {}, rateErrors: {[GENERAL]: {VRSC: 'No valid coin rates found'}}}))
      .toBe(true);
  });

  test('an asset whose updates are not set up yet is not settled', () => {
    const channels = getOpenPriceChannels(state({tracker: {}, open: {[GENERAL]: {VRSC: true}}}));
    expect(channels.VRSC).toBeUndefined();
    expect(isPriceSettled({coinId: 'VRSC', priceChannels: channels.VRSC, rates: {}, rateErrors: {}}))
      .toBe(false);
  });
});
