import BigNumber from 'bignumber.js';

// Price impact is how much worse the price of a conversion is than the market
// price. The market price is the output per unit for a small trade on the same
// route. A conversion into a basket moves the basket's price, so a large
// amount in a thin basket returns less per unit.
//
// Thresholds are percentages of the market price.
export const IMPACT_QUIET = 0.1;
export const IMPACT_WARNING = 1;
export const IMPACT_DANGER = 5;
export const IMPACT_SUGGESTION_TARGET = 3;

export const IMPACT_LEVEL = {
  NONE: 'none',
  QUIET: 'quiet',
  WARNING: 'warning',
  DANGER: 'danger',
};

const toFinite = value => {
  const result = BigNumber(value);
  return result.isFinite() ? result : null;
};

// Output per input unit, or null when it cannot be computed.
export const getUnitPrice = (amount, output) => {
  const inputValue = toFinite(amount);
  const outputValue = toFinite(output);

  if (
    !inputValue ||
    !outputValue ||
    !inputValue.isGreaterThan(0) ||
    outputValue.isNegative()
  ) {
    return null;
  }

  return outputValue.dividedBy(inputValue);
};

// Percentage by which the price of this amount is below the market price.
// Never negative: a small amount can quote slightly better than the market
// sample because of rounding.
export const getPriceImpact = ({amount, output, marketPrice}) => {
  const unitPrice = getUnitPrice(amount, output);
  const market = toFinite(marketPrice);

  if (!unitPrice || !market || !market.isGreaterThan(0)) return null;

  return BigNumber.maximum(
    0,
    BigNumber(1).minus(unitPrice.dividedBy(market)).multipliedBy(100),
  );
};

export const getImpactLevel = impact => {
  if (impact == null) return IMPACT_LEVEL.NONE;
  if (impact.isGreaterThanOrEqualTo(IMPACT_DANGER)) return IMPACT_LEVEL.DANGER;
  if (impact.isGreaterThanOrEqualTo(IMPACT_WARNING)) {
    return IMPACT_LEVEL.WARNING;
  }
  if (impact.isGreaterThanOrEqualTo(IMPACT_QUIET)) return IMPACT_LEVEL.QUIET;
  return IMPACT_LEVEL.NONE;
};

// What the user gives up compared to the market price, in input units.
export const getImpactLoss = (amount, impact) =>
  BigNumber(amount).multipliedBy(impact).dividedBy(100);

// A smaller amount that should land near the target impact. It assumes impact
// grows like amount / (amount + depth), which is exact for a two-asset
// constant product pool and close for other weights. Callers must verify the
// result with a real quote before showing it.
export const getSuggestedAmount = ({
  amount,
  impact,
  target = IMPACT_SUGGESTION_TARGET,
}) => {
  const entered = toFinite(amount);
  const current = toFinite(impact);

  if (
    !entered ||
    !current ||
    !entered.isGreaterThan(0) ||
    !current.isGreaterThan(target) ||
    current.isGreaterThanOrEqualTo(100)
  ) {
    return null;
  }

  const currentShare = current.dividedBy(100);
  const targetShare = BigNumber(target).dividedBy(100);
  const depth = entered.multipliedBy(BigNumber(1).minus(currentShare)).dividedBy(
    currentShare,
  );
  const suggested = depth
    .multipliedBy(targetShare)
    .dividedBy(BigNumber(1).minus(targetShare))
    .precision(2, BigNumber.ROUND_DOWN)
    .decimalPlaces(8, BigNumber.ROUND_DOWN);

  return suggested.isGreaterThan(0) && suggested.isLessThan(entered)
    ? suggested
    : null;
};

export const formatImpact = impact =>
  impact.isLessThan(0.1)
    ? '<0.1'
    : impact.decimalPlaces(1, BigNumber.ROUND_HALF_UP).toFixed(1);
