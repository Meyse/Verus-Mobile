import {modifyServiceStoredDataForUser} from '../../actions/actions/services/dispatchers/services';
import {requestServiceStoredData} from '../auth/authBox';
import {ADDRESS_BOOK_SERVICE_ID} from '../constants/services';

const normalizeRecord = record => ({
  id: String(record.id || ''),
  label: String(record.label || '').trim(),
  address: String(record.address || '').trim(),
  asset: String(record.asset || '').trim().toUpperCase(),
  network: String(record.network || '').trim(),
  verusId: String(record.verusId || '').trim(),
});

export const normalizeAddressBook = records =>
  (Array.isArray(records) ? records : [])
    .map(normalizeRecord)
    .filter(record => record.id && record.label && record.address);

export const loadAddressBook = async () => {
  const data = await requestServiceStoredData(ADDRESS_BOOK_SERVICE_ID);
  return normalizeAddressBook(data.records);
};

export const saveAddressBook = async (records, accountHash) => {
  const normalizedRecords = normalizeAddressBook(records);
  await modifyServiceStoredDataForUser(
    {records: normalizedRecords},
    ADDRESS_BOOK_SERVICE_ID,
    accountHash,
  );
  return normalizedRecords;
};

export const addressBookRecordMatchesContext = (record, context = {}) => {
  const asset = String(context.asset || '').toUpperCase();
  const network = String(context.network || '');

  if (record.asset && asset && record.asset !== asset) return false;
  if (record.network && network && record.network !== network) return false;
  return true;
};
