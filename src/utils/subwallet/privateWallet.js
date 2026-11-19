import BigNumber from 'bignumber.js';
import {DLIGHT_PRIVATE, VRPC} from '../constants/intervalConstants';

// The private (shielded) card sends through the light wallet channel.
export const isPrivateChannel = channel =>
  String(channel || '').split('.')[0] === DLIGHT_PRIVATE;

export const isPrivateCard = card => isPrivateChannel(card?.channel);

// What a card can send now. The private card spends confirmed funds only, as
// its preflight does; other cards count their total.
export const getSpendableBalance = (entry, card) =>
  (isPrivateCard(card) ? entry?.confirmed : entry?.total) || 0;

// The amount a send can fund now, for the Amount limit and MAX. VRPC funding
// spends confirmed outputs only (upstream rule), so an incoming payment that
// still confirms does not count. An own unconfirmed send already lowers the
// total. The shown balances stay as they are.
export const getSendLimit = (entry, channel) => {
  if (!entry) return '0';
  const type = String(channel || '').split('.')[0];
  if (type === DLIGHT_PRIVATE) return String(entry.confirmed ?? '0');
  if (type !== VRPC) return String(entry.total ?? '0');
  return BigNumber.minimum(entry.total ?? 0, entry.confirmed ?? entry.total ?? 0).toString();
};

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
