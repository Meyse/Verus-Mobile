import BigNumber from 'bignumber.js';
import {getAddressMempool} from '../api/channels/vrpc/callCreators';
import {PENDING_SPEND_MESSAGE} from './unconfirmedSpend';

// Gift card funding and claims save the signed bytes before broadcast, and a
// saved batch blocks new attempts until it confirms. A refused batch would
// never confirm, so refuse before building when a transaction that spends
// from one of these addresses is still unconfirmed. This reads only whether
// such a transaction exists; it does not track which outputs it spends.
export const assertNoPendingSpend = async (systemId, addresses) => {
  const funding = (addresses || []).filter(
    address => typeof address === 'string' && address.length > 0,
  );
  if (funding.length === 0) return;

  const response = await getAddressMempool(systemId, funding, false, 1, true);
  if (response?.error || !Array.isArray(response?.result)) {
    throw new Error(`Unable to check pending transactions on ${systemId}. Try again.`);
  }

  if (response.result.some(entry =>
    entry?.spending === true || BigNumber(entry?.satoshis || 0).isNegative())) {
    throw new Error(PENDING_SPEND_MESSAGE);
  }
};
