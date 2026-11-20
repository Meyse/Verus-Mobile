import {
  VRPC_TRANSPORT_ERROR_CODE,
  isConnectionErrorMessage,
} from '../../network/connectionErrors';

// The lookup-binding check (verusid/requests/lookupBinding) reports a response
// that does not match the request with this code. That is not "not found".
const LOOKUP_BINDING_ERROR_CODE = -1;

// A currency lookup that the node answered with an error: the typed name or ID
// names no currency. A request that got no answer, or an answer for another
// currency, is not that.
export const isCurrencyNotFoundError = error =>
  error != null &&
  error.code !== VRPC_TRANSPORT_ERROR_CODE &&
  error.code !== LOOKUP_BINDING_ERROR_CODE &&
  !isConnectionErrorMessage(error.message);

// The preflight's error for that case. `currencyNotFound` carries the name as
// the form sent it, so the form can show the error under that field.
export const currencyNotFoundError = (message, name) =>
  Object.assign(new Error(message), {currencyNotFound: name});
