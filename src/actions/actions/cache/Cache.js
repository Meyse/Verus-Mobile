import {
  clearCache
} from '../../../utils/asyncStore/asyncStore';

import {
  clearDataCache
} from '../../actionCreators';
import Store from '../../../store';
import {captureSessionScope} from '../updates/sessionRequests';
import {DLIGHT_PRIVATE} from '../../../utils/constants/intervalConstants';
import {resyncDlightWallet} from '../channels/dlight/dispatchers/LightWalletReduxManager';

// "Clear cache" (F12, PR 266): saved server responses, saved currency lists
// and definitions, block headers and receipts. They load again when needed.
// It never touches the private wallet's synced data and starts no resync.
// A failure rejects, so the loading screen shows its error instead of waiting.
export const clearCacheData = async (dispatch) => {
  await clearCache();
  dispatch(clearDataCache());
};

// The open private wallets of the signed-in profile.
export const getResyncablePrivateCoins = state =>
  (state.coins.activeCoinsForUser || []).filter(coin =>
    (coin.compatible_channels || []).includes(DLIGHT_PRIVATE) &&
    state.channelStore_dlight_private?.dlightSockets?.[coin.id] === true,
  );

// "Clear blockchain data" (F12): deletes the private wallets' synced data.
// Each one resyncs from the start.
export const clearBlockchainData = async () => {
  const state = Store.getState();
  const sessionScope = captureSessionScope(state);
  for (const coin of getResyncablePrivateCoins(state)) {
    await resyncDlightWallet(coin, sessionScope);
  }
};
