import {DELEGATED_SIGNER_ACCOUNT_REQUIRED} from './delegatedSignerGate';

export const GENERIC_REQUEST_REJECTION_CODES = {
  DELEGATED_SIGNER_NO_WALLET: 'DELEGATED_SIGNER_NO_WALLET',
  DETAIL_UNSUPPORTED: 'REQUEST_DETAIL_UNSUPPORTED',
  EXPERIMENTAL_DISABLED: 'EXPERIMENTAL_REQUEST_DISABLED',
  EXPIRED: 'REQUEST_EXPIRED',
  INVALID: 'REQUEST_INVALID',
  LINK_TOO_LONG: 'REQUEST_LINK_TOO_LONG',
  NETWORK_MISMATCH: 'REQUEST_NETWORK_MISMATCH',
  SIGNATURE_INVALID: 'REQUEST_SIGNATURE_INVALID',
};

// Thrown by the authentication expiry check.
const AUTHENTICATION_REQUEST_EXPIRED = 'AUTHENTICATION_REQUEST_EXPIRED';

const NEW_REQUEST = 'Ask the requester for a new request.';

export const createGenericRequestRejectionError = (code, message, fields) => {
  const error = new Error(message);
  error.code = code;
  return Object.assign(error, fields);
};

// Axios and verusd-rpc-ts-client report transport failures with these texts.
const NETWORK_FAILURE_MESSAGE =
  /^(Request failed with status code \d{3}|Network Error|Network error \d{3}|timeout of \d+ms exceeded)$/i;

export const isNetworkFailureError = error =>
  error?.isAxiosError === true ||
  NETWORK_FAILURE_MESSAGE.test(String(error?.message || '').trim());

const networkName = requestIsTestnet => (requestIsTestnet ? 'testnet' : 'mainnet');

/**
 * Translates an error that stops a GenericRequest into a short title and one
 * recovery sentence. The raw error text is never shown.
 * @param {Error} error
 * @param {{requestIsTestnet?: boolean}} context
 * @returns {{title: string, message: string, canRetry: boolean}}
 */
export const getGenericRequestRejection = (error, context = {}) => {
  const requestIsTestnet =
    typeof error?.requestIsTestnet === 'boolean'
      ? error.requestIsTestnet
      : context.requestIsTestnet;

  switch (error?.code) {
    case GENERIC_REQUEST_REJECTION_CODES.NETWORK_MISMATCH: {
      const network = networkName(requestIsTestnet);

      return {
        canRetry: false,
        message: `This request is for ${network}. Switch to a ${network} wallet, then open the request again.`,
        title: 'Wrong network',
      };
    }
    case GENERIC_REQUEST_REJECTION_CODES.DELEGATED_SIGNER_NO_WALLET: {
      const network = networkName(requestIsTestnet);

      return {
        canRetry: false,
        message: `This request needs a ${network} wallet. Add one, then open the request again.`,
        title: `No ${network} wallet`,
      };
    }
    case DELEGATED_SIGNER_ACCOUNT_REQUIRED:
      return {
        canRetry: false,
        message:
          'A VerusID that this wallet does not control signed this request. Switch to the wallet that controls it, then open the request again.',
        title: 'Wrong wallet',
      };
    case GENERIC_REQUEST_REJECTION_CODES.EXPERIMENTAL_DISABLED:
      return {
        canRetry: false,
        message:
          'Turn on experimental deeplinks in Settings > General, then open the request again.',
        title: 'Experimental request',
      };
    case AUTHENTICATION_REQUEST_EXPIRED:
    case GENERIC_REQUEST_REJECTION_CODES.EXPIRED:
      return {canRetry: false, message: NEW_REQUEST, title: 'Request expired'};
    case GENERIC_REQUEST_REJECTION_CODES.SIGNATURE_INVALID:
      return {
        canRetry: false,
        message: `Verus Mobile could not confirm who signed this request. ${NEW_REQUEST}`,
        title: 'Cannot verify signer',
      };
    case GENERIC_REQUEST_REJECTION_CODES.INVALID:
      return {canRetry: false, message: NEW_REQUEST, title: 'Request not valid'};
    case GENERIC_REQUEST_REJECTION_CODES.DETAIL_UNSUPPORTED:
      return {
        canRetry: false,
        message:
          'This version of Verus Mobile cannot handle this request. Update the app, or ask the requester for a different request.',
        title: 'Unsupported request',
      };
    case GENERIC_REQUEST_REJECTION_CODES.LINK_TOO_LONG:
      return {
        canRetry: false,
        message: `This request link is too long to open. ${NEW_REQUEST}`,
        title: 'Cannot open request',
      };
  }

  if (isNetworkFailureError(error)) {
    return {
      canRetry: true,
      message:
        'Verus Mobile could not reach the Verus network. Check your connection, then try again.',
      title: 'Network unavailable',
    };
  }

  return {
    canRetry: true,
    message: 'Try again. If it still fails, ask the requester for a new request.',
    title: 'Cannot open request',
  };
};

/**
 * Translates an error raised while reading a link, before a request screen
 * opens. Only an alert can show it, so it never offers a retry.
 */
export const getRequestLinkRejection = error => {
  if (error?.code === GENERIC_REQUEST_REJECTION_CODES.LINK_TOO_LONG) {
    return getGenericRequestRejection(error);
  }

  return {
    canRetry: false,
    message: `Verus Mobile cannot read this link. ${NEW_REQUEST}`,
    title: 'Cannot open request',
  };
};
