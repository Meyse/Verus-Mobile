// F3 (PR 266 review, 2026-11-20): the coin screen polls getinfo every 60 s,
// reads balance and history only when the block height went up, and stops
// after 5 minutes without a pending transaction until the card's data changes.
const mockGetInfo = jest.fn();
const mockRefreshCard = jest.fn();
const mockState = {
  authentication: {activeAccount: {accountHash: 'alice'}, sessionEpoch: 1},
  coins: {coinMenuFocused: true, activeCoin: {id: 'VRSCTEST'}, activeSection: {key: 'wallet-overview'}},
  updates: {coinUpdateTracker: {}},
};

jest.mock('react-redux', () => ({connect: () => component => component}));
jest.mock('react-native-paper', () => ({Portal: 'Portal', List: {}, Text: 'Text', Badge: 'Badge'}));
jest.mock('../../../store', () => ({__esModule: true, default: {getState: () => mockState}}));
jest.mock('../../../styles', () => ({}));
jest.mock('../../../images/customIcons', () => ({TransactionLogos: {}}));
jest.mock('../../../containers/Coin/Overview/TransactionDetailsSheet', () => ({__esModule: true, default: () => null, decodeTxid: jest.fn()}));
jest.mock('../../../selectors/transactions', () => ({selectTransactions: jest.fn()}));
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {}}));
jest.mock('../../math', () => ({scientificToDecimal: jest.fn()}));
jest.mock('../../../actions/actionCreators', () => ({
  expireCoinData: jest.fn(), expireServiceData: jest.fn(), setActiveOverviewFilter: jest.fn(),
}));
jest.mock('../../../actions/actionDispatchers', () => ({
  conditionallyUpdateWallets: jest.fn().mockResolvedValue([]),
  conditionallyUpdateService: jest.fn().mockResolvedValue(undefined),
}));
// Network boundary: the selected card's getinfo, and the card's wallet reads.
jest.mock('../../api/channels/vrpc/requests/getInfo', () => ({
  getInfo: (...args) => mockGetInfo(...args),
}));
jest.mock('../../ledger/refreshWalletChannels', () => ({
  refreshWalletChannels: (...args) => mockRefreshCard(...args),
}));

const Overview = require('../../../containers/Coin/Overview/Overview').default;
const {noteObservedHeight, clearObservedHeights} = require('../../ledger/blockHeightPoll');
const {API_GET_BALANCES, API_GET_TRANSACTIONS} = require('../../constants/intervalConstants');

const CHANNEL = 'vrpc.RTestAddress.iTestSystem';
const card = {id: 'main', api_channels: {[API_GET_BALANCES]: CHANNEL, [API_GET_TRANSACTIONS]: CHANNEL}};
const confirmed = {results: [{txid: 'a', confirmed: true}]};
const pending = {results: [{txid: 'b', confirmed: false, status: 'pending'}, {txid: 'a', confirmed: true}]};
const minute = () => jest.advanceTimersByTimeAsync(60000);

let height;
let overview;

const mount = transactions => {
  overview = new Overview({
    dispatch: jest.fn(), activeCoin: {id: 'VRSCTEST'}, activeSubWallet: card,
    navigation: {isFocused: () => true, addListener: () => () => {}},
    transactions, balanceKey: '1:0:1',
  });
  overview.setState = (state, callback) => {
    overview.state = {...overview.state, ...state};
    callback?.();
  };
  overview.componentDidMount();
};

const setProps = props => {
  const prevProps = overview.props;
  overview.props = {...prevProps, ...props};
  overview.componentDidUpdate(prevProps);
};

const reads = () => mockRefreshCard.mock.calls.map(call => call[2]);

beforeEach(() => {
  jest.useFakeTimers();
  clearObservedHeights();
  height = 100;
  // The screen's own history read saw height 100.
  noteObservedHeight(CHANNEL, 100);
  mockGetInfo.mockReset().mockImplementation(async () => ({result: {longestchain: height}}));
  mockRefreshCard.mockReset().mockImplementation(async (coin, cards, updateIds) => {
    if (updateIds.includes(API_GET_TRANSACTIONS)) noteObservedHeight(CHANNEL, height);
    return updateIds.map(() => 'success');
  });
});

afterEach(() => {
  overview?.componentWillUnmount();
  jest.useRealTimers();
});

test('each minute sends one getinfo, and reads the card only when the height went up', async () => {
  mount(confirmed);
  mockRefreshCard.mockClear();

  await jest.advanceTimersByTimeAsync(59000);
  expect(mockGetInfo).not.toHaveBeenCalled();

  await jest.advanceTimersByTimeAsync(1000);
  expect(mockGetInfo.mock.calls).toEqual([['iTestSystem']]);
  expect(mockRefreshCard).not.toHaveBeenCalled();

  height = 101;
  await minute();
  expect(mockGetInfo).toHaveBeenCalledTimes(2);
  expect(mockRefreshCard.mock.calls).toEqual([
    ['VRSCTEST', [card], [API_GET_BALANCES, API_GET_TRANSACTIONS], {force: true}],
  ]);

  await minute();
  expect(mockGetInfo).toHaveBeenCalledTimes(3);
  expect(mockRefreshCard).toHaveBeenCalledTimes(1);
});

test('after 5 minutes without a pending transaction the poll stops until the data changes', async () => {
  mount(confirmed);
  mockRefreshCard.mockClear();

  for (let i = 0; i < 5; i++) await minute();
  expect(mockGetInfo).toHaveBeenCalledTimes(5);

  // Stopped: no timer, as upstream.
  for (let i = 0; i < 10; i++) await minute();
  expect(mockGetInfo).toHaveBeenCalledTimes(5);
  expect(mockRefreshCard).not.toHaveBeenCalled();

  // A background refresh that returns the same content does not start it again.
  setProps({transactions: {results: [{txid: 'a', confirmed: true}]}});
  await minute();
  expect(mockGetInfo).toHaveBeenCalledTimes(5);

  // New content (a received payment) starts the poll for 5 more minutes.
  setProps({balanceKey: '2:0:2'});
  for (let i = 0; i < 7; i++) await minute();
  expect(mockGetInfo).toHaveBeenCalledTimes(10);

  // A pull reads the card: the poll starts again.
  overview.forceUpdate();
  for (let i = 0; i < 7; i++) await minute();
  expect(mockGetInfo).toHaveBeenCalledTimes(15);
});

test('a height rise whose balance read failed is read again on the next tick', async () => {
  mount(confirmed);
  mockRefreshCard.mockClear();
  // History succeeds and records the new height; the balance read fails.
  mockRefreshCard.mockImplementationOnce(async () => {
    noteObservedHeight(CHANNEL, height);
    return ['error', 'success'];
  });

  height = 101;
  await minute();
  await minute();
  expect(reads()).toEqual([
    [API_GET_BALANCES, API_GET_TRANSACTIONS],
    [API_GET_BALANCES, API_GET_TRANSACTIONS],
  ]);

  await minute();
  expect(mockRefreshCard).toHaveBeenCalledTimes(2);
});

test('a tick whose getinfo returns after the app went to the background reads nothing', async () => {
  mount(confirmed);
  mockRefreshCard.mockClear();
  let answer;
  mockGetInfo.mockImplementationOnce(() => new Promise(resolve => {answer = resolve;}));

  await minute();
  expect(mockGetInfo).toHaveBeenCalledTimes(1);
  overview.appActive = false;
  answer({result: {longestchain: 101}});
  await jest.advanceTimersByTimeAsync(0);

  expect(mockRefreshCard).not.toHaveBeenCalled();
});

test('a pending transaction reads history each tick and keeps the poll alive', async () => {
  mount(pending);
  mockRefreshCard.mockClear();

  for (let i = 0; i < 8; i++) await minute();
  expect(mockGetInfo).toHaveBeenCalledTimes(8);
  // Same height: history (with its mempool read) only, never the balance.
  expect(reads()).toEqual(Array(8).fill([API_GET_TRANSACTIONS]));

  // The transaction confirms in the next block. Content changed, so the
  // 5 minutes start again from that tick.
  mockRefreshCard.mockImplementationOnce(async (coin, cards, updateIds) => {
    noteObservedHeight(CHANNEL, height);
    setProps({transactions: {results: [{txid: 'b', confirmed: true}, {txid: 'a', confirmed: true}]}});
    return updateIds.map(() => 'success');
  });
  height = 101;
  await minute();
  expect(reads()[8]).toEqual([API_GET_BALANCES, API_GET_TRANSACTIONS]);

  for (let i = 0; i < 10; i++) await minute();
  expect(mockGetInfo).toHaveBeenCalledTimes(14);
});

test('no tick while the screen is hidden, the app is in the background, or an update runs', async () => {
  let focused = true;
  mount(confirmed);
  overview.props.navigation.isFocused = () => focused;

  focused = false;
  await minute();
  expect(mockGetInfo).not.toHaveBeenCalled();
  focused = true;
  overview.heightPoll.resume();

  overview.appActive = false;
  await minute();
  expect(mockGetInfo).not.toHaveBeenCalled();
  overview.appActive = true;
  overview.heightPoll.resume();

  mockState.updates.coinUpdateTracker = {
    VRSCTEST: {[API_GET_BALANCES]: {busy: {[CHANNEL]: true}}},
  };
  try {
    await minute();
    expect(mockGetInfo).not.toHaveBeenCalled();
  } finally {
    mockState.updates.coinUpdateTracker = {};
  }

  await minute();
  expect(mockGetInfo).toHaveBeenCalledTimes(1);
});

test('a non-VRPC card has no screen timer', async () => {
  const electrum = {id: 'btc', api_channels: {[API_GET_BALANCES]: 'electrum', [API_GET_TRANSACTIONS]: 'electrum'}};
  overview = new Overview({
    dispatch: jest.fn(), activeCoin: {id: 'BTC'}, activeSubWallet: electrum,
    navigation: {isFocused: () => true, addListener: () => () => {}},
    transactions: confirmed, balanceKey: '1:0:1',
  });
  overview.setState = (state, callback) => {
    overview.state = {...overview.state, ...state};
    callback?.();
  };
  mockState.coins.activeCoin = {id: 'BTC'};
  try {
    overview.componentDidMount();
    for (let i = 0; i < 3; i++) await minute();
    expect(mockGetInfo).not.toHaveBeenCalled();
  } finally {
    mockState.coins.activeCoin = {id: 'VRSCTEST'};
  }
});
