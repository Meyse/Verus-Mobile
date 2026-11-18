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

// A failed save of these fields. The plain settings were saved; callers that
// retry their own choices (card stacks, card colors) can try again.
export const WALLET_UI_NOT_SAVED = 'WALLET_UI_NOT_SAVED';
const notSaved = (message, cause) => {
  const error = new Error(message);
  error.code = WALLET_UI_NOT_SAVED;
  if (cause != null) error.cause = cause;
  return error;
};

let queue = Promise.resolve();
// 'read' only after a good read. Then Redux was loaded from the saved record,
// and its maps may replace it. Otherwise ('unread', 'failed') no write may
// replace the saved record; the next good load (at sign-in) brings it back.
let readState = 'unread';
let lastWritten = null;

const serialize = operation => {
  const next = queue.then(operation);
  queue = next.catch(() => {});
  return next;
};

const parseRecord = value => {
  const parsed = value ? JSON.parse(value) : {};
  return splitWalletUiSettings(isObject(parsed) ? parsed : {}).walletUi;
};

export const loadWalletUi = () =>
  serialize(async () => {
    try {
      const walletUi = parseRecord(
        await SecureStorage.getItem(WALLET_UI_STORAGE_INTERNAL_KEY),
      );
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
  });

const allEmpty = walletUi =>
  Object.values(walletUi).every(byAccount => Object.keys(byAccount).length === 0);

/** Stores the wallet UI fields. Fields that are absent keep their saved value. */
export const storeWalletUi = walletUi =>
  serialize(async () => {
    const live = splitWalletUiSettings(walletUi).walletUi;
    if (readState !== 'read') {
      // Nothing new this session: keep the saved record untouched.
      if (allEmpty(live)) return;
      throw notSaved('The saved wallet display choices could not be read.');
    }
    const value = JSON.stringify({...JSON.parse(lastWritten || '{}'), ...live});
    if (value === lastWritten) return;
    try {
      await SecureStorage.setItem(WALLET_UI_STORAGE_INTERNAL_KEY, value);
    } catch (error) {
      throw notSaved('Could not save the wallet display choices.', error);
    }
    lastWritten = value;
  });

/** Removes one profile from the saved record, also when Redux does not hold it. */
export const removeWalletUiAccount = accountHash =>
  serialize(async () => {
    const saved = parseRecord(
      await SecureStorage.getItem(WALLET_UI_STORAGE_INTERNAL_KEY),
    );
    let changed = false;
    Object.values(saved).forEach(byAccount => {
      if (!has(byAccount, accountHash)) return;
      delete byAccount[accountHash];
      changed = true;
    });
    if (!changed) return;
    const value = JSON.stringify(saved);
    await SecureStorage.setItem(WALLET_UI_STORAGE_INTERNAL_KEY, value);
    if (readState === 'read') lastWritten = value;
  });
