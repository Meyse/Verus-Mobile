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
// Network boundaries. Amount loads other networks only on Change network.
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

// F5 (PR 266 feedback 2026-11-20): a Send from a card on the coin screen asks
// for no route discovery until the user presses Change network.
describe('Send Amount step, network change on request (F5)', () => {
  const {getConversionPaths} = require('../../api/routers/getConversionPaths');
  const VRSCTEST = {id: 'VRSCTEST', proto: 'vrsc', decimals: 8, display_ticker: 'VRSCTEST', system_id: 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq'};
  let view;

  const renderAmount = () => {
    const card = {
      id: 'MAIN',
      api_channels: {get_balances: 'bal', send: 'vrpc.RAddress.iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq'},
    };
    mockState = {
      settings: {generalWalletSettings: {displayCurrency: 'USD'}},
      ledger: {rates: {}, balances: {}},
    };
    act(() => {
      view = create(
        <SendWizardProvider
          mode="send"
          initialState={{
            sourceCoin: VRSCTEST,
            sourceSubWallet: card,
            sourceBalance: '10',
            channel: card.api_channels.send,
            target: {id: 'VRSCTEST', isConversion: false, routes: []},
            route: {key: 'local:direct:live:send', addressType: 'verus', isCrossChain: false},
          }}>
          <SendWizardAmount />
        </SendWizardProvider>,
      );
    });
  };
  const networkAction = () => view.root.find(
    node => node.type === 'TextAction' && node.props.accessibilityRole === 'button' &&
      typeof node.props.children === 'string' && /network/i.test(node.props.children),
  );

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => {
    if (view) act(() => view.unmount());
    view = null;
  });

  it('asks for no route discovery before the press', () => {
    renderAmount();
    expect(getConversionPaths).not.toHaveBeenCalled();
    expect(networkAction().props.children).toBe('Change network');
    expect(networkAction().props.disabled).toBe(false);
  });

  it('loads once on the press, with a loading state', async () => {
    let resolvePaths;
    getConversionPaths.mockImplementationOnce(() => new Promise(resolve => {
      resolvePaths = resolve;
    }));
    renderAmount();
    act(() => {
      networkAction().props.onPress();
    });
    expect(getConversionPaths).toHaveBeenCalledTimes(1);
    expect(networkAction().props.children).toBe('Checking networks…');
    expect(networkAction().props.disabled).toBe(true);
    await act(async () => resolvePaths({}));
    // No route to another network: the control says so and stays off.
    expect(networkAction().props.children).toBe('No other networks');
    expect(networkAction().props.disabled).toBe(true);
    expect(getConversionPaths).toHaveBeenCalledTimes(1);
  });

  it('shows an error and loads again on the next press', async () => {
    getConversionPaths.mockImplementationOnce(() => Promise.reject(new Error('offline')));
    renderAmount();
    await act(async () => {
      await networkAction().props.onPress();
    });
    expect(networkAction().props.children).toBe('Networks unavailable. Try again');
    expect(networkAction().props.disabled).toBe(false);
    await act(async () => {
      await networkAction().props.onPress();
    });
    expect(getConversionPaths).toHaveBeenCalledTimes(2);
  });
});

// F13 (PR 266 feedback 2026-11-20): with more than 30 converters, Amount asks
// estimateconversion for the 30 oldest only. "Oldest" is the lowest launch
// block (currencydefinition.startblock); the unknown one goes last.
describe('Convert Amount step, 30 oldest converters (F13)', () => {
  const {estimateConversion} = require('../../api/channels/vrpc/requests/estimateConversion');
  const {buildTargetOptions} = require('../../../containers/SendWizard/wizardUtils');
  const VRSCTEST = {id: 'VRSCTEST', proto: 'vrsc', decimals: 8, display_ticker: 'VRSCTEST', currency_id: 'iSource', system_id: 'iSystem'};
  // 33 baskets: b1 to b32 launched at block 1000 + 10 * (33 - n), so b32 is the
  // oldest (block 1010) and b1 the youngest (block 1320). bX has no launch block.
  const baskets = [
    ...Array.from({length: 32}, (_, index) => ({
      currencyid: `b${index + 1}`,
      fullyqualifiedname: `Basket${index + 1}`,
      startblock: 1000 + 10 * (32 - index),
    })),
    {currencyid: 'bX', fullyqualifiedname: 'BasketX'},
  ];
  const destination = {currencyid: 'iTarget', fullyqualifiedname: 'Target', startblock: 5};
  let view;

  const renderConvert = () => {
    const paths = {iTarget: baskets.map(via => ({destination, via, price: 1}))};
    const target = buildTargetOptions(paths, VRSCTEST, false, 'iSystem')
      .find(option => option.isConversion);
    const card = {id: 'MAIN', api_channels: {get_balances: 'bal', send: 'vrpc.RAddress.iSystem'}};
    mockState = {
      settings: {generalWalletSettings: {displayCurrency: 'USD'}},
      ledger: {rates: {}, balances: {bal: {VRSCTEST: {confirmed: '100', pending: '0', total: '100'}}}},
    };
    act(() => {
      view = create(
        <SendWizardProvider
          mode="convert"
          initialState={{
            sourceCoin: VRSCTEST,
            sourceSubWallet: card,
            sourceBalance: '100',
            channel: card.api_channels.send,
            target,
            route: target.routes[0],
            amountInput: '1',
          }}>
          <SendWizardAmount />
        </SendWizardProvider>,
      );
    });
    return target;
  };
  const estimatedVias = () => estimateConversion.mock.calls.map(call => call[4]);

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    estimateConversion.mockImplementation(() =>
      Promise.resolve({result: {estimatedcurrencyout: 1}}));
  });
  afterEach(() => {
    if (view) act(() => view.unmount());
    view = null;
    jest.useRealTimers();
  });

  it('estimates the 30 oldest of 33 converters', async () => {
    const target = renderConvert();
    expect(target.routes).toHaveLength(33);
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(estimateConversion).toHaveBeenCalledTimes(30);
    // b3 to b32 are the 30 oldest; b1, b2 (youngest) and bX (unknown) wait.
    expect(estimatedVias().sort()).toEqual(
      Array.from({length: 30}, (_, index) => `b${index + 3}`).sort(),
    );
  });

  it('keeps the estimate of a converter the user picks', async () => {
    const target = renderConvert();
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    estimateConversion.mockClear();
    const youngest = target.routes.find(route => route.via === 'b1');
    act(() => {
      view.root.findByType('PriceRouteSheet').props.onSelect(youngest);
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(estimateConversion).toHaveBeenCalledTimes(30);
    expect(estimatedVias()).toContain('b1');
    // The picked one takes the place of the youngest of the 30 (b3).
    expect(estimatedVias()).not.toContain('b3');
  });
});

// F6 (PR 266 feedback 2026-11-20): slippage is an estimate, never "None".
describe('estimated slippage label (F6)', () => {
  const BigNumberLib = require('bignumber.js');
  const {getImpactBadgeLabel} = require('../../../containers/SendWizard/components/impactFormat');

  it('shows the smallest tier, not "None", for zero', () => {
    expect(getImpactBadgeLabel(BigNumberLib(0))).toBe('<0.1%');
    expect(getImpactBadgeLabel(BigNumberLib(0.04))).toBe('<0.1%');
  });

  it('shows the percent from 0.1%', () => {
    expect(getImpactBadgeLabel(BigNumberLib(0.1))).toBe('0.1%');
    expect(getImpactBadgeLabel(BigNumberLib(2.36))).toBe('2.4%');
  });
});

// Audit row 14 (2026-11-20): a route pick with the same amount, target and
// routes asks for no new estimates.
describe('Convert Amount step, no repeated estimates (audit row 14)', () => {
  const {estimateConversion} = require('../../api/channels/vrpc/requests/estimateConversion');
  const {buildTargetOptions} = require('../../../containers/SendWizard/wizardUtils');
  const VRSCTEST = {id: 'VRSCTEST', proto: 'vrsc', decimals: 8, display_ticker: 'VRSCTEST', currency_id: 'iSource', system_id: 'iSystem'};
  const destination = {currencyid: 'iTarget', fullyqualifiedname: 'Target'};
  let view;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    estimateConversion.mockImplementation((system, source, dest, amount, via) =>
      Promise.resolve({result: {estimatedcurrencyout: via === 'b1' ? 2 : 1}}));
  });
  afterEach(() => {
    if (view) act(() => view.unmount());
    view = null;
    jest.useRealTimers();
  });

  it('keeps the estimates when the user picks another route', async () => {
    const paths = {iTarget: ['b1', 'b2', 'b3'].map(id => ({
      destination, via: {currencyid: id, fullyqualifiedname: id, startblock: 10}, price: 1,
    }))};
    const target = buildTargetOptions(paths, VRSCTEST, false, 'iSystem')
      .find(option => option.isConversion);
    const card = {id: 'MAIN', api_channels: {get_balances: 'bal', send: 'vrpc.RAddress.iSystem'}};
    mockState = {
      settings: {generalWalletSettings: {displayCurrency: 'USD'}},
      ledger: {rates: {}, balances: {bal: {VRSCTEST: {confirmed: '100', pending: '0', total: '100'}}}},
    };
    act(() => {
      view = create(
        <SendWizardProvider
          mode="convert"
          initialState={{
            sourceCoin: VRSCTEST,
            sourceSubWallet: card,
            channel: card.api_channels.send,
            target,
            route: target.routes[0],
            amountInput: '1',
          }}>
          <SendWizardAmount />
        </SendWizardProvider>,
      );
    });
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(estimateConversion).toHaveBeenCalledTimes(3);
    const sheet = () => view.root.findByType('PriceRouteSheet').props;
    const other = target.routes.find(route => route.via === 'b3');
    act(() => sheet().onSelect(other));
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    expect(estimateConversion).toHaveBeenCalledTimes(3);
    expect(sheet().route.key).toBe(other.key);
    expect(sheet().estimatedOutput).toBe(1);
  });
});
