import BigNumber from 'bignumber.js';
import {API_GET_FIATPRICE} from '../constants/intervalConstants';

export const NO_PRICE_DATA_CAPTION = 'No price data';

const hasBalance = balance => {
  if (balance == null) return false;
  const value = BigNumber(balance);
  return value.isFinite() && value.isGreaterThan(0);
};

const hasPrice = rate => {
  if (rate == null || rate === '') return false;
  const value = BigNumber(rate);
  return value.isFinite() && value.isGreaterThan(0);
};

// Per coin, the channels its price request asks: the price update's channels
// whose channel is open for the coin, as the wallet refresh picks them. A coin
// without updates yet maps to nothing (undefined); a coin whose price channels
// are all closed maps to [] and never gets a price (gETH, Kaiju, DAI.vETH).
export const getOpenPriceChannels = state => {
  const tracker = state.updates?.coinUpdateTracker || {};
  const result = {};
  for (const [coinId, updates] of Object.entries(tracker)) {
    const channels = updates?.[API_GET_FIATPRICE]?.channels;
    if (!Array.isArray(channels)) continue;
    result[coinId] = [...new Set(channels)].filter(channel =>
      state[`channelStore_${channel.split('.')[0]}`]?.openCoinChannels?.[coinId]);
  }
  return result;
};

// Whether the coin's price is known: a rate or an error arrived on one of its
// price channels, or it has no price channel and no price comes.
export const isPriceSettled = ({coinId, priceChannels, rates, rateErrors}) => {
  if (!Array.isArray(priceChannels)) return false;
  if (priceChannels.length === 0) return true;
  return priceChannels.some(channel =>
    rates?.[channel]?.[coinId] != null || rateErrors?.[channel]?.[coinId] != null);
};

// Whether the Home total shows the small "No price data" line under it.
// `totalFinal` is the total's own readiness (a number, not the loading dash).
// `holdings` are the assets the total sums (the shown assets), each as
// {balance, rate, priceSettled}: `balance` is the shown (confirmed) balance of
// the cards that loaded, or null when none did. True when at least one asset
// holds something, every price is known, and no held asset has a usable price.
// A card that has not loaded does not block it; a price on its way does.
export const shouldShowNoPriceCaption = ({ready, showBalance, totalFinal, holdings}) => {
  if (!ready || !showBalance || !totalFinal || !Array.isArray(holdings)) return false;
  if (!holdings.every(item => item.priceSettled)) return false;
  const held = holdings.filter(item => hasBalance(item.balance));
  if (held.length === 0) return false;

  return !held.some(item => hasPrice(item.rate));
};
