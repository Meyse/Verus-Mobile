import BigNumber from 'bignumber.js';
import {truncateDecimal} from '../math';

// Every balance the wallet shows or lets the user spend is the confirmed
// balance, as upstream shows it (owner, 2026-11-19, PR 266 review R13). Home,
// the asset screen, its cards, Available, MAX, Convert, Receive, Manage assets
// and every picker read this one value.
//
// Per channel: VRPC `confirmed` is getaddressbalance; Electrum `confirmed` is
// the server's confirmed balance; Ethereum has no pending value; the private
// card's `confirmed` is its spendable notes. Returns null without an entry.
export const getShownBalance = ledgerEntry => {
  if (ledgerEntry == null) return null;
  if (BigNumber.isBigNumber(ledgerEntry)) return ledgerEntry;

  return ledgerEntry.confirmed ?? null;
};

// The signed amount that still confirms, or null when there is none. Only
// Electrum coins and the private card report one; the asset screen shows it
// next to the confirmed number. Home and Amount never show it.
export const getPendingBalance = ledgerEntry => {
  if (ledgerEntry == null || BigNumber.isBigNumber(ledgerEntry)) return null;
  const pending = BigNumber(ledgerEntry.pending ?? 0);

  return pending.isFinite() && !pending.isZero() ? pending : null;
};

// "+0.5 pending" or "−0.0012 pending", in coin units with up to 8 decimals,
// as the history row signs its amounts.
export const formatPendingMark = pending => {
  if (pending == null) return null;
  const value = BigNumber(pending);
  if (!value.isFinite() || value.isZero()) return null;

  return `${value.isNegative() ? '−' : '+'}${truncateDecimal(value.abs(), 8)} pending`;
};
