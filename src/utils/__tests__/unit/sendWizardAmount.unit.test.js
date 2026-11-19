// TX1 (PR 266 review 1118): a fiat entry must give an asset amount that the
// asset can hold. Expected values are worked by hand (long division, cut at
// the asset's decimals), never by the code under test.
let mockState;
const mockNavigation = {navigate: jest.fn(), goBack: jest.fn()};

jest.mock('react-redux', () => require('../../../tests/helpers/mockReactRedux')({
  useSelector: (selector, equalityFn) => selector(mockState),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: () => {},
  useIsFocused: () => true,
  useNavigation: () => mockNavigation,
}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('../../../components/AmountInput', () => 'AmountInput');
jest.mock('../../../components/AmountKeypad', () => 'AmountKeypad');
jest.mock('../../../components/TextAction', () => 'TextAction');
jest.mock('../../../theme/onboarding', () => ({useOnboardingTheme: () => ({colors: {}, typography: {}})}));
jest.mock('../../../hooks/useOnboardingSmallDeviceLayout', () => ({
  useOnboardingSmallDeviceLayout: () => ({smallDevice: false}),
}));
jest.mock('../../../containers/SendWizard/components/WizardUI', () => ({
  WIZARD_CONTENT_TOP_INSET: 24,
  WizardScreen: ({children}) => children,
  WizardFooter: 'WizardFooter',
  ErrorMessage: 'ErrorMessage',
}));
jest.mock('../../../containers/SendWizard/components/AmountEstimate', () => 'AmountEstimate');
jest.mock('../../../containers/SendWizard/components/PriceRouteSheet', () => 'PriceRouteSheet');
jest.mock('../../../containers/SendWizard/components/SelectionSheets', () => ({TargetNetworkSheet: 'TargetNetworkSheet'}));
jest.mock('../../../containers/SendWizard/usePriceImpact', () => ({usePriceImpact: () => ({level: 'none'})}));
jest.mock('../../../containers/SendWizard/useReceivedPrice', () => ({useReceivedPrice: () => null}));
// Network boundaries. Amount loads the other networks of an ETH card.
jest.mock('../../api/channels/vrpc/requests/estimateConversion', () => ({estimateConversion: jest.fn()}));
jest.mock('../../api/channels/vrpc/requests/estimateEthereumExportFee', () => ({estimateEthereumExportFee: jest.fn()}));
jest.mock('../../api/routers/getConversionPaths', () => ({getConversionPaths: jest.fn(() => Promise.resolve({}))}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const {parseUnits} = jest.requireActual('ethers');
const {getWizardCryptoAmount} = require('../../../containers/SendWizard/wizardAmount');
const SendWizardAmount = require('../../../containers/SendWizard/SendWizardAmount').default;
const {SendWizardProvider, useSendWizard} = require('../../../containers/SendWizard/SendWizardContext');

const ETH = {id: 'ETH', proto: 'eth', decimals: 18, display_ticker: 'ETH'};
const USDC = {id: 'USDC', proto: 'erc20', decimals: 6, display_ticker: 'USDC'};
const WBTC = {id: 'WBTC', proto: 'erc20', decimals: 8, display_ticker: 'WBTC'};
const VRSC = {id: 'VRSC', proto: 'vrsc', decimals: 8, display_ticker: 'VRSC'};

describe('getWizardCryptoAmount', () => {
  const fiat = (coin, input, rate, extra = {}) =>
    getWizardCryptoAmount({input, fiatMode: true, rate, coin, ...extra}).toFixed();

  it('cuts an 18-decimal ETH amount from fiat to 18 places', () => {
    // 1 / 3000 = 0.000333333…; 18 places = 0.000 + fifteen 3s.
    const amount = fiat(ETH, '1', '3000');
    expect(amount).toBe('0.000333333333333333');
    expect(parseUnits(amount, 18)).toBe(BigInt('333333333333333'));
  });

  it('cuts a 6-decimal token amount from fiat to 6 places', () => {
    // 10 / 0.9998 = 10.0020004…; 6 places = 10.002000.
    expect(fiat(USDC, '10', '0.9998')).toBe('10.002');
    // 1 / 3 = 0.333333…; 6 places = 0.333333.
    const amount = fiat(USDC, '1', '3');
    expect(amount).toBe('0.333333');
    expect(parseUnits(amount, 6)).toBe(BigInt('333333'));
  });

  it('cuts an 8-decimal token amount from fiat to 8 places', () => {
    // 100 / 30000 = 0.0033333…; 8 places = 0.00333333.
    const amount = fiat(WBTC, '100', '30000');
    expect(amount).toBe('0.00333333');
    expect(parseUnits(amount, 8)).toBe(BigInt('333333'));
  });

  it('rounds down, never up', () => {
    // 2 / 3 = 0.666…: the last kept digit stays 6.
    expect(fiat(USDC, '2', '3')).toBe('0.666666');
    // 0.999999999999999999995 / 1: a half-up step at 20 places would carry
    // to 1.00. The true value cut at 18 places is eighteen 9s.
    expect(fiat(ETH, '0.999999999999999999995', '1')).toBe('0.999999999999999999');
  });

  it('gives 0 when the fiat value is below one base unit', () => {
    // 0.01 / 100000 = 0.0000001, below 0.000001 (one unit of a 6-decimal token).
    expect(fiat(USDC, '0.01', '100000')).toBe('0');
  });

  it('keeps 8 places for a Verus asset and for an ETH bridge route', () => {
    expect(fiat(VRSC, '1', '3')).toBe('0.33333333');
    expect(fiat(ETH, '1', '3000', {isCrossChain: true})).toBe('0.00033333');
  });

  it('does not change an asset entry within its decimals', () => {
    expect(
      getWizardCryptoAmount({input: '0.123456789012345678', fiatMode: false, coin: ETH}).toFixed(),
    ).toBe('0.123456789012345678');
  });

  it('has no amount without a positive price', () => {
    expect(getWizardCryptoAmount({input: '1', fiatMode: true, rate: null, coin: ETH}).isNaN()).toBe(true);
    expect(getWizardCryptoAmount({input: '1', fiatMode: true, rate: '0', coin: ETH}).isNaN()).toBe(true);
  });
});

describe('Send Amount step in fiat mode', () => {
  let view;
  let wizard;
  const Capture = () => {
    wizard = useSendWizard();
    return null;
  };

  const renderAmount = ({coin, input, rate, balance}) => {
    const card = {
      id: 'MAIN',
      api_channels: {get_fiatprice: 'fiat', get_balances: 'bal', send: 'eth.0xabc'},
    };
    mockState = {
      settings: {generalWalletSettings: {displayCurrency: 'USD'}},
      ledger: {
        rates: {fiat: {[coin.id]: {USD: rate}}},
        balances: {bal: {[coin.id]: {confirmed: balance, pending: '0', total: balance}}},
      },
    };
    act(() => {
      view = create(
        <SendWizardProvider
          mode="send"
          initialState={{
            sourceCoin: coin,
            sourceSubWallet: card,
            channel: card.api_channels.send,
            target: {id: coin.id, isConversion: false},
            route: {key: 'direct', addressType: 'ethereum'},
            amountInput: input,
            fiatMode: true,
          }}>
          <SendWizardAmount />
          <Capture />
        </SendWizardProvider>,
      );
    });
  };
  const footer = () => view.root.findByType('WizardFooter').props;

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => {
    if (view) act(() => view.unmount());
    view = null;
  });

  it('stores an ETH amount that parseUnits accepts', () => {
    renderAmount({coin: ETH, input: '1', rate: 3000, balance: '1'});
    expect(footer().disabled).toBe(false);
    act(() => footer().onPress());
    expect(wizard.state.amount).toBe('0.000333333333333333');
    expect(parseUnits(wizard.state.amount, 18)).toBe(BigInt('333333333333333'));
    expect(mockNavigation.navigate).toHaveBeenCalledWith('SendWizardRecipient');
  });

  it('keeps Continue off when the amount rounds down to 0', () => {
    renderAmount({coin: USDC, input: '0.01', rate: 100000, balance: '5'});
    expect(footer().disabled).toBe(true);
    act(() => footer().onPress());
    expect(wizard.state.amount).toBe('');
    expect(mockNavigation.navigate).not.toHaveBeenCalled();
  });
});

// R14 (PR 266 review 1117): fiat entry. Expected values come from the
// approved option A: an empty field stays empty with no error, a zero draft
// shows no error, and fiat entry keeps at most 2 decimals.
describe('Send Amount step, fiat entry (R14)', () => {
  let view;
  let wizard;
  const Capture = () => {
    wizard = useSendWizard();
    return null;
  };
  const VRSCTEST = {id: 'VRSCTEST', proto: 'vrsc', decimals: 8, display_ticker: 'VRSCTEST'};

  const renderAmount = ({input, fiatMode}) => {
    const card = {
      id: 'MAIN',
      api_channels: {get_fiatprice: 'fiat', get_balances: 'bal', send: 'dlight_private.x.y'},
    };
    mockState = {
      settings: {generalWalletSettings: {displayCurrency: 'USD'}},
      ledger: {rates: {fiat: {VRSCTEST: {USD: 0.5}}}, balances: {}},
    };
    act(() => {
      view = create(
        <SendWizardProvider
          mode="send"
          initialState={{
            sourceCoin: VRSCTEST,
            sourceSubWallet: card,
            sourceBalance: '100',
            channel: card.api_channels.send,
            target: {id: 'VRSCTEST', isConversion: false},
            route: {key: 'direct', addressType: 'verus'},
            amountInput: input,
            fiatMode,
          }}>
          <SendWizardAmount />
          <Capture />
        </SendWizardProvider>,
      );
    });
  };
  const error = () => view.root.findByType('ErrorMessage').props.children;
  const toggle = () => view.root.find(
    node => typeof node.props.accessibilityLabel === 'string' &&
      node.props.accessibilityLabel.startsWith('Switch amount') && node.props.onPress,
  );

  afterEach(() => {
    if (view) act(() => view.unmount());
    view = null;
  });

  it('keeps an empty field empty, with no error, when it switches to fiat', () => {
    renderAmount({input: '', fiatMode: false});
    act(() => toggle().props.onPress());
    expect(wizard.state.fiatMode).toBe(true);
    expect(wizard.state.amountInput).toBe('');
    expect(error()).toBeFalsy();
    expect(view.root.findByType('WizardFooter').props.disabled).toBe(true);
  });

  it('shows no error for a zero draft', () => {
    renderAmount({input: '0.0', fiatMode: true});
    expect(error()).toBeFalsy();
    expect(view.root.findByType('WizardFooter').props.disabled).toBe(true);
  });

  it('gives fiat entry the 2-decimal limit', () => {
    renderAmount({input: '', fiatMode: true});
    expect(view.root.findByType('AmountInput').props.maxDecimals).toBe(2);
  });
});

describe('editAmountInput decimal limit (R14)', () => {
  const {editAmountInput} = require('../../amountInput');
  const type = (value, key, maxDecimals) =>
    editAmountInput(value, {start: value.length, end: value.length}, key, '.', Infinity, maxDecimals).value;

  it('fills a money value from the left and stops at 2 decimals', () => {
    expect(type('', '5', 2)).toBe('5');
    expect(type('5', '0', 2)).toBe('50');
    expect(type('12.', '5', 2)).toBe('12.5');
    expect(type('12.5', '3', 2)).toBe('12.53');
    expect(type('12.53', '4', 2)).toBe('12.53');
  });

  it('keeps asset entry without a limit when none is given', () => {
    expect(type('0.12345678', '9')).toBe('0.123456789');
  });
});
