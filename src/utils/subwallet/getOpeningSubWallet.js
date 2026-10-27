import BigNumber from 'bignumber.js';

// Home respects an explicit card choice. Otherwise prefer a funded card,
// then keep the existing active/default card when no balance is known.
export const getOpeningSubWallet = ({
  cards = [],
  balances,
  activeSubWallet,
  userSelectedSubWallet,
}) =>
  cards.find(card => card.id === userSelectedSubWallet?.id) ||
  cards.find(card => BigNumber(balances?.[card.id]?.total || 0).isGreaterThan(0)) ||
  cards.find(card => card.id === activeSubWallet?.id) ||
  cards[0];
