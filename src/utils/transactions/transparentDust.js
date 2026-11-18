import BigNumber from 'bignumber.js';

export const MIN_TRANSPARENT_SEND = '0.00000546';

// Apply to Bitcoin-family (Electrum) payments of a chain's own coin: their relay policy refuses
// dust outputs. Verus (VRPC) has no dust minimum when the fee is paid. Private and account-based
// channels have different output rules. A conversion's input is not its final output.
export const transparentDustError = (coin, channel, amount) => {
  if (channel?.split('.')[0] !== 'electrum') return null;
  // Tokens travel in currency outputs, not plain coin outputs: no dust rule.
  if (coin?.currency_id && coin?.system_id && coin.currency_id !== coin.system_id) return null;
  const value = BigNumber(amount);
  return value.isFinite() && value.isGreaterThanOrEqualTo(0) &&
    value.isLessThan(MIN_TRANSPARENT_SEND)
    ? `Send at least ${MIN_TRANSPARENT_SEND} ${coin.display_ticker}. The network refuses smaller payments.`
    : null;
};
