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

describe('portfolio price cache (R19)', () => {
  const waitForWrite = () => new Promise(resolve => setTimeout(resolve, 1200));

  it('writes the coin list once per chart load, encrypted, and reads it back after a restart', async () => {
    const {AsyncStorage} = await loadModules();
    const setItem = jest.spyOn(AsyncStorage, 'setItem');
    const prices = require('../../portfolioHistory/priceCache');
    const request = key => prices.cachedHistory({
      key,
      start: 1000,
      end: 5000,
      stamp: 1,
      canFetch: () => true,
      fetchSamples: async () => [[1000, 1], [5000, 2]],
    });

    // One chart load: several coins and a route note finish close together.
    await Promise.all([
      request('paprika:btc-bitcoin:daily'),
      request('paprika:eth-ethereum:daily'),
      request('ecb:EUR'),
      prices.saveNote('route:VRSCTEST:iSystem:', {fixed: true}),
    ]);
    await waitForWrite();

    const {PORTFOLIO_PRICE_CACHE_STORAGE_INTERNAL_KEY} = require('../../keychain/secureStore');
    const writes = setItem.mock.calls.filter(([key]) => key === PORTFOLIO_PRICE_CACHE_STORAGE_INTERNAL_KEY);
    expect(writes).toHaveLength(1);
    const dump = await plainDump(AsyncStorage);
    expect(dump).not.toContain('btc-bitcoin');
    expect(dump).not.toContain('route:VRSCTEST');
    expect(await AsyncStorage.getItem('portfolioMarketHistory:v1')).toBeNull();
    setItem.mockRestore();

    await loadModules();
    const restarted = require('../../portfolioHistory/priceCache');
    await restarted.loadPriceCache();
    expect(restarted.savedSamples(['paprika:btc-bitcoin:daily'])).toEqual([[1000, 1], [5000, 2]]);
    expect(restarted.savedNote('route:VRSCTEST:iSystem:')).toEqual({fixed: true});
  });

  it('waits for a slow route lookup of the same chart load before it writes', async () => {
    const {AsyncStorage} = await loadModules();
    const setItem = jest.spyOn(AsyncStorage, 'setItem');
    const prices = require('../../portfolioHistory/priceCache');
    const request = key => prices.cachedHistory({
      key,
      start: 1000,
      end: 5000,
      stamp: 1,
      canFetch: () => true,
      fetchSamples: async () => [[1000, 1], [5000, 2]],
    });
    const fastCoin = prices.trackPriceLoad(() => request('paprika:btc-bitcoin:daily'));
    // An on-chain coin first looks up its price route, outside any request.
    const slowCoin = prices.trackPriceLoad(async () => {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return request('chain:endpoint:iCoin:iBasket:basket::daily');
    });

    await Promise.all([fastCoin(), slowCoin()]);
    await waitForWrite();

    const {PORTFOLIO_PRICE_CACHE_STORAGE_INTERNAL_KEY} = require('../../keychain/secureStore');
    expect(setItem.mock.calls.filter(([key]) => key === PORTFOLIO_PRICE_CACHE_STORAGE_INTERNAL_KEY))
      .toHaveLength(1);
    setItem.mockRestore();
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
    const {storeSettings} = require('../../asyncStore/settingsStorage');

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

  it('keeps the saved choices when they cannot be read, and does not block the settings save', async () => {
    await loadModules();
    await require('../../asyncStore/settingsStorage').storeSettings({
      generalWalletSettings: {appearance: 'dark', ...walletUi},
    });

    const {AsyncStorage, SecureStorage} = await loadModules();
    const {WALLET_UI_STORAGE_INTERNAL_KEY} = require('../../keychain/secureStore');
    const savedCiphertext = await AsyncStorage.getItem(WALLET_UI_STORAGE_INTERNAL_KEY);
    const getItem = SecureStorage.getItem.bind(SecureStorage);
    const readError = jest.spyOn(SecureStorage, 'getItem').mockImplementation((key, ...rest) =>
      (key === WALLET_UI_STORAGE_INTERNAL_KEY
        ? Promise.reject(new Error('read failed'))
        : getItem(key, ...rest)));
    const settingsStorage = require('../../asyncStore/settingsStorage');

    // Startup reads nothing, so this session's maps start empty.
    const loaded = await settingsStorage.loadSettings();
    expect(loaded.generalWalletSettings.cardStackPreferencesByAccount).toBeUndefined();
    await settingsStorage.storeSettings({generalWalletSettings: {
      appearance: 'light',
      cardStackPreferencesByAccount: {},
      identityColorSlotsByAccount: {},
      lastOpenedAccountTimestamps: {[ACCOUNT]: 1800000000000},
    }});
    expect(await AsyncStorage.getItem(WALLET_UI_STORAGE_INTERNAL_KEY)).toBe(savedCiphertext);
    expect(JSON.parse(await AsyncStorage.getItem('settings')).generalWalletSettings.appearance).toBe('light');

    // The next read works: the write keeps every saved profile entry.
    readError.mockRestore();
    await settingsStorage.storeSettings({generalWalletSettings: {
      appearance: 'light',
      cardStackPreferencesByAccount: {},
      identityColorSlotsByAccount: {},
      lastOpenedAccountTimestamps: {[ACCOUNT]: 1800000000000},
    }});
    await loadModules();
    const {generalWalletSettings} = await require('../../asyncStore/settingsStorage').loadSettings();
    expect(generalWalletSettings.cardStackPreferencesByAccount).toEqual(walletUi.cardStackPreferencesByAccount);
    expect(generalWalletSettings.identityColorSlotsByAccount).toEqual(walletUi.identityColorSlotsByAccount);
    expect(generalWalletSettings.lastOpenedAccountTimestamps).toEqual({
      [ACCOUNT]: 1800000000000,
      [OTHER_ACCOUNT]: 1600000000000,
    });
  });

  it('keeps a queued change of another profile when a profile is deleted', async () => {
    await loadModules();
    const {DEFAULT_SETTINGS} = require('../../settings/settingsDefaults');
    mockState = {
      settings: {
        ...DEFAULT_SETTINGS,
        generalWalletSettings: {...DEFAULT_SETTINGS.generalWalletSettings, ...walletUi},
      },
    };
    const {
      deleteAccountWalletUiSettings,
      saveGeneralSettings,
    } = require('../../../actions/actions/WalletSettings');
    const {loadSettings} = require('../../asyncStore/settingsStorage');
    const otherColors = {[OTHER_ACCOUNT]: {iOtherIdentity: 4}};

    await Promise.all([
      saveGeneralSettings({
        identityColorSlotsByAccount: {...walletUi.identityColorSlotsByAccount, ...otherColors},
      }),
      deleteAccountWalletUiSettings(ACCOUNT),
    ]);

    expect((await loadSettings()).generalWalletSettings.identityColorSlotsByAccount).toEqual(otherColors);
  });

  it('removes a deleted profile from the saved choices and from Redux', async () => {
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
});

describe('cleanup of old plain keys', () => {
  it('deletes old identifying keys and keeps the plain display switches', async () => {
    const AsyncStorage = require('@react-native-async-storage/async-storage');
    await AsyncStorage.multiSet([
      [`assetDiscoveryCache:v1:${ACCOUNT}:testnet`, JSON.stringify({snapshots: {[ADDRESS]: {}}})],
      ['portfolioMarketHistory:v1', JSON.stringify({'paprika:btc-bitcoin:daily': {}})],
      ['paid_invoice_markers', JSON.stringify({marker: {txid: TXID}})],
      ['balancePrivacy:hidden:v1', 'true'],
      ['homeValueChart:open:v1', 'open'],
    ]);
    const {removeLegacyPlainKeys} = require('../../asyncStore/legacyPlainKeys');

    await removeLegacyPlainKeys();

    expect((await AsyncStorage.getAllKeys()).sort()).toEqual([
      'balancePrivacy:hidden:v1',
      'homeValueChart:open:v1',
    ]);
  });
});
