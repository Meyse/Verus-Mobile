// F11 (PR 266): a currency list is saved with the time of its request and is
// asked again only when a caller needs it and the saved list is one hour old.
const mockRpcRequest = jest.fn();

jest.mock('verusd-rpc-ts-client', () => ({
  VerusdRpcInterface: class VerusdRpcInterface {
    constructor(chain) {
      this.chain = chain;
    }

    request(request) {
      return mockRpcRequest(request);
    }
  },
}));
jest.mock('verusid-ts-client', () => ({VerusIdInterface: class {}}));
jest.mock('react-native', () => ({
  Alert: {alert: jest.fn()},
  AppState: {currentState: 'active', addEventListener: jest.fn()},
}));
jest.mock('../../../store', () => ({
  __esModule: true,
  default: {
    dispatch: jest.fn(),
    getState: () => ({channelStore_vrpc: {vrpcEndpoints: {}}}),
  },
}));
// The real storage modules on the AsyncStorage test double, without the
// account code that asyncStore.js also exports.
jest.mock('../../asyncStore/asyncStore', () => ({
  ...jest.requireActual('../../asyncStore/cache/vrpcResponseCache'),
  ...jest.requireActual('../../asyncStore/cache/savedVrpcResponses'),
}));
jest.mock('../../CoinData/CoinsList', () => ({
  coinsList: {
    VRSC: {system_id: 'i5w5MuNik5NtLcYmNzcvaoixooEebB6MGV'},
    VRSCTEST: {system_id: 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq'},
  },
}));
jest.mock('../../CoinData/CoinDirectory', () => ({
  CoinDirectory: {getVrpcEndpoints: () => []},
}));
jest.mock('../../../../env/index', () => ({
  VRPC_API_APP_ID: undefined,
  VRPC_API_KEYS: {},
}));

const AsyncStorage = require('@react-native-async-storage/async-storage');
const {ListCurrenciesRequest} = require('verus-typescript-primitives');

const SYSTEM = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
const SERVER = 'https://lists.example.com';
const MINUTE = 60 * 1000;

describe('saved listcurrencies (F11)', () => {
  let vrpc;

  // A new client has no memory of earlier requests, as after a restart.
  const newClient = () => {
    vrpc.deleteAllEndpoints();
    vrpc.saveChainEndpoint(SYSTEM, SERVER);
    return vrpc.cacheInterfaces[vrpc.systemEndpointIds[SYSTEM][0]];
  };
  const list = params => new ListCurrenciesRequest(SYSTEM, params);
  const listCalls = () =>
    mockRpcRequest.mock.calls.filter(([req]) => req.cmd === 'listcurrencies');

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-20T08:00:00Z'));
    await AsyncStorage.clear();
    mockRpcRequest.mockReset().mockImplementation(req =>
      Promise.resolve({id: 1, error: null, result: [{at: Date.now(), params: req.prepare().params}]}),
    );
    vrpc = require('../../vrpc/vrpcInterface').default;
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('serves the saved list for one hour, also to a new client, then asks once', async () => {
    const first = await newClient().request(list({systemtype: 'local'}));
    expect(listCalls()).toHaveLength(1);

    jest.setSystemTime(Date.now() + 59 * MINUTE);
    await expect(newClient().request(list({systemtype: 'local'}))).resolves.toEqual(first);
    expect(listCalls()).toHaveLength(1);

    jest.setSystemTime(Date.now() + MINUTE);
    const refreshed = await newClient().request(list({systemtype: 'local'}));
    expect(listCalls()).toHaveLength(2);
    expect(refreshed).not.toEqual(first);

    // The new list starts a new hour.
    jest.setSystemTime(Date.now() + 30 * MINUTE);
    await expect(newClient().request(list({systemtype: 'local'}))).resolves.toEqual(refreshed);
    expect(listCalls()).toHaveLength(2);
  });

  it('keeps one list per parameter set and never saves a failed answer', async () => {
    const client = newClient();
    await client.request(list({systemtype: 'local'}));
    await client.request(list({systemtype: 'imported'}));
    expect(listCalls()).toHaveLength(2);

    mockRpcRequest.mockImplementation(() =>
      Promise.resolve({id: 1, error: {code: -1, message: 'busy'}, result: null}),
    );
    await client.request(list({launchstate: 'prelaunch'}));
    await client.request(list({launchstate: 'prelaunch'}));
    expect(listCalls()).toHaveLength(4);

    await client.request(list({systemtype: 'local'}));
    await client.request(list({systemtype: 'imported'}));
    expect(listCalls()).toHaveLength(4);
  });
});
