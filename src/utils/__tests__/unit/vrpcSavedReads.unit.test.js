// PR 266 F11: a currency list is saved with the time of its request and is
// asked again only when a caller needs it and the saved list is one hour old.
// PR 266 F10: a definition read for its fixed fields is saved for one day
// without its state; a display-only block height can be one minute old.
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
const {
  GetCurrencyRequest,
  GetInfoRequest,
  ListCurrenciesRequest,
} = require('verus-typescript-primitives');

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

describe('static currency definitions and display heights (F10)', () => {
  let vrpc;
  let height;
  const newClient = () => {
    vrpc.deleteAllEndpoints();
    vrpc.saveChainEndpoint(SYSTEM, SERVER);
    return vrpc.cacheInterfaces[vrpc.systemEndpointIds[SYSTEM][0]];
  };
  const calls = cmd => mockRpcRequest.mock.calls.filter(([req]) => req.cmd === cmd);
  const definition = {
    currencyid: 'iCurrency',
    fullyqualifiedname: 'Basket',
    systemid: SYSTEM,
    startblock: 100,
  };

  beforeEach(async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-20T08:00:00Z'));
    await AsyncStorage.clear();
    height = 1000;
    mockRpcRequest.mockReset().mockImplementation(req => Promise.resolve(
      req.cmd === 'getinfo'
        ? {id: 1, error: null, result: {longestchain: height, blocks: height}}
        : {id: 1, error: null, result: {
          ...definition,
          bestheight: height,
          bestcurrencystate: {supply: height},
          lastconfirmedcurrencystate: {supply: height},
        }},
    ));
    vrpc = require('../../vrpc/vrpcInterface').default;
    jest.spyOn(console, 'log').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  it('serves a definition without its state for one day, while getcurrency stays fresh', async () => {
    const saved = await newClient().getCurrencyDefinition('iCurrency');
    expect(saved.result).toEqual(definition);
    expect(calls('getcurrency')).toHaveLength(1);

    jest.setSystemTime(Date.now() + 23 * 60 * MINUTE);
    const client = newClient();
    await expect(client.getCurrencyDefinition('iCurrency')).resolves.toEqual(saved);
    expect(calls('getcurrency')).toHaveLength(1);

    // A caller that needs the state still asks the server and gets the state.
    height = 2000;
    const live = await client.request(new GetCurrencyRequest(SYSTEM, 'iCurrency'));
    expect(calls('getcurrency')).toHaveLength(2);
    expect(live.result.bestcurrencystate).toEqual({supply: 2000});

    jest.setSystemTime(Date.now() + 60 * MINUTE);
    await newClient().getCurrencyDefinition('iCurrency');
    expect(calls('getcurrency')).toHaveLength(3);
  });

  it('lets a display read use a height up to one minute old, never a fresh read', async () => {
    const client = newClient();
    const info = () => new GetInfoRequest(SYSTEM);
    await client.request(info());
    expect(calls('getinfo')).toHaveLength(1);

    height = 1001;
    jest.setSystemTime(Date.now() + 59 * 1000);
    await expect(client.requestWithMaxAge(info(), 60 * 1000)).resolves
      .toMatchObject({result: {longestchain: 1000}});
    expect(calls('getinfo')).toHaveLength(1);

    // The 1-second limit of a fresh read is unchanged.
    await expect(client.request(info())).resolves
      .toMatchObject({result: {longestchain: 1001}});
    expect(calls('getinfo')).toHaveLength(2);

    jest.setSystemTime(Date.now() + 60 * 1000);
    height = 1002;
    await expect(client.requestWithMaxAge(info(), 60 * 1000)).resolves
      .toMatchObject({result: {longestchain: 1002}});
    expect(calls('getinfo')).toHaveLength(3);
  });
});
