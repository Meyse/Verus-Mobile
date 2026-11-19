import {
  CONNECTION_FAILED_MESSAGE,
  isConnectionErrorMessage,
} from '../../utils/network/connectionErrors';
import {
  SPENT_INPUTS_NOT_SENT_MESSAGE,
  isAlreadyKnownRefusal,
  isSpentInputsRefusal,
} from '../../utils/transactions/unconfirmedSpend';

// A node rejection reads "<code>: <reason>" (for example
// "16: bad-txns-failed-precheck") or names a bad-* rule.
const NODE_REJECTION_PATTERN = /^-?\d+:\s|\bbad-[a-z-]+\b/i;

// Apply only to explicit rejection responses, never transport/unknown outcomes.
// Funding spends confirmed outputs only, so a second send before the next
// block reuses spent outputs. One text covers both refusals: an identical
// transaction is already known, or an input is already spent.
export const getBroadcastRejectionMessage = message =>
  isAlreadyKnownRefusal(message) || isSpentInputsRefusal(message)
    ? SPENT_INPUTS_NOT_SENT_MESSAGE
    : isConnectionErrorMessage(message)
      ? CONNECTION_FAILED_MESSAGE
      : NODE_REJECTION_PATTERN.test(message)
        ? 'The network rejected this transaction. Nothing was sent.'
        : message;
