import BigNumber from 'bignumber.js';
import {formatCurrency} from 'react-native-format-currency';
import {STATUS_BADGE_TONE} from '../../../components/StatusBadge';
import {truncateDecimal} from '../../../utils/math';
import {
  formatImpact,
  getImpactLevel,
  getImpactLoss,
  getPriceImpact,
  getTargetShortfall,
  getUnitPrice,
  IMPACT_LEVEL,
} from '../priceImpact';

export const getImpactTone = level =>
  level === IMPACT_LEVEL.DANGER
    ? STATUS_BADGE_TONE.DANGER
    : level === IMPACT_LEVEL.WARNING
    ? STATUS_BADGE_TONE.WARNING
    : STATUS_BADGE_TONE.NEUTRAL;

export const getImpactBadgeLabel = impact => `${formatImpact(impact)}% less`;

// What the impact costs the user. The display currency comes first when the
// ledger holds a price for the asset the user pays with. Otherwise the amount
// is counted in the asset the user receives, so it reads next to the receive
// row. Returns null when nothing can be said.
export const getImpactLossText = ({
  displayCurrency,
  loss,
  rate,
  targetLoss,
  targetTicker,
}) => {
  if (rate != null && loss) {
    const fiat = loss.multipliedBy(rate).decimalPlaces(2);
    if (fiat.isGreaterThan(0)) {
      return formatCurrency({amount: fiat.toFixed(2), code: displayCurrency})[0];
    }
  }

  if (targetLoss && targetLoss.isGreaterThan(0)) {
    return `${truncateDecimal(
      targetLoss,
      targetLoss.isGreaterThanOrEqualTo(100)
        ? 2
        : targetLoss.isGreaterThanOrEqualTo(1)
        ? 4
        : 8,
    )} ${targetTicker}`;
  }

  return null;
};

// Output per input unit for display: four decimals once it reaches one, more
// below that so a small price does not read as zero.
export const formatUnitPrice = price =>
  truncateDecimal(price, price.isGreaterThanOrEqualTo(1) ? 4 : 8);

// Everything the Confirm review shows about a conversion's price, derived from
// the latest estimate and the market price the Amount step measured. All
// fields are null when the market price is unknown.
export const getConversionPriceSummary = ({
  amount,
  displayCurrency,
  marketPrice,
  output,
  rate,
  targetTicker,
}) => {
  const unitPrice = getUnitPrice(amount, output);
  const impact = getPriceImpact({amount, output, marketPrice});

  return {
    impact,
    level: getImpactLevel(impact),
    lossText: impact
      ? getImpactLossText({
          displayCurrency,
          loss: getImpactLoss(amount, impact),
          rate,
          targetLoss: getTargetShortfall({amount, output, marketPrice}),
          targetTicker,
        })
      : null,
    unitPrice,
  };
};

// An estimated amount for display. Four decimals once it reaches one, eight
// below that: the quote is approximate, so more digits only add noise.
export const formatEstimatedAmount = value => {
  const amount = BigNumber(value);
  return truncateDecimal(amount, amount.isGreaterThanOrEqualTo(1) ? 4 : 8);
};
