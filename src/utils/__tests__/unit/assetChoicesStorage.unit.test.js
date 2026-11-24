// PR 266 review R17: a profile's asset choices are in its password-encrypted
// service data ("wallet_asset_management"), never in plain AsyncStorage.
// The screen changes first; the encrypted write runs after it.
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
jest.mock('../../../actions/actions/intervals/dispatchers/lifecycleManager', () => ({
  refreshLifecyclesAfterAssetChange: jest.fn(),
}));
jest.mock('../../../actions/actionCreators', () => ({
  ...jest.requireActual('../../../actions/actionCreators'),
  removeExistingCoin: jest.fn(async () => []),
  setUserCoins: coins => ({type: 'SET_USER_COINS', payload: {activeCoinsForUser: coins}}),
}));
jest.mock('../../CoinData/assetIdentifierService', () => ({
  addResolvedAsset: jest.fn(),
  resolveAssetIdentifier: jest.fn(),
}));

const ACCOUNT = 'account-hash-1';
const PASSWORD = 'wallet-password';
const SESSION_KEY = 'session-key';
const CREDENTIAL = 'device-secure-storage-credential';
const SERVICE_ID = 'wallet_asset_management';
const PLAIN_KEY = `assetChoices:v1:${ACCOUNT}`;
const ACTIVE_ACCOUNT = {
  id: 'Tester',
  accountHash: ACCOUNT,
  testnetOverrides: {VRSC: 'VRSCTEST', ETH: 'GETH'},
};
const NETWORK = 'testnet:VRSCTEST:GETH';
const COIN = {id: 'iCoinA', currency_id: 'iCoinA', proto: 'vrsc', system_id: 'iSystem', testnet: true};
const COIN_KEY = 'testnet:vrsc:iSystem:iCoinA';
const HOLDING = {
  currencyId: 'iCoinB',
  systemId: 'iSystem',
  result: {
    kind: 'pbaas',
    testnet: true,
    lookupSystemId: 'iSystem',
    currencyDefinition: {currencyid: 'iCoinB', fullyqualifiedname: 'CoinB', systemid: 'iSystem'},
  },
};

// A fresh module registry, as after an app restart. The AsyncStorage mock
// keeps its data in module scope, so carry the stored values over.
const restart = async () => {
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

// Signs in with the service data that is in storage, as the app does.
const signIn = async () => {
  const {encryptkey} = require('../../seedCrypt');
  const Keychain = require('react-native-keychain');
  Keychain.getInternetCredentials.mockResolvedValue({
    password: await encryptkey(SESSION_KEY, PASSWORD),
  });
  const {SET_SERVICE_STORED_DATA} = require('../../constants/storeType');
  const {assetManagement} = require('../../../reducers/assetManagement');
  const {loadServiceStoredDataForUser} = require('../../asyncStore/serviceStoredDataStorage');
  mockState = {
    authentication: {
      signedIn: true,
      activeAccount: ACTIVE_ACCOUNT,
      sessionKey: SESSION_KEY,
      sessionEpoch: 1,
    },
    services: {stored: await loadServiceStoredDataForUser(ACCOUNT)},
    assetManagement: assetManagement(undefined, {type: '@@INIT'}),
  };
  mockDispatch.mockImplementation(action => {
    if (action.type === SET_SERVICE_STORED_DATA) {
      mockState = {...mockState, services: {stored: action.payload.data}};
    }
    mockState = {...mockState, assetManagement: assetManagement(mockState.assetManagement, action)};
  });
  const service = require('../../assets/assetManagementService');
  await service.loadAssetManagement();
  return service;
};

// Waits for the background writes of the profile.
const writesDone = () => {
  const {finishAssetChoiceWrites} = require('../../assets/assetChoicesStorage');
  return finishAssetChoiceWrites ? finishAssetChoiceWrites(ACCOUNT) : Promise.resolve();
};

const storedChoices = async () => {
  const {loadServiceStoredDataForUser} = require('../../asyncStore/serviceStoredDataStorage');
  const {decryptkey} = require('../../seedCrypt');
  const entry = (await loadServiceStoredDataForUser(ACCOUNT))[SERVICE_ID];
  return entry == null ? null : JSON.parse(decryptkey(PASSWORD, entry));
};

const plainDump = async AsyncStorage => {
  const keys = await AsyncStorage.getAllKeys();
  return (await AsyncStorage.multiGet(keys)).map(([key, value]) => `${key}=${value}`).join('\n');
};

// Counts the writes of the service data root and can make them fail.
const serviceWrites = SecureStorage => {
  const {SERVICE_STORAGE_INTERNAL_KEY} = require('../../../../env/index');
  const original = SecureStorage.setItem.bind(SecureStorage);
  let failing = false;
  let count = 0;
  jest.spyOn(SecureStorage, 'setItem').mockImplementation((key, ...rest) => {
    if (key === SERVICE_STORAGE_INTERNAL_KEY) {
      count += 1;
      if (failing) return Promise.reject(new Error('Keychain write failed'));
    }
    return original(key, ...rest);
  });
  return {count: () => count, fail: value => { failing = value; }};
};

beforeEach(async () => {
  const AsyncStorage = require('@react-native-async-storage/async-storage');
  await AsyncStorage.clear();
  mockDispatch.mockReset();
  mockState = undefined;
  jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('asset choices storage (R17)', () => {
  it('keeps the choices in the encrypted entry, not in plain storage', async () => {
    const {AsyncStorage} = await restart();
    const service = await signIn();

    await service.setAssetHomeVisibility(COIN, false);
    await service.ignoreAssetHolding(HOLDING);
    await writesDone();

    const dump = await plainDump(AsyncStorage);
    expect(dump).not.toContain('assetChoices');
    expect(dump).not.toContain('iCoinA');
    expect(dump).not.toContain('iCoinB');
    const stored = await storedChoices();
    expect(stored.version).toBe(1);
    expect(stored.networks[NETWORK].preferences[COIN_KEY]).toEqual({hidden: true});
    expect(stored.networks[NETWORK].removed.iCoinB).toEqual(expect.any(Object));

    // After a restart, the choices come back from the encrypted entry.
    await restart();
    await signIn();
    expect(mockState.assetManagement.preferences[COIN_KEY]).toEqual({hidden: true});
    expect(mockState.assetManagement.removed.iCoinB).toEqual(expect.any(Object));
  });

  it('moves the plain choices of older builds and deletes the plain key after the write', async () => {
    let {AsyncStorage, SecureStorage} = await restart();
    const plainRecord = {
      version: 1,
      networks: {[NETWORK]: {
        preferences: {[COIN_KEY]: {hidden: true}},
        removed: {iCoinB: {name: 'CoinB'}},
        reviewed: {iCoinC: true},
      }},
    };
    await AsyncStorage.setItem(PLAIN_KEY, JSON.stringify(plainRecord));

    // The app stops before the encrypted write ends: the writes fail here.
    serviceWrites(SecureStorage).fail(true);
    await signIn();
    expect(mockState.assetManagement.removed.iCoinB).toEqual({name: 'CoinB'});
    await writesDone();
    expect(JSON.parse(await AsyncStorage.getItem(PLAIN_KEY))).toEqual(plainRecord);
    expect(await storedChoices()).toBeNull();

    // The next unlock moves the record and only then deletes the plain key.
    ({AsyncStorage} = await restart());
    await signIn();
    await writesDone();
    expect(await AsyncStorage.getItem(PLAIN_KEY)).toBeNull();
    expect(await storedChoices()).toEqual(plainRecord);
    await restart();
    await signIn();
    expect(mockState.assetManagement.preferences).toEqual({[COIN_KEY]: {hidden: true}});
    expect(mockState.assetManagement.removed).toEqual({iCoinB: {name: 'CoinB'}});
    expect(mockState.assetManagement.reviewed).toEqual({iCoinC: true});
  });

  it('shows quick choices at once and stores all of them in order', async () => {
    const {SecureStorage} = await restart();
    const service = await signIn();
    const {queueServiceStorageWrite} = require('../../asyncStore/passwordProtectedStorageQueue');
    // Another service write is slow (it encrypts all profiles' service data).
    let releaseSlowWrite;
    queueServiceStorageWrite(() => new Promise(resolve => { releaseSlowWrite = resolve; }));
    const writes = serviceWrites(SecureStorage);

    await service.setAssetHomeVisibility(COIN, false);
    await service.ignoreAssetHolding(HOLDING);
    await service.setAssetHomeVisibility(COIN, true);

    // The screen has all three while no write has ended.
    expect(mockState.assetManagement.preferences[COIN_KEY]).toEqual({hidden: false});
    expect(mockState.assetManagement.removed.iCoinB).toEqual(expect.any(Object));
    expect(await storedChoices()).toBeNull();

    releaseSlowWrite();
    await writesDone();
    const stored = await storedChoices();
    // The last choice wins: hide, then show again.
    expect(stored.networks[NETWORK].preferences[COIN_KEY]).toEqual({hidden: false});
    expect(stored.networks[NETWORK].removed.iCoinB).toEqual(expect.any(Object));
    // Changes that wait are merged into fewer writes.
    expect(writes.count()).toBeLessThan(3);
  });

  it('writes a choice again with the next change after a failed write', async () => {
    const {SecureStorage} = await restart();
    const service = await signIn();
    const writes = serviceWrites(SecureStorage);
    writes.fail(true);

    await service.setAssetHomeVisibility(COIN, false);
    await writesDone();
    expect(writes.count()).toBeGreaterThan(0);
    // The failed write does not take the choice off the screen.
    expect(mockState.assetManagement.preferences[COIN_KEY]).toEqual({hidden: true});
    expect(await storedChoices()).toBeNull();

    writes.fail(false);
    await service.ignoreAssetHolding(HOLDING);
    await writesDone();
    const stored = await storedChoices();
    expect(stored.networks[NETWORK].preferences[COIN_KEY]).toEqual({hidden: true});
    expect(stored.networks[NETWORK].removed.iCoinB).toEqual(expect.any(Object));
  });

  it('keeps "My order" and the Home sort in the encrypted entry (R2)', async () => {
    const {AsyncStorage} = await restart();
    const service = await signIn();
    // A wallet from an older build: no saved order, and the default sort.
    expect(mockState.assetManagement.order).toBeNull();
    expect(mockState.assetManagement.sort).toBe('custom');

    await service.setAssetOrder(['testnet:vrsc:iSystem:iCoinB', COIN_KEY]);
    await service.setHomeSort('name');
    await writesDone();

    const dump = await plainDump(AsyncStorage);
    expect(dump).not.toContain('iCoinA');
    expect(dump).not.toContain('iCoinB');
    const stored = await storedChoices();
    expect(stored.networks[NETWORK].order).toEqual(['testnet:vrsc:iSystem:iCoinB', COIN_KEY]);
    expect(stored.networks[NETWORK].sort).toBe('name');

    // Reversing is saved with the sort; another sort puts it back to normal.
    await service.setHomeSortReversed(true);
    await writesDone();
    expect((await storedChoices()).networks[NETWORK].sortReversed).toBe(true);
    await service.setHomeSort('name');
    await writesDone();
    expect((await storedChoices()).networks[NETWORK].sortReversed).toBe(true);
    await service.setHomeSort('balance');
    await writesDone();
    expect((await storedChoices()).networks[NETWORK].sortReversed).toBe(false);
    await service.setHomeSort('name');
    await service.setHomeSortReversed(true);
    await writesDone();

    // A restart, which also follows a sign-out, keeps both.
    await restart();
    await signIn();
    expect(mockState.assetManagement.order).toEqual(['testnet:vrsc:iSystem:iCoinB', COIN_KEY]);
    expect(mockState.assetManagement.sort).toBe('name');
  });

  it('takes a removed asset out of "My order", so any later add puts it last (R2)', async () => {
    await restart();
    const service = await signIn();
    await service.setAssetOrder([COIN_KEY, 'testnet:vrsc:iSystem:iCoinB']);
    await service.removeManagedAsset({coin: COIN});
    await writesDone();
    expect((await storedChoices()).networks[NETWORK].order).toEqual(['testnet:vrsc:iSystem:iCoinB']);
  });

  it('writes nothing for a profile after its delete started', async () => {
    const {SecureStorage} = await restart();
    const service = await signIn();
    const {closeAssetChoices} = require('../../assets/assetChoicesStorage');
    const writes = serviceWrites(SecureStorage);

    await closeAssetChoices(ACCOUNT);
    await service.setAssetHomeVisibility(COIN, false);
    await writesDone();

    expect(writes.count()).toBe(0);
    expect(await storedChoices()).toBeNull();
  });

  it('keeps a choice that waits when a profile delete fails', async () => {
    const {SecureStorage} = await restart();
    const service = await signIn();
    const choices = require('../../assets/assetChoicesStorage');
    const writes = serviceWrites(SecureStorage);
    writes.fail(true);
    await service.setAssetHomeVisibility(COIN, false);
    await writesDone();

    // The delete starts, then fails, so the profile stays.
    await choices.closeAssetChoices(ACCOUNT);
    writes.fail(false);
    choices.reopenAssetChoices(ACCOUNT);
    await writesDone();

    const stored = await storedChoices();
    expect(stored.networks[NETWORK].preferences[COIN_KEY]).toEqual({hidden: true});
  });
});
