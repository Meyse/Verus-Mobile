// PR 266 audit rows 2, 5, 12: coin screen, card picker and VerusID list read a
// card only when its data is expired (60 s), as upstream. A pull forces a read.
const mockUpdateWallets = jest.fn();
let mockState;

jest.mock('../../../store', () => ({
  __esModule: true,
  default: {getState: () => mockState, dispatch: jest.fn()},
}));
jest.mock('../../../actions/actionDispatchers', () => ({
  conditionallyUpdateWallets: (...args) => mockUpdateWallets(...args),
}));

const {refreshWalletChannels} = require('../../ledger/refreshWalletChannels');
const {API_GET_BALANCES} = require('../../constants/intervalConstants');

const CHANNEL = 'vrpc.RTestAddress.iTestSystem';
const card = {id: 'main', api_channels: {[API_GET_BALANCES]: CHANNEL}};
let session = 0;

const setTracker = tracker => {
  mockState.updates.coinUpdateTracker.VRSCTEST[API_GET_BALANCES] = {
    channels: [CHANNEL], busy: {}, ...tracker,
  };
};

const readChannels = async options => {
  mockUpdateWallets.mockClear();
  await refreshWalletChannels('VRSCTEST', [card], [API_GET_BALANCES], options);
  return mockUpdateWallets.mock.calls[0][2][0].channels;
};

beforeEach(() => {
  jest.useFakeTimers().setSystemTime(1000000);
  // A new session clears the read times of the last test.
  session += 1;
  mockState = {
    authentication: {activeAccount: {accountHash: 'alice'}, sessionEpoch: session},
    coins: {coinMenuFocused: true, activeCoin: {id: 'VRSCTEST'}, activeSection: {key: 'wallet-overview'}},
    updates: {
      coinUpdateTracker: {VRSCTEST: {}},
      coinUpdateIntervals: {VRSCTEST: {[API_GET_BALANCES]: {expire_timeout: 60000}}},
    },
    channelStore_vrpc: {openCoinChannels: {VRSCTEST: true}},
  };
  mockUpdateWallets.mockReset().mockResolvedValue(['success']);
});

afterEach(() => jest.useRealTimers());

test('fresh data is not read again', async () => {
  setTracker({needs_update: false});
  expect(await readChannels()).toEqual([]);
});

test('expired data is read once per card per 60 seconds', async () => {
  setTracker({needs_update: true, expired_at: 999000});
  expect(await readChannels()).toEqual([CHANNEL]);

  jest.setSystemTime(1059000);
  expect(await readChannels()).toEqual([]);

  jest.setSystemTime(1060000);
  expect(await readChannels()).toEqual([CHANNEL]);
});

test('an explicit expiry after the last read (a send) reads at once', async () => {
  setTracker({needs_update: true, expired_at: 999000});
  expect(await readChannels()).toEqual([CHANNEL]);

  jest.setSystemTime(1010000);
  setTracker({needs_update: true, expired_at: 1010000});
  expect(await readChannels()).toEqual([CHANNEL]);
});

test('a failed read leaves the card expired, so the next visit reads again', async () => {
  setTracker({needs_update: true, expired_at: 999000});
  mockUpdateWallets.mockResolvedValueOnce(['error']);
  expect(await readChannels()).toEqual([CHANNEL]);

  jest.setSystemTime(1005000);
  expect(await readChannels()).toEqual([CHANNEL]);
});

test('a pull reads fresh data, but never a busy channel', async () => {
  setTracker({needs_update: false});
  expect(await readChannels({force: true})).toEqual([CHANNEL]);

  setTracker({needs_update: true, busy: {[CHANNEL]: true}});
  expect(await readChannels({force: true})).toEqual([]);
});
