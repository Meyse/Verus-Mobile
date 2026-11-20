// PR 266 F9: sign-in, Home and balance updates only count found currencies.
// They are looked up (getcurrency) only while Manage assets is open.
let mockState;
const mockDispatch = jest.fn();
const mockResolve = jest.fn();

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
jest.mock('../../CoinData/assetIdentifierService', () => ({
  addResolvedAsset: jest.fn(),
  resolveAssetIdentifier: (...args) => mockResolve(...args),
}));

const ACCOUNT = {
  id: 'Tester',
  accountHash: 'account-hash-1',
  testnetOverrides: {VRSC: 'VRSCTEST', ETH: 'GETH'},
};
const CHANNEL = 'vrpc.RAddress.iSystem';
const snapshot = currencies => ({systemId: 'iSystem', testnet: true, currencies});
const settle = () => new Promise(resolve => setTimeout(resolve, 0));

describe('found asset lookups (F9)', () => {
  let service;
  let balanceUpdate;

  beforeEach(() => {
    jest.resetModules();
    const {assetManagement} = require('../../../reducers/assetManagement');
    const {SET_BALANCES} = require('../../constants/storeType');
    const {API_GET_BALANCES} = require('../../constants/intervalConstants');
    const {assetNetworkKey} = require('../../assets/assetIdentity');
    mockState = {
      authentication: {signedIn: true, activeAccount: ACCOUNT, sessionEpoch: 1},
      coins: {activeCoinsForUser: []},
      coinMenus: {allSubWallets: {VRSCTEST: [{api_channels: {[API_GET_BALANCES]: CHANNEL}}]}},
      assetManagement: {
        ...assetManagement(undefined, {type: '@@INIT'}),
        ready: true,
        networkKey: assetNetworkKey(ACCOUNT),
      },
    };
    mockDispatch.mockReset().mockImplementation(action => {
      mockState = {...mockState, assetManagement: assetManagement(mockState.assetManagement, action)};
    });
    mockResolve.mockReset().mockImplementation(async ({identifier}) => ({
      kind: 'pbaas',
      currencyDefinition: {currencyid: identifier, fullyqualifiedname: identifier},
    }));
    balanceUpdate = currencies => {
      mockDispatch({type: SET_BALANCES, payload: {channel: CHANNEL, assetDiscovery: snapshot(currencies)}});
      service.scheduleAssetDiscovery();
    };
    service = require('../../assets/assetManagementService');
  });

  it('counts found currencies on Home without a lookup, and looks them up on Manage assets', async () => {
    balanceUpdate({iFoundOne: '5', iFoundTwo: '1'});
    await settle();
    expect(mockResolve).not.toHaveBeenCalled();
    expect(service.getUnreviewedNewAssetHoldings(mockState)).toHaveLength(2);
    expect(service.getNewAssetHoldings(mockState)).toHaveLength(0);

    const release = service.requestFoundAssetLookups();
    await settle();
    expect(mockResolve).toHaveBeenCalledTimes(2);
    expect(service.getNewAssetHoldings(mockState)).toHaveLength(2);

    // Leaving Manage assets stops the lookups for later balance updates.
    release();
    balanceUpdate({iFoundOne: '5', iFoundTwo: '1', iFoundThree: '2'});
    await settle();
    expect(mockResolve).toHaveBeenCalledTimes(2);
    expect(service.getUnreviewedNewAssetHoldings(mockState)).toHaveLength(3);
  });
});
