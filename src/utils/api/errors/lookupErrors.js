import {
  VRPC_TRANSPORT_ERROR_CODE,
  isConnectionErrorMessage,
} from '../../network/connectionErrors';

// Node answers that say nothing about the name: a miscellaneous error (also
// the lookup-binding check's code, verusid/requests/lookupBinding), a node
// still loading or syncing, a database error, or a malformed or unknown call.
const NOT_ABOUT_THE_NAME_CODES = new Set([-1, -9, -10, -20, -28, -32600, -32601, -32700]);

// A lookup that got no answer: no connection, a timeout or an HTTP error.
export const isLookupConnectionError = error =>
  error != null &&
  (error.code === VRPC_TRANSPORT_ERROR_CODE || isConnectionErrorMessage(error.message));

// A currency lookup that the node answered with an error: the typed name or ID
// names no currency. A request that got no answer, or an answer for another
// currency, is not that.
export const isCurrencyNotFoundError = error =>
  error != null &&
  !isLookupConnectionError(error) &&
  !NOT_ABOUT_THE_NAME_CODES.has(Number(error.code));

// The preflight's error for a failed lookup, with `message` as before. It
// carries `currencyNotFound` (the name as the form sent it) for an unknown
// currency, or `connectionFailed` when the lookup got no answer, so the form
// can name the field or the connection. `appendReason` adds the node's own
// text to any other answer (for example a node that is still loading).
export const lookupError = (message, error, {currencyName = null, appendReason = false} = {}) => {
  if (isLookupConnectionError(error)) {
    return Object.assign(new Error(message), {connectionFailed: true});
  }
  if (currencyName != null && isCurrencyNotFoundError(error)) {
    return Object.assign(new Error(message), {currencyNotFound: currencyName});
  }
  const reason = typeof error?.message === 'string' ? error.message.trim() : '';
  return new Error(appendReason && reason && !message.includes(reason) ? `${message}: ${reason}` : message);
};

// The tags of a preflight error, for its {err: true} result.
export const lookupErrorFields = error => ({
  ...(error?.currencyNotFound != null ? {notFoundCurrency: error.currencyNotFound} : {}),
  ...(error?.connectionFailed === true ? {connectionFailed: true} : {}),
});
