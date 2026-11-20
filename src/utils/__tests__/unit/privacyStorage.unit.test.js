// PR 266 review R18 to R22: new data that names a wallet's coins, addresses,
// balances, txids or identities must not be in plain AsyncStorage.
let mockState;
const mockDispatch = jest.fn();

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {
    dispatch: (...args) => mockDispatch(...args),
    getState: () => mockState,
    subscribe: () => () => {},
  },
}));
jest.mock('../../services/WyreProvider', () => ({
  __esModule: true,
  default: {reset: jest.fn()},
}));

const ACCOUNT = 'account-hash-1';
const OTHER_ACCOUNT = 'account-hash-2';
const ADDRESS = 'RTestAddressXXXXXXXXXXXXXXXXXXXXXX';
const IDENTITY = 'iTestIdentityXXXXXXXXXXXXXXXXXXXXX';
const TXID = 'f'.repeat(64);
const CREDENTIAL = 'device-secure-storage-credential';

// A fresh module registry, as after an app restart. The AsyncStorage mock
// keeps its data in module scope, so carry the stored values over.
const loadModules = async () => {
  const previous = require('@react-native-async-storage/async-storage');
  const saved = await previous.multiGet(await previous.getAllKeys());
  jest.resetModules();
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  if (saved.length > 0) await AsyncStorage.multiSet(saved);
  const {SecureStorage} = require('../../keychain/secureStore');
  if ((await AsyncStorage.getItem('secureStoreFlags')) == null) {
    await AsyncStorage.setItem('secureStoreFlags', '1');
  }
  await SecureStorage.initialize(CREDENTIAL);
  return {AsyncStorage, SecureStorage};
};

const plainDump = async AsyncStorage => {
  const keys = await AsyncStorage.getAllKeys();
  return (await AsyncStorage.multiGet(keys)).map(([key, value]) => `${key}=${value}`).join('\n');
};

beforeEach(async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  await AsyncStorage.clear();
  mockDispatch.mockReset();
  mockState = undefined;
});

describe('found-asset cache (R18)', () => {
  it('keeps addresses and balances in memory only', async () => {
    const {AsyncStorage} = await loadModules();
    const cache = require('../../assets/assetDiscoveryCache');
    const snapshots = {[`vrpc.${ADDRESS}.iSystem`]: {address: ADDRESS, balances: {VRSCTEST: '12.5'}}};

    await cache.saveAssetDiscoveryCache(ACCOUNT, 'testnet', {snapshots, resolved: {}});

    expect(await cache.loadAssetDiscoveryCache(ACCOUNT, 'testnet')).toEqual({snapshots, resolved: {}});
    expect(await plainDump(AsyncStorage)).not.toContain(ADDRESS);

    await cache.deleteAssetDiscoveryCache(ACCOUNT);
    expect(await cache.loadAssetDiscoveryCache(ACCOUNT, 'testnet')).toBeNull();
  });
});

describe('paid invoice markers (R21)', () => {
  it('keep the txid in the account service data, not in plain storage', async () => {
    const {AsyncStorage} = await loadModules();
    const {encryptkey} = require('../../seedCrypt');
    const Keychain = require('react-native-keychain');
    const {SET_SERVICE_STORED_DATA} = require('../../constants/storeType');
    const sessionKey = 'session-key';
    Keychain.getInternetCredentials.mockResolvedValue({
      password: await encryptkey(sessionKey, 'wallet-password'),
    });
    mockState = {
      authentication: {activeAccount: {accountHash: ACCOUNT}, sessionKey, sessionEpoch: 1},
      services: {stored: {}},
    };
    mockDispatch.mockImplementation(action => {
      if (action.type === SET_SERVICE_STORED_DATA) {
        mockState = {...mockState, services: {stored: action.payload.data}};
      }
    });
    const invoices = require('../../deeplink/paidInvoiceStorage');
    const key = 'invoice-marker-key';

    await invoices.savePaidInvoice(key, TXID, ACCOUNT);

    expect(await plainDump(AsyncStorage)).not.toContain(TXID);
    expect(await AsyncStorage.getItem('paid_invoice_markers')).toBeNull();

    // As after a restart: the marker comes back from storage, not from Redux.
    const {loadServiceStoredDataForUser} = require('../../asyncStore/serviceStoredDataStorage');
    const stored = await loadServiceStoredDataForUser(ACCOUNT);
    // The entry is also encrypted with the wallet password, inside the keychain layer.
    expect(stored.paid_invoices).toEqual(expect.any(String));
    expect(stored.paid_invoices).not.toContain(TXID);
    mockState = {...mockState, services: {stored}};
    await expect(invoices.loadPaidInvoice(key)).resolves.toEqual(
      expect.objectContaining({txid: TXID}),
    );
  });

  it('keeps the marker when the account changes while the write waits', async () => {
    await loadModules();
    const {encryptkey, decryptkey} = require('../../seedCrypt');
    const Keychain = require('react-native-keychain');
    const sessionKey = 'session-key';
    Keychain.getInternetCredentials.mockResolvedValue({
      password: await encryptkey(sessionKey, 'wallet-password'),
    });
    mockState = {
      authentication: {activeAccount: {accountHash: ACCOUNT}, sessionKey, sessionEpoch: 1},
      services: {stored: {}},
    };
    const {queueServiceStorageWrite} = require('../../asyncStore/passwordProtectedStorageQueue');
    const invoices = require('../../deeplink/paidInvoiceStorage');
    // Another service write is slow (it encrypts all profiles' service data).
    let releaseSlowWrite;
    const slowWrite = queueServiceStorageWrite(() => new Promise(resolve => { releaseSlowWrite = resolve; }));

    const saving = invoices.savePaidInvoice('invoice-marker-key', TXID, ACCOUNT);
    await new Promise(resolve => setTimeout(resolve, 200));
    // The user signs in to another profile before the marker write starts.
    mockState = {
      authentication: {activeAccount: {accountHash: OTHER_ACCOUNT}, sessionKey: 'other', sessionEpoch: 2},
      services: {stored: {}},
    };
    releaseSlowWrite();
    await slowWrite;
    await saving;

    const {loadServiceStoredDataForUser} = require('../../asyncStore/serviceStoredDataStorage');
    const stored = await loadServiceStoredDataForUser(ACCOUNT);
    expect(JSON.parse(decryptkey('wallet-password', stored.paid_invoices)).markers['invoice-marker-key'])
      .toEqual(expect.objectContaining({txid: TXID}));
  });

  it('keeps earlier markers when Redux holds an older copy of the service data', async () => {
    await loadModules();
    const {encryptkey, decryptkey} = require('../../seedCrypt');
    const Keychain = require('react-native-keychain');
    const sessionKey = 'session-key';
    Keychain.getInternetCredentials.mockResolvedValue({
      password: await encryptkey(sessionKey, 'wallet-password'),
    });
    mockState = {
      authentication: {activeAccount: {accountHash: ACCOUNT}, sessionKey, sessionEpoch: 1},
      services: {stored: {}},
    };
    const invoices = require('../../deeplink/paidInvoiceStorage');
    await invoices.savePaidInvoice('first-invoice', TXID, ACCOUNT);
    // A new sign-in read the service data before the first marker was stored.
    mockState = {...mockState, services: {stored: {}}};

    await invoices.savePaidInvoice('second-invoice', 'e'.repeat(64), ACCOUNT);

    const {loadServiceStoredDataForUser} = require('../../asyncStore/serviceStoredDataStorage');
    const stored = await loadServiceStoredDataForUser(ACCOUNT);
    expect(Object.keys(JSON.parse(decryptkey('wallet-password', stored.paid_invoices)).markers).sort())
      .toEqual(['first-invoice', 'second-invoice']);
  });
});

describe('per-account wallet display choices (R22)', () => {
  const walletUi = {
    cardStackPreferencesByAccount: {
      [ACCOUNT]: {VRSCTEST: {pins: [`SUBWALLET_vrpc.${ADDRESS}.iSystem`]}},
      [OTHER_ACCOUNT]: {VRSCTEST: {pins: []}},
    },
    identityColorSlotsByAccount: {[ACCOUNT]: {[IDENTITY]: 2}},
    lastOpenedAccountTimestamps: {[ACCOUNT]: 1700000000000, [OTHER_ACCOUNT]: 1600000000000},
  };

  it('stores card choices, identity colors and sign-in times in the encrypted key only', async () => {
    const {AsyncStorage} = await loadModules();
    const {loadSettings, storeSettings} = require('../../asyncStore/settingsStorage');

    // Startup loads the settings before any save.
    await loadSettings();
    await storeSettings({generalWalletSettings: {appearance: 'dark', ...walletUi}});

    const plain = await AsyncStorage.getItem('settings');
    expect(JSON.parse(plain).generalWalletSettings).toEqual({appearance: 'dark'});
    const dump = await plainDump(AsyncStorage);
    expect(dump).not.toContain(ADDRESS);
    expect(dump).not.toContain(IDENTITY);
    expect(dump).not.toContain(ACCOUNT);

    await loadModules();
    const restarted = require('../../asyncStore/settingsStorage');
    await expect(restarted.loadSettings()).resolves.toEqual({
      generalWalletSettings: {appearance: 'dark', ...walletUi},
    });
  });

  it('deletes the fields that older builds left in the plain settings record, without copying them', async () => {
    const {AsyncStorage} = await loadModules();
    await AsyncStorage.setItem('settings', JSON.stringify({
      generalWalletSettings: {appearance: 'light', ...walletUi},
    }));
    const {loadSettings} = require('../../asyncStore/settingsStorage');
    const {WALLET_UI_STORAGE_INTERNAL_KEY} = require('../../keychain/secureStore');

    await expect(loadSettings()).resolves.toEqual({generalWalletSettings: {appearance: 'light'}});
    expect(JSON.parse(await AsyncStorage.getItem('settings'))).toEqual({
      generalWalletSettings: {appearance: 'light'},
    });
    expect(await AsyncStorage.getItem(WALLET_UI_STORAGE_INTERNAL_KEY)).toBeNull();
  });

  const emptyMaps = {
    cardStackPreferencesByAccount: {},
    identityColorSlotsByAccount: {},
    lastOpenedAccountTimestamps: {},
  };
  const saveChoices = async () => {
    await loadModules();
    const settingsStorage = require('../../asyncStore/settingsStorage');
    await settingsStorage.loadSettings();
    await settingsStorage.storeSettings({
      generalWalletSettings: {appearance: 'dark', ...walletUi},
    });
  };
  const failWalletUiReads = SecureStorage => {
    const {WALLET_UI_STORAGE_INTERNAL_KEY} = require('../../keychain/secureStore');
    const getItem = SecureStorage.getItem.bind(SecureStorage);
    return jest.spyOn(SecureStorage, 'getItem').mockImplementation((key, ...rest) =>
      (key === WALLET_UI_STORAGE_INTERNAL_KEY
        ? Promise.reject(new Error('read failed'))
        : getItem(key, ...rest)));
  };

  it('never replaces saved choices that could not be read, and saves the plain settings', async () => {
    await saveChoices();
    const {AsyncStorage, SecureStorage} = await loadModules();
    const {WALLET_UI_STORAGE_INTERNAL_KEY} = require('../../keychain/secureStore');
    const {WALLET_UI_NOT_SAVED} = require('../../asyncStore/walletUiStorage');
    const savedCiphertext = await AsyncStorage.getItem(WALLET_UI_STORAGE_INTERNAL_KEY);
    const readError = failWalletUiReads(SecureStorage);
    const settingsStorage = require('../../asyncStore/settingsStorage');

    // Startup reads nothing, so this session's maps start empty.
    const loaded = await settingsStorage.loadSettings();
    expect(loaded.generalWalletSettings.cardStackPreferencesByAccount).toBeUndefined();
    // Two saves of plain settings with the empty session maps.
    await settingsStorage.storeSettings({generalWalletSettings: {appearance: 'light', ...emptyMaps}});
    await settingsStorage.storeSettings({generalWalletSettings: {appearance: 'system', ...emptyMaps}});
    // A new display choice in this session cannot be saved; the caller is told.
    await expect(settingsStorage.storeSettings({generalWalletSettings: {
      appearance: 'system',
      ...emptyMaps,
      lastOpenedAccountTimestamps: {[ACCOUNT]: 1800000000000},
    }}, {walletUiRequired: true})).rejects.toMatchObject({code: WALLET_UI_NOT_SAVED});

    expect(await AsyncStorage.getItem(WALLET_UI_STORAGE_INTERNAL_KEY)).toBe(savedCiphertext);
    expect(JSON.parse(await AsyncStorage.getItem('settings')).generalWalletSettings.appearance).toBe('system');

    // The next good load (at sign-in) brings the saved choices back.
    readError.mockRestore();
    const {generalWalletSettings} = await settingsStorage.loadSettings();
    expect(generalWalletSettings).toEqual({appearance: 'system', ...walletUi});
  });

  it('removes a deleted profile from the saved choices and from Redux', async () => {
    await saveChoices();
    await loadModules();
    const {SET_ALL_SETTINGS} = require('../../constants/storeType');
    const {DEFAULT_SETTINGS} = require('../../settings/settingsDefaults');
    mockState = {
      settings: {
        ...DEFAULT_SETTINGS,
        generalWalletSettings: {...DEFAULT_SETTINGS.generalWalletSettings, ...walletUi},
      },
    };
    const {deleteAccountWalletUiSettings} = require('../../../actions/actions/WalletSettings');
    const {loadSettings} = require('../../asyncStore/settingsStorage');

    await deleteAccountWalletUiSettings(ACCOUNT);

    const expected = {
      cardStackPreferencesByAccount: {[OTHER_ACCOUNT]: {VRSCTEST: {pins: []}}},
      identityColorSlotsByAccount: {},
      lastOpenedAccountTimestamps: {[OTHER_ACCOUNT]: 1600000000000},
    };
    const published = mockDispatch.mock.calls.map(([action]) => action)
      .find(action => action.type === SET_ALL_SETTINGS);
    expect(published.settings.generalWalletSettings).toEqual(expect.objectContaining(expected));
    expect((await loadSettings()).generalWalletSettings).toEqual(expect.objectContaining(expected));
  });

  it('removes a deleted profile from the saved choices also when Redux does not hold them', async () => {
    await saveChoices();
    const {SecureStorage} = await loadModules();
    const readError = failWalletUiReads(SecureStorage);
    const settingsStorage = require('../../asyncStore/settingsStorage');
    await settingsStorage.loadSettings();
    readError.mockRestore();
    const {DEFAULT_SETTINGS} = require('../../settings/settingsDefaults');
    mockState = {settings: DEFAULT_SETTINGS};
    const {deleteAccountWalletUiSettings} = require('../../../actions/actions/WalletSettings');

    await deleteAccountWalletUiSettings(ACCOUNT);

    const {generalWalletSettings} = await settingsStorage.loadSettings();
    expect(generalWalletSettings.cardStackPreferencesByAccount).toEqual({
      [OTHER_ACCOUNT]: {VRSCTEST: {pins: []}},
    });
    expect(generalWalletSettings.identityColorSlotsByAccount).toEqual({});
    expect(generalWalletSettings.lastOpenedAccountTimestamps).toEqual({
      [OTHER_ACCOUNT]: 1600000000000,
    });
  });

  it('saves a plain setting although the display choices cannot be saved', async () => {
    await saveChoices();
    const {AsyncStorage, SecureStorage} = await loadModules();
    failWalletUiReads(SecureStorage);
    const settingsStorage = require('../../asyncStore/settingsStorage');
    const {DEFAULT_SETTINGS} = require('../../settings/settingsDefaults');
    const {SET_GENERAL_WALLET_SETTINGS_STATE} = require('../../constants/storeType');
    await settingsStorage.loadSettings();
    // This session changed a card choice that could not be saved.
    mockState = {
      settings: {
        ...DEFAULT_SETTINGS,
        generalWalletSettings: {
          ...DEFAULT_SETTINGS.generalWalletSettings,
          cardStackPreferencesByAccount: {[ACCOUNT]: {VRSCTEST: {selectedId: 'card'}}},
        },
      },
    };
    const {saveGeneralSettings} = require('../../../actions/actions/WalletSettings');
    const {WALLET_UI_NOT_SAVED} = require('../../asyncStore/walletUiStorage');

    const action = await saveGeneralSettings({appearance: 'dark'});

    expect(action.type).toBe(SET_GENERAL_WALLET_SETTINGS_STATE);
    expect(JSON.parse(await AsyncStorage.getItem('settings')).generalWalletSettings.appearance).toBe('dark');
    // A card choice save still reports the failure, so the card saver retries.
    await expect(saveGeneralSettings({
      cardStackPreferencesByAccount: {[ACCOUNT]: {VRSCTEST: {selectedId: 'other'}}},
    })).rejects.toMatchObject({code: WALLET_UI_NOT_SAVED});
  });

  it('starts when the old plain fields cannot be removed', async () => {
    const {AsyncStorage, SecureStorage} = await loadModules();
    await AsyncStorage.setItem('settings', JSON.stringify({
      generalWalletSettings: {appearance: 'light', ...walletUi},
    }));
    jest.spyOn(SecureStorage, 'setItem').mockRejectedValueOnce(new Error('write failed'));
    const {loadSettings} = require('../../asyncStore/settingsStorage');

    await expect(loadSettings()).resolves.toEqual({generalWalletSettings: {appearance: 'light'}});
  });
});

describe('cleanup of old plain keys', () => {
  it('deletes old identifying keys and keeps the plain display switches', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    const {USER_DATA_STORAGE_INTERNAL_KEY} = require('../../../../env/index');
    await AsyncStorage.multiSet([
      [`assetDiscoveryCache:v1:${ACCOUNT}:testnet`, JSON.stringify({snapshots: {[ADDRESS]: {}}})],
      ['portfolioMarketHistory:v1', JSON.stringify({'paprika:btc-bitcoin:daily': {}})],
      ['paid_invoice_markers', JSON.stringify({marker: {txid: TXID}})],
      ['balancePrivacy:hidden:v1', 'true'],
      ['homeValueChart:open:v1', 'open'],
      // The removed Home chart's encrypted records (F1).
      [`${USER_DATA_STORAGE_INTERNAL_KEY}:portfolioRecord:v1`, 'encrypted'],
      [`${USER_DATA_STORAGE_INTERNAL_KEY}:portfolioPriceCache:v1`, 'encrypted'],
    ]);
    const {removeLegacyPlainKeys} = require('../../asyncStore/legacyPlainKeys');

    await removeLegacyPlainKeys();

    expect((await AsyncStorage.getAllKeys()).sort()).toEqual([
      'balancePrivacy:hidden:v1',
      'homeValueChart:open:v1',
    ]);
  });
});
