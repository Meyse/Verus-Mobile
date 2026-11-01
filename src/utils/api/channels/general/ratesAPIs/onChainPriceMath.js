import BigNumber from 'bignumber.js';

export const MAINNET_PRICE_CONFIG = {
  native: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV',
  anchor: 'iGBs4DWztRNvNEJBt4mqHszLxfKTNHTkhM',
  basket: 'i3f7tSctFkiPpiedY8QR5Tep9p4qDVebDx',
};

export const TESTNET_PRICE_CONFIG = {
  native: 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq',
  anchor: 'iFawzbS99RqGs7J2TNxME1TmmayBGuRkA2',
  basket: 'i4QdaEnkSxkAK4FRhRJcq7V7WgRN2XhzMD',
};

const positive = (value) => {
  if (value == null || value === '' || typeof value === 'boolean') return null;
  const number = BigNumber(value);
  return number.isFinite() && number.isGreaterThan(0) ? number : null;
};

const reservesOf = (definition) => {
  const state = definition?.bestcurrencystate;
  // CCurrencyState flags: PRELAUNCH = 2, REFUNDING = 4.
  // A positive launch supply alone does not establish a live basket.
  // eslint-disable-next-line no-bitwise -- These are daemon currency-state flags.
  if (!state || (state.flags & 6) !== 0 || definition.prelaunch === true
      || !positive(state.supply)) return [];
  return Array.isArray(state.reservecurrencies) ? state.reservecurrencies : [];
};

const reserveOf = (definition, currencyId) => reservesOf(definition)
  .find((reserve) => reserve.currencyid === currencyId);

export const getNativeUsdPrice = (anchorBasket, config) => {
  const anchor = positive(reserveOf(anchorBasket, config.anchor)?.priceinreserve);
  const native = positive(reserveOf(anchorBasket, config.native)?.priceinreserve);
  return anchor && native ? anchor.dividedBy(native) : null;
};

// Definitions must contain bestcurrencystate, including converter definitions.
// Return null for an unusable route, so another basket can still supply a price.
export const getCurrencyUsdPrice = (currencyId, definition, baskets, nativeUsd, config) => {
  if (currencyId === config.anchor) return BigNumber(1);
  if (currencyId === config.native) return positive(nativeUsd);

  const ownReserves = definition?.bestcurrencystate?.reservecurrencies;
  if (Array.isArray(ownReserves) && ownReserves.length > 0) {
    const native = reserveOf(definition, config.native);
    if (native) {
      const price = positive(native.priceinreserve);
      const usd = positive(nativeUsd);
      return price && usd ? price.multipliedBy(usd) : null;
    }
    return positive(reserveOf(definition, config.anchor)?.priceinreserve);
  }

  const select = (referenceId, usd) => {
    if (!positive(usd)) return null;
    let largestReserve = BigNumber(0);
    let price = null;
    (baskets || []).forEach((basket) => {
      const currency = positive(reserveOf(basket, currencyId)?.priceinreserve);
      const reference = reserveOf(basket, referenceId);
      const referencePrice = positive(reference?.priceinreserve);
      const amount = positive(reference?.reserves);
      if (currency && referencePrice && amount && amount.isGreaterThan(largestReserve)) {
        largestReserve = amount;
        price = referencePrice.dividedBy(currency).multipliedBy(usd);
      }
    });
    return price;
  };

  return select(config.native, nativeUsd) || select(config.anchor, 1);
};
