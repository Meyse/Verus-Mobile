// VRPC funding spends confirmed outputs only, as upstream does. Until the next
// block, the address index still lists the outputs that an unconfirmed
// transaction spends, so a second transaction from the same address picks
// them again and the node refuses it.

export const SPENT_INPUTS_NOT_SENT_MESSAGE =
  'Your previous transaction is not confirmed yet. Nothing new was sent. ' +
  'Wait for the next block, then check your transaction history before you send again.';

export const PENDING_SPEND_MESSAGE =
  'Your previous transaction is not confirmed yet. Wait for the next block, then try again.';

// The node did not accept the transaction: an input is spent or unknown.
export const isSpentInputsRefusal = message =>
  /\b(txn-mempool-conflict|bad-txns-inputs-spent|missing inputs|bad-txns-inputs-missingorspent|bad-txns-inputs-missing)\b/i
    .test(String(message || ''));

// The node already has these exact bytes, so an earlier attempt reached it.
export const isAlreadyKnownRefusal = message =>
  /\b(transaction already in block chain|txn-already-in-mempool|txn-already-known)\b/i
    .test(String(message || ''));
