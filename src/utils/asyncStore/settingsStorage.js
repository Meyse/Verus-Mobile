import { SETTINGS_STORAGE_INTERNAL_KEY } from '../../../env/index';
import { SecureStorage } from '../keychain/secureStore';
import {
  hasWalletUiSettings,
  loadWalletUi,
  splitWalletUiSettings,
  storeWalletUi,
} from './walletUiStorage';

// The settings record is plain storage. Fields that identify a profile's
// coins, addresses, VerusIDs or sign-in times go to the encrypted wallet UI
// record instead (walletUiStorage.js).
const plainSettings = settings => {
  if (!hasWalletUiSettings(settings.generalWalletSettings)) return settings;
  return {
    ...settings,
    generalWalletSettings: splitWalletUiSettings(settings.generalWalletSettings).plain,
  };
};

/**
 * Saves the current settings state object into AsyncStorage and returns
 * a promise that resolves to the input parameter if the save succeeded
 * @param {Object} settings The current state of the settings object in the redux store
 */
export const storeSettings = (settings) => {
  if (typeof settings !== 'object') throw new Error(`Wallet settings store function expected object, received ${typeof settings}`)

  return (async () => {
    if (hasWalletUiSettings(settings.generalWalletSettings)) {
      await storeWalletUi(settings.generalWalletSettings);
    }
    await SecureStorage.setItem(
      SETTINGS_STORAGE_INTERNAL_KEY,
      JSON.stringify(plainSettings(settings)),
    );
    return settings;
  })();
};

/**
 * Loads the settings object from AsyncStorage, to be dispatched to the redux store.
 * Returns a promise that resolves to the settings state object or rejects on error. If
 * the object is undefined in AsyncStorage, resolves to an empty object.
 */
export const loadSettings = async () => {
  const res = await SecureStorage.getItem(SETTINGS_STORAGE_INTERNAL_KEY);
  let settings = res ? JSON.parse(res) : {};

  if (hasWalletUiSettings(settings.generalWalletSettings)) {
    // Delete-only cleanup: builds before walletUi:v1 kept these fields in this
    // plain record. Drop them without copying them. Remove after one release.
    settings = plainSettings(settings);
    await SecureStorage.setItem(SETTINGS_STORAGE_INTERNAL_KEY, JSON.stringify(settings));
  }

  const walletUi = await loadWalletUi();
  if (Object.keys(walletUi).length === 0) return settings;

  return {
    ...settings,
    generalWalletSettings: {...(settings.generalWalletSettings || {}), ...walletUi},
  };
};
