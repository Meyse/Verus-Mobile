import {formatCurrency} from 'react-native-format-currency';
import {STATUS_BADGE_TONE} from '../../../components/StatusBadge';
import {truncateDecimal} from '../../../utils/math';
import {
  formatImpact,
  getImpactLevel,
  getImpactLoss,
  getPriceImpact,
  getUnitPrice,
  IMPACT_LEVEL,
} from '../priceImpact';

export const getImpactTone = level =>
  level === IMPACT_LEVEL.DANGER
    ? STATUS_BADGE_TONE.DANGER
    : level === IMPACT_LEVEL.WARNING
    ? STATUS_BADGE_TONE.WARNING
    : STATUS_BADGE_TONE.NEUTRAL;

export const getImpactBadgeLabel = impact =>
  impact.isLessThan(0.1) ? '<0.1%' : `−${formatImpact(impact)}%`;

// What the impact costs the user, in the display currency when a price is
// known, otherwise in the source asset. Returns null when the sum rounds to
// nothing, so a tiny loss never reads as "$0.00".
export const getImpactLossText = ({loss, rate, displayCurrency, ticker}) => {
  if (!loss) return null;
  if (rate == null) return `${truncateDecimal(loss, 8)} ${ticker}`;

  const fiat = loss.multipliedBy(rate).decimalPlaces(2);
  if (!fiat.isGreaterThan(0)) return null;

  return formatCurrency({amount: fiat.toFixed(2), code: displayCurrency})[0];
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
  sourceTicker,
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
          ticker: sourceTicker,
        })
      : null,
    unitPrice,
  };
};
