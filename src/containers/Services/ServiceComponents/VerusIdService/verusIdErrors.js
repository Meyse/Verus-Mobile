import {CONNECTION_FAILED_MESSAGE, isConnectionErrorMessage} from '../../../../utils/network/connectionErrors';
import {verusIdCopy} from '../../../../utils/verusid/verusIdCopy';

// Keep domain/safety errors intact. Only transport codes or transport text
// reach the existing Send/Convert connection copy, including RPC-prefixed text.
const TRANSPORT_CODES = ['ECONNABORTED', 'ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT', 'ERR_NETWORK', 'ERR_BAD_RESPONSE', 'ERR_BAD_REQUEST'];
export const isVerusIdTransportError = error => {
  if (error?.transport === true) return true;
  if (typeof error?.code === 'string' && !TRANSPORT_CODES.includes(error.code)) return false;
  const message = String(error?.message || error || '');
  return TRANSPORT_CODES.includes(error?.code) || isConnectionErrorMessage(message) ||
    /\brequest failed with status code [45]\d\d\b/i.test(message) ||
    /(?:^|:\s*)(?:no response(?: received)?(?: from (?:the )?(?:server|network))?|request timeout|timeout)[.!]?$/i.test(message.trim());
};

export const verusIdErrorMessage = error => isVerusIdTransportError(error)
  ? CONNECTION_FAILED_MESSAGE : verusIdCopy(String(error?.message || error || ''));

export const verusIdUiError = (error, fallback) => ({
  code: error?.code,
  transport: isVerusIdTransportError(error),
  message: verusIdErrorMessage(error?.message ? error : {...error, message: fallback}),
});
