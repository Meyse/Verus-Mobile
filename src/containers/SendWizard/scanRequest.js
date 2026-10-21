import BigNumber from 'bignumber.js';
import {WALLET_APP_SEND} from '../../utils/constants/apps';
import {
  API_GET_BALANCES,
  API_SEND,
} from '../../utils/constants/intervalConstants';
import {extractLedgerData} from '../../utils/ledger/extractLedgerData';
import {extractDisplaySubWallets} from '../../utils/subwallet/extractSubWallets';

// The cards of an asset that can send and hold a balance. A scanned request
// with an amount opens Confirm only when exactly one card can pay; with more,
// Send asks for the card first, as SendWizardNavigator does.
export const countFundedSendCards = (state, coinId) => {
  const cards = extractDisplaySubWallets(state)[coinId] || [];
  const balances = extractLedgerData(state, 'balances', API_GET_BALANCES);

  return cards.filter(
    card =>
      card.compatible_apps?.includes(WALLET_APP_SEND) &&
      Boolean(card.api_channels?.[API_SEND]) &&
      BigNumber(balances?.[coinId]?.[card.id]?.total || 0).isGreaterThan(0),
  ).length;
};
