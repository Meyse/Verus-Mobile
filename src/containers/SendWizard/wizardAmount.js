import BigNumber from 'bignumber.js';

// The asset amount the Amount step sends. A direct ETH/ERC20 send keeps the
// asset's own decimals; every other route keeps 8. A fiat entry has no
// precision of its own, so its quotient is cut to those places. It is cut
// down, never rounded up: the division itself rounds down, so no half-up step
// at a longer precision can carry into the kept digits.
export const getWizardCryptoAmount = ({
  input,
  fiatMode,
  rate,
  coin,
  isConversion = false,
  isCrossChain = false,
}) => {
  const entered = BigNumber(String(input || 0).replace(',', '.'));
  if (!entered.isFinite() || entered.isNegative()) return BigNumber(NaN);
  const nativePrecision =
    ['eth', 'erc20'].includes(coin?.proto) && !isConversion && !isCrossChain;
  const places = nativePrecision ? coin?.decimals ?? 18 : 8;

  if (!fiatMode) return entered.decimalPlaces(places, BigNumber.ROUND_DOWN);
  if (rate == null || !BigNumber(rate).isGreaterThan(0)) return BigNumber(NaN);
  const Exact = BigNumber.clone({
    DECIMAL_PLACES: places,
    ROUNDING_MODE: BigNumber.ROUND_DOWN,
  });
  return BigNumber(Exact(entered.toFixed()).dividedBy(Exact(BigNumber(rate).toFixed())).toFixed());
};
