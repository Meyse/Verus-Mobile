import BigNumber from 'bignumber.js';

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

// Whether the Home total shows the small "No price data" line under it.
// `holdings` are the assets the total sums (the shown assets), each as
// {balance, complete, rate, ratesLoaded}: `balance` is the shown (confirmed)
// balance, `complete` that every card's balance arrived, `ratesLoaded` that the
// asset's rate entry arrived. True only when everything is loaded, at least one
// asset holds something, and none of those held assets has a usable price.
export const shouldShowNoPriceCaption = ({ready, showBalance, holdings}) => {
  if (!ready || !showBalance || !Array.isArray(holdings)) return false;
  if (!holdings.every(item => item.complete && item.ratesLoaded)) return false;
  const held = holdings.filter(item => hasBalance(item.balance));
  if (held.length === 0) return false;

  return !held.some(item => hasPrice(item.rate));
};
