import BigNumber from 'bignumber.js';
import {shouldShowNoPriceCaption} from '../../assets/homeNoPriceCaption';

const held = (balance, rate) => ({balance: BigNumber(balance), complete: true, rate, ratesLoaded: true});
const show = (holdings, extra = {}) =>
  shouldShowNoPriceCaption({ready: true, showBalance: true, holdings, ...extra});

describe('Home no-price caption', () => {
  test('an empty wallet and unfunded assets show none', () => {
    expect(show([])).toBe(false);
    expect(show([held(0, null)])).toBe(false);
  });
  test('loading and hidden balances show none', () => {
    expect(show([held(1, null)], {ready: false})).toBe(false);
    expect(show([held(1, null)], {showBalance: false})).toBe(false);
    expect(show([{...held(1, null), complete: false}])).toBe(false);
    expect(show([{...held(1, null), ratesLoaded: false}])).toBe(false);
    expect(show([{...held(1, null), balance: null}])).toBe(false);
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
});
