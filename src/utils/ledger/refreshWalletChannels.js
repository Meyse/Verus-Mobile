import Store from '../../store';
import {conditionallyUpdateWallets} from '../../actions/actionDispatchers';
import {API_ABORTED, API_SUCCESS} from '../constants/intervalConstants';

const DEFAULT_EXPIRE_TIMEOUT = 60000;
let currentSession;
const lastReads = new Map();

// Visible surfaces (coin screen, card picker, VerusID list) read only the cards
// they show, without expiring every card. Like upstream's
// conditionallyUpdateWallets, they read only expired data (PR 266 audit rows
// 2, 5, 12): the coin's data must be expired, and this card must not have had
// its own read since that expiry and within the expiry time (60 s for VRPC
// balances and history). An explicit expiry, for example after a send, makes
// the next read happen at once, as upstream. A pull by the user and the block
// height poll (`force`) skip the expiry, never the busy check.
export const refreshWalletChannels = (chainTicker, cards, updateIds, {force = false} = {}) => {
  const state = Store.getState();
  const accountHash = state.authentication.activeAccount?.accountHash;
  if (!accountHash) return Promise.resolve(updateIds.map(() => API_ABORTED));

  const session = `${accountHash}:${state.authentication.sessionEpoch || 0}`;
  if (session !== currentSession) {
    lastReads.clear();
    currentSession = session;
  }

  const now = Date.now();
  const updates = updateIds.map(updateId => {
    const tracker = state.updates.coinUpdateTracker[chainTicker]?.[updateId];
    const expireTimeout = state.updates.coinUpdateIntervals?.[chainTicker]?.[updateId]?.expire_timeout;
    const readLimit = Number.isFinite(expireTimeout) && expireTimeout > 0
      ? expireTimeout
      : DEFAULT_EXPIRE_TIMEOUT;
    const {activeCoin, activeSection, coinMenuFocused} = state.coins;
    const visible = (!tracker?.coin_bound || (coinMenuFocused && activeCoin?.id === chainTicker)) &&
      (tracker?.update_locations == null || (coinMenuFocused && tracker.update_locations.includes(activeSection?.key)));
    const channels = [...new Set(cards.map(card => card?.api_channels?.[updateId]))]
      .filter(channel => {
        if (!visible || !channel || !tracker?.channels?.includes(channel) || tracker.busy?.[channel] ||
            !state[`channelStore_${channel.split('.')[0]}`]?.openCoinChannels[chainTicker]) return false;
        const key = `${chainTicker}:${updateId}:${channel}`;
        const lastRead = lastReads.get(key);
        const readSinceExpiry = lastRead != null && lastRead >= (tracker.expired_at || 0) &&
          now - lastRead < readLimit;
        if (!force && (!tracker.needs_update || readSinceExpiry)) return false;
        lastReads.set(key, now);
        return true;
      });
    return {chainTicker, updateId, channels};
  });

  // A failed or skipped read leaves the data expired, as upstream: the next
  // navigation may try again at once.
  return conditionallyUpdateWallets(state, Store.dispatch, updates).then(results => {
    updates.forEach(({updateId, channels}, index) => {
      if (results?.[index] === API_SUCCESS) return;
      channels.forEach(channel => {
        const key = `${chainTicker}:${updateId}:${channel}`;
        if (lastReads.get(key) === now) lastReads.delete(key);
      });
    });
    return results;
  });
};
