// TX1 (PR 266 review 1118): a fiat entry must give an asset amount that the
// asset can hold. Expected values are worked by hand (long division, cut at
// the asset's decimals), never by the code under test.
let mockState;
// setOptions: the header's More options menu (useAdvancedFormMenu) sets it.
const mockNavigation = {navigate: jest.fn(), goBack: jest.fn(), setOptions: jest.fn()};

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
jest.mock('../../../containers/SendWizard/components/EstimateInfo', () => ({EstimatedAmountSheet: 'EstimatedAmountSheet'}));
jest.mock('../../../containers/SendWizard/components/SelectionSheets', () => ({TargetNetworkSheet: 'TargetNetworkSheet'}));
// The header's More options menu has its own suite (advancedFormMenu); its
// sheet needs a Paper Portal host that this render has not.
jest.mock('../../../containers/SendWizard/components/useAdvancedFormMenu', () => () => null);
// The F13 count runs the real hook, because its market sample is an estimate too.
let mockRealPriceImpact = false;
jest.mock('../../../containers/SendWizard/usePriceImpact', () => ({
  usePriceImpact: (...args) => (mockRealPriceImpact
    ? jest.requireActual('../../../containers/SendWizard/usePriceImpact').usePriceImpact(...args)
    : {level: 'none'}),
}));
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
describe('Send Amount step, estimate info only for a conversion (R4 B)', () => {
  const VRSCTEST = {id: 'VRSCTEST', proto: 'vrsc', decimals: 8, display_ticker: 'VRSCTEST', system_id: 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq'};
  let view;

  beforeEach(() => jest.clearAllMocks());
  afterEach(() => {
    if (view) act(() => view.unmount());
    view = null;
  });

  // A cross-chain Ethereum export shows the receive block with the entered
  // amount, but it is not an estimate: no "About this amount" handler.
  it('gives an Ethereum export without conversion no info handler', () => {
    const card = {
      id: 'MAIN',
      api_channels: {get_balances: 'bal', send: 'vrpc.RAddress.iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq'},
    };
    mockState = {
      settings: {generalWalletSettings: {displayCurrency: 'USD'}},
      ledger: {rates: {}, balances: {bal: {VRSCTEST: {confirmed: '10', pending: '0', total: '10'}}}},
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
            amountInput: '1',
            target: {id: 'VRSCTEST', isConversion: false, routes: []},
            route: {key: 'bridge:eth', addressType: 'ethereum', isCrossChain: true},
          }}>
          <SendWizardAmount />
        </SendWizardProvider>,
      );
    });
    const estimate = view.root.findByType('AmountEstimate');
    expect(estimate.props.estimatedOutput).not.toBeNull();
    expect(estimate.props.onOpenEstimateInfo).toBeUndefined();
  });
});

describe('Convert Amount step, 30 oldest converters (F13)', () => {
  let wizard;
  const Capture = () => {
    wizard = useSendWizard();
    return null;
  };
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
          <Capture />
          <SendWizardAmount />
        </SendWizardProvider>,
      );
    });
    return target;
  };
  const estimatedVias = () => estimateConversion.mock.calls.map(call => call[4]);

  beforeEach(() => {
    mockRealPriceImpact = true;
    jest.useFakeTimers();
    jest.clearAllMocks();
    estimateConversion.mockImplementation(() =>
      Promise.resolve({result: {estimatedcurrencyout: 1}}));
  });
  afterEach(() => {
    mockRealPriceImpact = false;
    if (view) act(() => view.unmount());
    view = null;
    jest.useRealTimers();
  });

  // The answers land, then the chosen route's market sample runs.
  const settle = async () => {
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await act(async () => {});
    await act(async () => {});
  };
  const sheet = () => view.root.findByType('PriceRouteSheet').props;

  it('estimates the 30 oldest of 33 converters', async () => {
    const target = renderConvert();
    expect(target.routes).toHaveLength(33);
    // The first route is b1, the youngest: it gets no market sample.
    expect(target.routes[0].via).toBe('b1');
    expect(estimateConversion).not.toHaveBeenCalled();
    await settle();
    // 30 route estimates, then 1 market sample on the chosen route (b32,
    // the oldest, first of the equal estimates). No call for b1, b2 or bX.
    expect(estimateConversion).toHaveBeenCalledTimes(31);
    const expected = Array.from({length: 30}, (_, index) => `b${index + 3}`);
    expect([...new Set(estimatedVias())].sort()).toEqual(expected.sort());
    expect(estimatedVias().filter(via => via === 'b32')).toHaveLength(2);
  });

  // R2 option A (owner 2026-11-22): unchecked routes are not listed, so a
  // route the user picks was checked first, here by a tap.
  it('keeps the estimate of a converter the user picks when the amount changes', async () => {
    const target = renderConvert();
    await settle();
    act(() => sheet().onCheckMore());
    await settle();
    // The tap checks the 3 routes left: b2, b1 (by age), then bX (no block).
    expect(Object.keys(sheet().estimates)).toHaveLength(33);
    const youngest = target.routes.find(route => route.via === 'b1');
    act(() => sheet().onSelect(youngest));
    await settle();
    estimateConversion.mockClear();
    act(() => wizard.setAmountDraft({amountInput: '2'}));
    await settle();
    // 30 route estimates with b1 in place of the youngest of the 30 (b3).
    // The market sample is per route, so b1 asks none again.
    expect(estimateConversion).toHaveBeenCalledTimes(30);
    expect(estimatedVias()).toContain('b1');
    expect(estimatedVias()).not.toContain('b3');
    expect(estimatedVias()).not.toContain('b2');
    expect(sheet().route.key).toBe(youngest.key);
  });
});

// R2 option A (owner 2026-11-22): "Price and route" lists the checked routes
// and ends in "Check 30 more routes". At most 30 estimates per amount pause;
// 30 more only after a tap, the next oldest first.
describe('Convert Amount step, Check 30 more routes (R2 A)', () => {
  const {estimateConversion} = require('../../api/channels/vrpc/requests/estimateConversion');
  const {buildTargetOptions, getRouteCheckState} = require('../../../containers/SendWizard/wizardUtils');
  const VRSCTEST = {id: 'VRSCTEST', proto: 'vrsc', decimals: 8, display_ticker: 'VRSCTEST', currency_id: 'iSource', system_id: 'iSystem'};
  // 100 baskets in a mixed list order. Basket i has age rank (37 i) mod 100
  // (a permutation, since 37 and 100 share no factor): rank 0 is the oldest.
  const rank = index => (index * 37) % 100;
  const baskets = Array.from({length: 100}, (_, index) => ({
    currencyid: `c${index}`,
    fullyqualifiedname: `Basket${index}`,
    startblock: 1000 + 10 * rank(index),
  }));
  const viasOfRanks = (from, to) => baskets
    .filter((_, index) => rank(index) >= from && rank(index) < to)
    .map(basket => basket.currencyid)
    .sort();
  const destination = {currencyid: 'iTarget', fullyqualifiedname: 'Target', startblock: 5};
  let view;
  let wizard;
  const Capture = () => {
    wizard = useSendWizard();
    return null;
  };
  const estimatedVias = () => estimateConversion.mock.calls.map(call => call[4]);
  const sheet = () => view.root.findByType('PriceRouteSheet').props;
  const settle = async () => {
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await act(async () => {});
    await act(async () => {});
  };

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
          <Capture />
          <SendWizardAmount />
        </SendWizardProvider>,
      );
    });
    return target;
  };

  beforeEach(() => {
    mockRealPriceImpact = true;
    jest.useFakeTimers();
    jest.clearAllMocks();
    // The oldest basket gives the most, so the best route stays the oldest.
    estimateConversion.mockImplementation((system, source, dest, amount, via) =>
      Promise.resolve({result: {estimatedcurrencyout: 2 - rank(Number(via.slice(1))) / 1000}}));
  });
  afterEach(() => {
    mockRealPriceImpact = false;
    if (view) act(() => view.unmount());
    view = null;
    jest.useRealTimers();
  });

  it('checks the 30 oldest of 100 routes first', async () => {
    const target = renderConvert();
    // The first route in the list is the oldest (rank 0), so its market
    // sample is the one extra call.
    expect(rank(0)).toBe(0);
    await settle();
    expect(estimateConversion).toHaveBeenCalledTimes(31);
    expect([...new Set(estimatedVias())].sort()).toEqual(viasOfRanks(0, 30));
    expect(Object.keys(sheet().estimates)).toHaveLength(30);
    expect(sheet().target.routes).toHaveLength(target.routes.length);
    expect(sheet().checkingMore).toBe(false);
  });

  it('checks the next 30 oldest after a tap, and only those', async () => {
    renderConvert();
    await settle();
    estimateConversion.mockClear();
    act(() => sheet().onCheckMore());
    expect(sheet().checkingMore).toBe(true);
    await settle();
    expect(estimateConversion).toHaveBeenCalledTimes(30);
    expect(estimatedVias().sort()).toEqual(viasOfRanks(30, 60));
    expect(Object.keys(sheet().estimates)).toHaveLength(60);
    expect(sheet().checkingMore).toBe(false);
  });

  it('goes back to the 30 oldest when the amount changes', async () => {
    renderConvert();
    await settle();
    act(() => sheet().onCheckMore());
    await settle();
    estimateConversion.mockClear();
    act(() => wizard.setAmountDraft({amountInput: '2'}));
    await settle();
    expect(estimateConversion).toHaveBeenCalledTimes(30);
    expect(estimatedVias().sort()).toEqual(viasOfRanks(0, 30));
    expect(Object.keys(sheet().estimates)).toHaveLength(30);
  });

  it('keeps a picked route among the 30 after an amount change', async () => {
    const target = renderConvert();
    await settle();
    act(() => sheet().onCheckMore());
    await settle();
    const picked = target.routes.find(route => rank(Number(route.via.slice(1))) === 45);
    act(() => sheet().onSelect(picked));
    await settle();
    estimateConversion.mockClear();
    act(() => wizard.setAmountDraft({amountInput: '2'}));
    await settle();
    // Ranks 0 to 28 and the pick, in place of the youngest of the 30 (rank 29).
    expect(estimateConversion).toHaveBeenCalledTimes(30);
    expect(estimatedVias().sort()).toEqual([...viasOfRanks(0, 29), picked.via].sort());
    expect(sheet().route.key).toBe(picked.key);
  });

  it('starts again at 30 on a return to an amount that had a tap', async () => {
    renderConvert();
    await settle();
    act(() => sheet().onCheckMore());
    await settle();
    act(() => wizard.setAmountDraft({amountInput: '2'}));
    await settle();
    estimateConversion.mockClear();
    act(() => wizard.setAmountDraft({amountInput: '1'}));
    await settle();
    expect(estimateConversion).toHaveBeenCalledTimes(30);
    expect(estimatedVias().sort()).toEqual(viasOfRanks(0, 30));
    expect(Object.keys(sheet().estimates)).toHaveLength(30);
  });

  it('asks no route twice when a route is picked while the next 30 are in flight', async () => {
    const target = renderConvert();
    await settle();
    estimateConversion.mockClear();
    act(() => sheet().onCheckMore());
    // The batch starts: its 30 requests are out, their answers not yet in.
    act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(estimateConversion).toHaveBeenCalledTimes(30);
    expect(sheet().checkingMore).toBe(true);
    const other = target.routes.find(route => rank(Number(route.via.slice(1))) === 5);
    act(() => sheet().onSelect(other));
    await settle();
    // No repeat: the 30 once each, plus the market sample of the picked route.
    expect(estimateConversion).toHaveBeenCalledTimes(31);
    expect(estimatedVias().filter(via => via !== other.via).sort()).toEqual(viasOfRanks(30, 60));
    expect(Object.keys(sheet().estimates)).toHaveLength(60);
    expect(sheet().checkingMore).toBe(false);
    expect(sheet().route.key).toBe(other.key);
  });

  it('asks no route twice when a route is picked before the next 30 start', async () => {
    const target = renderConvert();
    await settle();
    estimateConversion.mockClear();
    act(() => sheet().onCheckMore());
    const other = target.routes.find(route => rank(Number(route.via.slice(1))) === 5);
    act(() => sheet().onSelect(other));
    await settle();
    // 30 new routes once each, plus the market sample of the picked route.
    expect(estimateConversion).toHaveBeenCalledTimes(31);
    expect(estimatedVias().filter(via => via !== other.via).sort()).toEqual(viasOfRanks(30, 60));
    expect(Object.keys(sheet().estimates)).toHaveLength(60);
  });

  it('names no basket before the estimate, then the chosen one', async () => {
    const target = renderConvert();
    // Start on a route that is not the best, as Convert to may.
    const first = target.routes[1];
    act(() => wizard.setRoute(first));
    const estimate = () => view.root.findByType('AmountEstimate').props;
    expect(estimate().via).toBeNull();
    expect(typeof estimate().onOpenEstimateInfo).toBe('function');
    await settle();
    // The oldest route (rank 0) gives the most.
    expect(estimate().via).toBe('Basket0');
    act(() => wizard.setAmountDraft({amountInput: ''}));
    expect(estimate().via).toBeNull();
  });

  it('names the end row and the badge from the counts', () => {
    expect(getRouteCheckState(100, 30)).toEqual({remaining: 70, next: 30, bestLabel: 'Best so far'});
    expect(getRouteCheckState(100, 90)).toEqual({remaining: 10, next: 10, bestLabel: 'Best so far'});
    expect(getRouteCheckState(31, 30)).toEqual({remaining: 1, next: 1, bestLabel: 'Best so far'});
    expect(getRouteCheckState(100, 100)).toEqual({remaining: 0, next: 0, bestLabel: 'Best price'});
    expect(getRouteCheckState(5, 5)).toEqual({remaining: 0, next: 0, bestLabel: 'Best price'});
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

// Orchestrator decision 2026-11-22: with 2 or more routes, a failed estimate
// (all routes, or the route the user picked) keeps the Est. slippage row as
// "Details", so "Price and route" stays reachable. Its via line names a
// basket only when the user picked that route. One route: no row.
describe('Convert Amount step, failed estimate keeps Price and route', () => {
  const {estimateConversion} = require('../../api/channels/vrpc/requests/estimateConversion');
  const {buildTargetOptions} = require('../../../containers/SendWizard/wizardUtils');
  const VRSCTEST = {id: 'VRSCTEST', proto: 'vrsc', decimals: 8, display_ticker: 'VRSCTEST', currency_id: 'iSource', system_id: 'iSystem'};
  const destination = {currencyid: 'iTarget', fullyqualifiedname: 'Target', startblock: 5};
  const basket = n => ({currencyid: `b${n}`, fullyqualifiedname: `Basket${n}`, startblock: 10 * n});
  let view;
  // Vias whose estimate fails; null stands for the direct route.
  let failing;

  const renderConvert = vias => {
    const paths = {iTarget: vias.map(via => (via ? {destination, via, price: 1} : {destination, price: 1}))};
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
  const settle = async () => {
    await act(async () => {
      jest.advanceTimersByTime(300);
    });
    await act(async () => {});
  };
  const estimate = () => view.root.findByType('AmountEstimate').props;
  const sheet = () => view.root.findByType('PriceRouteSheet').props;
  const errorText = () => view.root.findByType('ErrorMessage').props.children;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    failing = [];
    estimateConversion.mockImplementation((system, source, dest, amount, via) =>
      Promise.resolve(failing.includes(via ?? null)
        ? {error: {message: 'no liquidity'}}
        : {result: {estimatedcurrencyout: via === 'b1' ? 2 : 1}}));
  });
  afterEach(() => {
    if (view) act(() => view.unmount());
    view = null;
    jest.useRealTimers();
  });

  it('keeps the row as Details, without a via line, when every route fails', async () => {
    failing = ['b1', 'b2'];
    const target = renderConvert([basket(1), basket(2)]);
    // The current route is a basket route, so a via line would be a guess.
    expect(target.routes[0].via).toBe('b1');
    await settle();
    expect(estimate().estimatedOutput == null).toBe(true);
    expect(estimate().showDetails).toBe(true);
    expect(estimate().estimateFailed).toBe(true);
    expect(estimate().via).toBeNull();
    // Today's failure text stays.
    expect(errorText()).toBe('Estimate unavailable.');
    expect(sheet().visible).toBe(false);
    act(() => estimate().onOpenDetails());
    expect(sheet().visible).toBe(true);
    expect(Object.values(sheet().estimates)).toEqual([null, null]);
  });

  it('names the basket the user picked when its estimate fails', async () => {
    failing = ['b2'];
    const target = renderConvert([basket(1), basket(2)]);
    await settle();
    // b1 works: the normal row, with its basket.
    expect(estimate().estimateFailed).toBe(false);
    expect(estimate().via).toBe('Basket1');
    const picked = target.routes.find(route => route.via === 'b2');
    act(() => sheet().onSelect(picked));
    await settle();
    expect(sheet().route.key).toBe(picked.key);
    expect(estimate().estimatedOutput == null).toBe(true);
    expect(estimate().showDetails).toBe(true);
    expect(estimate().estimateFailed).toBe(true);
    expect(estimate().via).toBe('Basket2');
    expect(errorText()).toBe('Estimate unavailable.');
    act(() => estimate().onOpenDetails());
    expect(sheet().visible).toBe(true);
  });

  it('keeps the user\'s basket when every route fails at the next amount', async () => {
    const target = renderConvert([basket(1), basket(2)]);
    await settle();
    const picked = target.routes.find(route => route.via === 'b2');
    act(() => sheet().onSelect(picked));
    await settle();
    failing = ['b1', 'b2'];
    act(() => view.root.findByType('AmountInput').props.onChangeText('2'));
    await settle();
    expect(estimate().estimateFailed).toBe(true);
    expect(estimate().via).toBe('Basket2');
  });

  it('shows no via line when the picked failed route is direct', async () => {
    failing = [null];
    const target = renderConvert([basket(1), null]);
    await settle();
    const direct = target.routes.find(route => !route.via);
    expect(direct).toBeDefined();
    act(() => sheet().onSelect(direct));
    await settle();
    expect(estimate().estimateFailed).toBe(true);
    expect(estimate().showDetails).toBe(true);
    expect(estimate().via).toBeNull();
  });

  it('reaches the next 30 routes when the first 30 all fail', async () => {
    // b1 to b30 are the 30 oldest (start blocks 10 to 300), checked first.
    failing = Array.from({length: 30}, (_, index) => `b${index + 1}`);
    const vias = Array.from({length: 60}, (_, index) => basket(index + 1));
    renderConvert(vias);
    await settle();
    expect(estimateConversion).toHaveBeenCalledTimes(30);
    expect(estimate().estimateFailed).toBe(true);
    expect(estimate().via).toBeNull();
    act(() => estimate().onOpenDetails());
    expect(sheet().visible).toBe(true);
    expect(Object.keys(sheet().estimates)).toHaveLength(30);
    act(() => sheet().onCheckMore());
    await settle();
    expect(Object.keys(sheet().estimates)).toHaveLength(60);
    // b31 to b60 answer 1 each; the first of them is chosen.
    expect(estimate().estimateFailed).toBe(false);
    expect(estimate().estimatedOutput).toBe(1);
    expect(estimate().via).toBe('Basket31');
    expect(errorText()).toBeNull();
  });

  it('leaves Continue as it was: a settled failed estimate does not change it', async () => {
    failing = ['b1', 'b2'];
    renderConvert([basket(1), basket(2)]);
    await settle();
    expect(estimate().estimateFailed).toBe(true);
    // Unchanged from before the rule: Continue waits only while estimates
    // load, not on a failed one.
    expect(view.root.findByType('WizardFooter').props.disabled).toBe(false);
  });

  it('keeps no row when the only route fails', async () => {
    failing = ['b1'];
    const target = renderConvert([basket(1)]);
    expect(target.routes).toHaveLength(1);
    await settle();
    expect(estimate().estimatedOutput == null).toBe(true);
    expect(estimate().estimateFailed).toBe(false);
    expect(estimate().via).toBeNull();
    expect(errorText()).toBe('Estimate unavailable.');
  });
});
