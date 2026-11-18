import {
  SecureStorage,
  WALLET_UI_STORAGE_INTERNAL_KEY,
} from '../keychain/secureStore';

// General wallet settings that name a profile's coins, addresses, VerusIDs or
// sign-in times. Redux keeps them in `generalWalletSettings`; on disk they live
// in their own encrypted key, never in the plain settings record.
export const WALLET_UI_SETTINGS_FIELDS = [
  'cardStackPreferencesByAccount',
  'identityColorSlotsByAccount',
  'lastOpenedAccountTimestamps',
];

const isObject = value =>
  value != null && typeof value === 'object' && !Array.isArray(value);

const has = (object, field) =>
  Object.prototype.hasOwnProperty.call(object, field);

export const hasWalletUiSettings = generalWalletSettings =>
  isObject(generalWalletSettings) &&
  WALLET_UI_SETTINGS_FIELDS.some(field => has(generalWalletSettings, field));

/** Splits general settings into the plain part and the wallet UI part. */
export const splitWalletUiSettings = (generalWalletSettings = {}) => {
  const plain = {...generalWalletSettings};
  const walletUi = {};
  WALLET_UI_SETTINGS_FIELDS.forEach(field => {
    if (!has(plain, field)) return;
    if (isObject(plain[field])) walletUi[field] = plain[field];
    delete plain[field];
  });
  return {plain, walletUi};
};

let queue = Promise.resolve();
// 'unread' until the first read, 'read' after a good read, 'failed' after a
// read error. Only after a good read does Redux hold the saved record.
let readState = 'unread';
let lastWritten = null;

const serialize = operation => {
  const next = queue.then(operation);
  queue = next.catch(() => {});
  return next;
};

const readUnlocked = async () => {
  try {
    const value = await SecureStorage.getItem(WALLET_UI_STORAGE_INTERNAL_KEY);
    const parsed = value ? JSON.parse(value) : {};
    const walletUi = splitWalletUiSettings(isObject(parsed) ? parsed : {})
      .walletUi;
    lastWritten = JSON.stringify(walletUi);
    readState = 'read';
    return walletUi;
  } catch (error) {
    // Card choices, card colors and sign-in order are not needed to open a
    // wallet. The session starts without them; the saved record stays as it is.
    console.warn('Could not read the saved wallet display choices.', error.message);
    lastWritten = null;
    readState = 'failed';
    return {};
  }
};

export const loadWalletUi = () => serialize(readUnlocked);

// Redux did not start from the saved record, so its maps can lack profiles
// that are on disk. Keep every saved profile entry that Redux does not have.
const mergeByAccount = (saved, live) => {
  const merged = {...saved};
  Object.entries(live).forEach(([field, byAccount]) => {
    merged[field] = {...(saved[field] || {}), ...byAccount};
  });
  return merged;
};

/** Stores the wallet UI fields. Fields that are absent keep their saved value. */
export const storeWalletUi = walletUi =>
  serialize(async () => {
    const live = splitWalletUiSettings(walletUi).walletUi;
    let next;
    if (readState === 'read') {
      next = {...JSON.parse(lastWritten || '{}'), ...live};
    } else {
      const saved = await readUnlocked();
      if (readState !== 'read') {
        // Never replace a record that could not be read with session data.
        throw new Error('The saved wallet display choices could not be read.');
      }
      next = mergeByAccount(saved, live);
    }
    const value = JSON.stringify(next);
    if (value === lastWritten) return;
    await SecureStorage.setItem(WALLET_UI_STORAGE_INTERNAL_KEY, value);
    lastWritten = value;
  });
