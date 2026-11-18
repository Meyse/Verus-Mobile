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
let loaded = false;
let lastWritten = null;

const serialize = operation => {
  const next = queue.then(operation);
  queue = next.catch(() => {});
  return next;
};

const readUnlocked = async () => {
  loaded = true;
  try {
    const value = await SecureStorage.getItem(WALLET_UI_STORAGE_INTERNAL_KEY);
    const parsed = value ? JSON.parse(value) : {};
    const walletUi = splitWalletUiSettings(isObject(parsed) ? parsed : {})
      .walletUi;
    lastWritten = JSON.stringify(walletUi);
    return walletUi;
  } catch (error) {
    // Card choices, card colors and sign-in order are not needed to open a
    // wallet. An unreadable record starts empty; the next write replaces it.
    console.warn('Could not read the saved wallet display choices.', error.message);
    lastWritten = null;
    return {};
  }
};

export const loadWalletUi = () => serialize(readUnlocked);

/** Stores the wallet UI fields. Fields that are absent keep their saved value. */
export const storeWalletUi = walletUi =>
  serialize(async () => {
    const current = loaded ? JSON.parse(lastWritten || '{}') : await readUnlocked();
    const next = {...current, ...splitWalletUiSettings(walletUi).walletUi};
    const value = JSON.stringify(next);
    if (value === lastWritten) return;
    await SecureStorage.setItem(WALLET_UI_STORAGE_INTERNAL_KEY, value);
    lastWritten = value;
  });
