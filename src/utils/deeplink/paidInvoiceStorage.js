import {sha256} from '../crypto/hash';
import {requestServiceStoredData} from '../auth/authBox';
import {modifyServiceStoredDataForUser} from '../../actions/actions/services/dispatchers/services';
import {PAID_INVOICES_SERVICE_ID} from '../constants/services';

// Invoices this account paid, so a second visit can say so. The markers hold
// txids, so they live in the account's password-encrypted service data and go
// with the profile. Paying again stays possible.
const MAX_MARKERS = 200;

const markersOf = data =>
  data?.markers && typeof data.markers === 'object' && !Array.isArray(data.markers)
    ? data.markers
    : {};

/**
 * One invoice as one account sees it. A GenericRequest has its own ID and
 * time in the request bytes; a legacy invoice link has only its details and
 * signature time.
 */
export const getPaidInvoiceKey = ({
  request,
  detailIndex,
  detailsBufferString,
  sigtime,
  accountHash,
}) => {
  if (accountHash == null) return null;

  const source = request
    ? `${sha256(request.toBuffer()).toString('hex')}:${detailIndex}`
    : detailsBufferString
      ? `${detailsBufferString}:${sigtime ?? ''}`
      : null;

  if (!source) return null;

  return sha256(Buffer.from(`${source}:${accountHash}`, 'utf8')).toString('hex');
};

/**
 * Reads the signed-in account's service data, which is loaded at sign-in.
 * @returns {Promise<{txid: string|null, paidAt: number}|null>}
 */
export const loadPaidInvoice = async key => {
  if (!key) return null;

  const markers = markersOf(await requestServiceStoredData(PAID_INVOICES_SERVICE_ID));
  return markers[key] || null;
};

/**
 * A null txid means the broadcast status is unknown: the invoice may be paid.
 */
export const savePaidInvoice = async (key, txid, accountHash) => {
  if (!key || !accountHash) return;

  await modifyServiceStoredDataForUser(
    current => {
      const markers = {...markersOf(current)};
      markers[key] = {txid: txid || null, paidAt: Date.now()};

      const oldestFirst = Object.keys(markers).sort(
        (a, b) => (markers[a]?.paidAt || 0) - (markers[b]?.paidAt || 0),
      );
      while (oldestFirst.length > MAX_MARKERS) delete markers[oldestFirst.shift()];

      return {markers};
    },
    PAID_INVOICES_SERVICE_ID,
    accountHash,
  );
};
