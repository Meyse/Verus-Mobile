import BigNumber from 'bignumber.js';

export const MIN_TRANSPARENT_SEND = '0.00000546';

// Apply to transparent UTXO payments. Private and account-based channels
// have different output rules. A conversion's input is not its final output.
export const transparentDustError = (coin, channel, amount) => {
  if (!['vrpc', 'electrum'].includes(channel?.split('.')[0])) return null;
  const value = BigNumber(amount);
  return value.isFinite() && value.isGreaterThanOrEqualTo(0) &&
    value.isLessThan(MIN_TRANSPARENT_SEND)
    ? `Send at least ${MIN_TRANSPARENT_SEND} ${coin.display_ticker}. The network refuses smaller payments.`
    : null;
};
