import {
  VRPC_TRANSPORT_ERROR_CODE,
  isConnectionErrorMessage,
} from '../../network/connectionErrors';

// The lookup-binding check (verusid/requests/lookupBinding) reports a response
// that does not match the request with this code. That is not "not found".
const LOOKUP_BINDING_ERROR_CODE = -1;

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
  error.code !== LOOKUP_BINDING_ERROR_CODE;

// The preflight's error for a failed lookup, with `message` as before. It
// carries `currencyNotFound` (the name as the form sent it) for an unknown
// currency, or `connectionFailed` when the lookup got no answer, so the form
// can name the field or the connection.
export const lookupError = (message, error, currencyName = null) => {
  const result = new Error(message);
  if (isLookupConnectionError(error)) result.connectionFailed = true;
  else if (currencyName != null && isCurrencyNotFoundError(error)) result.currencyNotFound = currencyName;
  return result;
};

// The tags of a preflight error, for its {err: true} result.
export const lookupErrorFields = error => ({
  ...(error?.currencyNotFound != null ? {notFoundCurrency: error.currencyNotFound} : {}),
  ...(error?.connectionFailed === true ? {connectionFailed: true} : {}),
});
