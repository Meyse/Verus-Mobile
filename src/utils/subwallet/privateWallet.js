import {DLIGHT_PRIVATE} from '../constants/intervalConstants';
import {getShownBalance} from '../ledger/shownBalance';

// The private (shielded) card sends through the light wallet channel.
export const isPrivateChannel = channel =>
  String(channel || '').split('.')[0] === DLIGHT_PRIVATE;

export const isPrivateCard = card => isPrivateChannel(card?.channel);

// What a card can send now, for the Amount limit, MAX and every source list:
// the confirmed balance on every channel, as upstream limits a send (PR 266
// review R13). It is the same number Home and the asset screen show.
export const getSpendableBalance = entry => getShownBalance(entry) || 0;

export const getSendLimit = entry => String(getShownBalance(entry) ?? '0');

// The light wallet reports how far it has scanned, from 0 to 100, and -1 when
// it does not know. Returns the percent while the card still syncs, else null.
// Without a report the card does not count as syncing, as on the old send
// screen.
export const getPrivateSyncPercent = info => {
  if (info?.percent == null) return null;
  const percent = Number(info.percent);
  if (!Number.isFinite(percent) || percent < 0 || percent >= 100) return null;
  return percent;
};

export const selectPrivateWalletInfo = state =>
  state.ledger.info?.[DLIGHT_PRIVATE] || {};

export const formatSyncStatus = percent =>
  `Syncing ${Math.floor(percent)}%`;
