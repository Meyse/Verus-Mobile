// PR 266 review PF1 (owner pick A, 2026-11-19): the Home notices are the first
// part of the asset list header, so they scroll away with the rows. The action
// bar stays outside the list. R2: the sort line follows the notices. F1
// (2026-11-20): Home has no value chart.
jest.mock('react-native-safe-area-context', () => require('react-native-safe-area-context/jest/mock').default);
jest.mock('react-native-gesture-handler', () => {
  const {FlatList, RefreshControl} = require('react-native');
  return {FlatList, RefreshControl};
});
jest.mock('../../../containers/Home/HomeWidgets/NotificationWidget', () => () =>
  require('react').createElement('NotificationWidget'));
jest.mock('../../../containers/Home/HomeWidgets/HomeNotice', () => ({
  __esModule: true,
  HOME_NOTICE_SYNC: 'sync',
  default: () => require('react').createElement('HomeNotice'),
}));
jest.mock('../../../components/SignedInActionBar', () => () => require('react').createElement('SignedInActionBar'));
jest.mock('../../../containers/Home/components/SignedInWalletSheets', () => ({
  DisplayCurrencySheet: () => null,
  HomeSortSheet: props => require('react').createElement('HomeSortSheet', props),
}));
jest.mock('../../../components/PrivacyBlurredText', () => ({children}) =>
  require('react').createElement('Text', null, children));
jest.mock('../../CoinData/Graphics', () => ({AssetCoinLogo: () => null}));
jest.mock('../../../components/WalletSetup/WalletSetupLogoSlot', () => ({children}) => children);

const React = require('react');
const {act, create} = require('react-test-renderer');
const {FlatList} = require('react-native');
const BigNumber = require('bignumber.js');
const SignedInWalletHome = require('../../../containers/Home/SignedInWalletHome').default;

const asset = (id, name) => ({
  coin: {id, currency_id: id, proto: 'vrsc', system_id: 'iSystem', testnet: true},
  presentation: {name, ticker: name, logoId: id},
  balance: BigNumber(1),
  balanceComplete: true,
  rate: 1,
  fiatValue: 1,
});

const noop = () => {};
const props = {
  assets: [asset('a', 'Alpha'), asset('b', 'Beta')],
  homeNotice: {kind: 'offline'},
  displayCurrency: 'USD',
  loading: false,
  showBalance: true,
  totalFiatBalance: 2,
  onToggleBalance: noop, onSelectDisplayCurrency: noop, onRefresh: noop, onOpenAsset: noop,
  onReceive: noop, onConvert: noop, onSend: noop, onManageAssets: noop,
  onReviewFoundAssets: noop, onDismissFoundAssets: noop, onDismissSyncNotice: noop,
  sort: 'custom', onSelectSort: jest.fn(),
};

const KINDS = ['HomeNotice', 'NotificationWidget'];
const kindOf = node => (typeof node.type === 'string' ? node.type : node.props.testID);
const marks = root => root.findAll(node => KINDS.includes(node.type) ||
  (node.props?.testID === 'home-sort-control' && node.props.onPress != null))
  .map(kindOf)
  // A touchable and its host view both carry the test ID.
  .filter((kind, index, all) => kind !== all[index - 1]);

test('notices scroll with the list, above the sort line', async () => {
  let view;
  await act(async () => {view = create(<SignedInWalletHome {...props} />);});
  const list = view.root.findByType(FlatList);
  // In the list header, in this order.
  expect(marks(list)).toEqual(['HomeNotice', 'NotificationWidget', 'home-sort-control']);
  // Nothing of the notice block stays in the fixed part above the list.
  expect(marks(view.root)).toEqual(marks(list));
  // The action bar stays outside the list.
  expect(view.root.findAllByType('SignedInActionBar')).toHaveLength(1);
  expect(list.findAllByType('SignedInActionBar')).toHaveLength(0);
  act(() => view.unmount());
});

test('the sort line opens "Sort assets" and passes the choice on', async () => {
  let view;
  await act(async () => {view = create(<SignedInWalletHome {...props} />);});
  const control = view.root.find(node => node.props?.testID === 'home-sort-control' && node.props.onPress != null);
  expect(control.props.accessibilityLabel).toBe('Sort assets, My order');
  await act(async () => control.props.onPress());
  const sheet = view.root.findByType('HomeSortSheet');
  expect(sheet.props.visible).toBe(true);
  sheet.props.onSelect('balance');
  expect(props.onSelectSort).toHaveBeenCalledWith('balance');
  act(() => view.unmount());
});
