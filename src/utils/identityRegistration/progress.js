export const COMMITMENT_SLOW_AFTER_MS = 3 * 60 * 1000;

export const registrationCommitmentWaitMessage = (broadcastAt, now = Date.now()) =>
  Number.isFinite(broadcastAt) && now - broadcastAt >= COMMITMENT_SLOW_AFTER_MS
    ? 'This is taking longer than usual. The network has not added the next block yet. You can close this screen.'
    : 'Usually ready in about 1 minute. You can close this screen.';

// The SDK keeps the server's refusal inside an uncertain-broadcast error.
// Translate known reasons; never persist or display raw server text.
export const registrationBroadcastRefusal = error => {
  const refusal = error?.details?.response?.error;
  if (!refusal) return null;
  const message = String(refusal.message || '');
  if (/insufficient funds|not enough funds/i.test(message)) {
    return 'The payment address needs more funds for the network fee. Check its status before you retry sending it.';
  }
  if (/missing(?: or spent)? inputs|inputs?.*spent|bad-txns-inputs-missingorspent/i.test(message)) {
    return 'The funds for this transaction are no longer available. Check its status before you retry sending it.';
  }
  if (/fee.*(?:low|small|insufficient)|(?:low|insufficient).*fee/i.test(message)) {
    return 'The network did not accept the transaction fee. Check its status before you retry sending it.';
  }
  if (/expir/i.test(message)) {
    return 'The transaction expired. Check its status before you review a new transaction.';
  }
  return 'The network refused this transaction. Check its status before you retry sending it.';
};
