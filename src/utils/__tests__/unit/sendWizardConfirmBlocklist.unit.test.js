// TX3 (PR 266 review 1118): every Send route reaches Confirm, and Confirm
// enforces the address blocklist before any preparation. Each test builds the
// wizard state the way its route does (the real SendWizardProvider and its
// setters), then mounts the real SendWizardConfirm. Network calls are mocked.
let mockState;
let mockCanGoBack;
let mockNetworkFee;
const mockNavigation = {
  addListener: () => () => {},
  canGoBack: () => mockCanGoBack,
  getParent: () => null,
  goBack: jest.fn(),
  navigate: jest.fn(),
  replace: jest.fn(),
  setOptions: jest.fn(),
};

jest.mock('react-redux', () => require('../../../tests/helpers/mockReactRedux')({
  useSelector: selector => selector(mockState),
  useDispatch: () => jest.fn(),
}));
jest.mock('@react-navigation/native', () => ({
  useIsFocused: () => true,
  useNavigation: () => mockNavigation,
}));
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true,
  default: {addEventListener: () => () => {}, fetch: jest.fn()},
}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MaterialCommunityIcons');
jest.mock('../../../theme/onboarding', () => ({useOnboardingTheme: () => ({colors: {}, typography: {}})}));
jest.mock('../../../hooks/useOnboardingSmallDeviceLayout', () => ({
  useOnboardingSmallDeviceLayout: () => ({smallDevice: false}),
}));
jest.mock('../../../containers/DeepLink/useRequestNavigation', () => ({useRequestBackHandler: () => {}}));
jest.mock('../../../containers/Coin/Overview/TransactionDetailsSheet', () => ({formatTransactionDate: () => ''}));
jest.mock('../../../components/FadedScrollView', () => 'FadedScrollView');
jest.mock('../../../containers/SendWizard/components/WizardUI', () => ({
  WIZARD_CONTENT_TOP_INSET: 24,
  WizardScreen: ({children}) => children,
  WizardFooter: 'WizardFooter',
  ErrorMessage: 'ErrorMessage',
}));
jest.mock('../../../containers/SendWizard/components/FeeBreakdownSheet', () => ({
  __esModule: true, default: 'FeeBreakdownSheet', BridgeNetworkFeeSheet: 'BridgeNetworkFeeSheet',
}));
jest.mock('../../../containers/SendWizard/components/NetworkFeeSheet', () => 'NetworkFeeSheet');
jest.mock('../../../containers/SendWizard/components/PriceRouteSheet', () => 'PriceRouteSheet');
jest.mock('../../../containers/SendWizard/components/TransferSummary', () => ({
  TransferConnector: 'TransferConnector', TransferNode: 'TransferNode',
}));
jest.mock('../../../containers/SendWizard/components/ConfirmFacts', () => ({
  __esModule: true, default: 'ConfirmFacts', ConfirmNotice: 'ConfirmNotice', ConfirmTotal: 'ConfirmTotal',
}));
jest.mock('../../../containers/SendWizard/components/ConfirmPreparing', () => 'ConfirmPreparing');
jest.mock('../../../containers/SendWizard/useNetworkFee', () => ({
  __esModule: true, default: () => mockNetworkFee,
}));
jest.mock('../../../containers/SendWizard/useWizardFiat', () => ({
  useWizardFiat: () => ({displayCurrency: 'USD', format: () => null, getRate: () => null}),
}));
jest.mock('../../../containers/SendWizard/useReceivedPrice', () => ({useReceivedPrice: () => null}));
jest.mock('../../preconversion/usePrelaunch', () => ({useChainHeight: () => null}));
jest.mock('../../../containers/SendWizard/refreshSourceBalance', () => ({refreshSourceBalance: jest.fn()}));
jest.mock('../../../containers/SendWizard/autoAddConversionAsset', () => ({autoAddConversionAsset: jest.fn()}));
jest.mock('../../assets/assetManagementService', () => ({captureAssetContext: jest.fn()}));
jest.mock('../../../actions/actionCreators', () => ({expireCoinData: jest.fn()}));
// Network boundaries.
jest.mock('../../api/routers/preflightSend', () => ({preflightSend: jest.fn()}));
jest.mock('../../api/routers/preflightConvertOrCrossChain', () => ({preflightConvertOrCrossChain: jest.fn()}));
jest.mock('../../api/routers/sendConvertOrCrossChain', () => ({sendConvertOrCrossChain: jest.fn()}));
jest.mock('../../api/routers/send', () => ({send: jest.fn()}));
jest.mock('../../api/routers/getIdentity', () => ({getIdentity: jest.fn()}));
jest.mock('../../api/channels/verusid/requests/getIdentity', () => ({getIdentity: jest.fn()}));

const React = require('react');
const {Text} = require('react-native');
const {act, create} = require('react-test-renderer');
const {preflightSend} = require('../../api/routers/preflightSend');
const {preflightConvertOrCrossChain} = require('../../api/routers/preflightConvertOrCrossChain');
const {getIdentity: getIdentityForCard} = require('../../api/routers/getIdentity');
const {getIdentity: getIdentityForPrivate} = require('../../api/channels/verusid/requests/getIdentity');
const SendWizardConfirm = require('../../../containers/SendWizard/SendWizardConfirm').default;
const {
  getScanRequestFields,
  SendWizardProvider,
  useSendWizard,
} = require('../../../containers/SendWizard/SendWizardContext');
const {InvoiceFlowContext} = require('../../../containers/SendWizard/invoiceFlow');

// Blocklist entries, as the sign-in fetch stores them.
const BLOCKED_R = 'RBLOCKEDxxxxxxxxxxxxxxxxxxxxxxxxxx';
const BLOCKED_I = 'iBLOCKEDxxxxxxxxxxxxxxxxxxxxxxxxxx';
const BLOCKED_ETH = '0x00000000000000000000000000000000000000bb';
const ALLOWED_R = 'RALLOWEDxxxxxxxxxxxxxxxxxxxxxxxxxx';
const BLOCKED_TEXT = 'Sending to this address is blocked.';

const VRSC = {id: 'VRSCTEST', currency_id: 'iVRSCTEST', system_id: 'iVRSCTEST', proto: 'vrsc', decimals: 8, display_ticker: 'VRSCTEST'};
const ETH = {id: 'GETH', currency_id: '0x0', system_id: '.eth', proto: 'eth', decimals: 18, display_ticker: 'gETH', network: 'sepolia'};
const card = (id, channel) => ({id, name: id, api_channels: {get_balances: channel, send: channel}});
const vrpcCard = card('MAIN', 'vrpc.RmyAddress.iVRSCTEST');
const privateCard = card('PRIVATE', 'dlight_private.zs1me.iVRSCTEST');
const ethCard = card('ETH_MAIN', 'eth.0xme');
const sourceOf = (coin, subWallet) => ({
  sourceCoin: coin,
  sourceSubWallet: subWallet,
  sourceBalance: '5',
  channel: subWallet.api_channels.send,
});
const direct = coin => ({
  target: {id: coin.id, isConversion: false},
  route: {key: 'direct', isCrossChain: false, addressType: 'verus'},
});

// Runs a route's state changes after mount, then shows Confirm, as the
// navigator does after the earlier step.
const Route = ({steps = () => {}}) => {
  const wizard = useSendWizard();
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    steps(wizard);
    setReady(true);
    // Run once, like the earlier step's single press.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return ready ? <SendWizardConfirm /> : null;
};

let view;
const render = async ({initialState, steps, invoiceFlow = null}) => {
  const tree = (
    <SendWizardProvider mode="send" initialState={initialState}>
      <Route steps={steps} />
    </SendWizardProvider>
  );
  await act(async () => {
    view = create(
      invoiceFlow
        ? <InvoiceFlowContext.Provider value={invoiceFlow}>{tree}</InvoiceFlowContext.Provider>
        : tree,
    );
  });
};
const texts = () => view.root.findAllByType(Text).map(node => [].concat(node.props.children).join(''));
const shownBlocked = () => texts().includes(BLOCKED_TEXT);
const noPreparation = () => {
  expect(preflightSend).not.toHaveBeenCalled();
  expect(preflightConvertOrCrossChain).not.toHaveBeenCalled();
};
const pressGoBack = () => {
  const footer = view.root.findAllByType('WizardFooter').find(node => node.props.children === 'Go Back');
  act(() => footer.props.onPress());
};

beforeEach(() => {
  jest.clearAllMocks();
  mockCanGoBack = true;
  mockNetworkFee = {loading: false, fee: null, error: null, retry: jest.fn()};
  mockState = {
    authentication: {activeAccount: {accountHash: 'alice', keys: {}}},
    settings: {
      coinSettings: {},
      generalWalletSettings: {
        addressBlocklist: [BLOCKED_R, BLOCKED_I, BLOCKED_ETH].map(address => ({address, details: '', lastModified: 0})),
      },
    },
    coins: {activeCoinsForUser: []},
    ledger: {balances: {}, rates: {}},
  };
  // A preparation that never finishes: only whether it starts matters here.
  preflightSend.mockReturnValue(new Promise(() => {}));
  preflightConvertOrCrossChain.mockReturnValue(new Promise(() => {}));
});
afterEach(() => {
  if (view) act(() => view.unmount());
  view = null;
});

describe('Send Confirm blocks a blocklisted recipient on every route', () => {
  it('scan with an amount, one card: VerusPay opens Confirm directly', async () => {
    await render({initialState: {
      ...sourceOf(VRSC, vrpcCard),
      ...direct(VRSC),
      // Case differs from the list entry: the match ignores case.
      ...getScanRequestFields({address: BLOCKED_R.toLowerCase(), amount: '1', coinId: VRSC.id}),
    }});
    noPreparation();
    expect(shownBlocked()).toBe(true);
    expect(texts()).toContain('Couldn’t prepare transaction');
  });

  it('scan with an amount, several cards: Select asset opens Confirm', async () => {
    await render({
      initialState: getScanRequestFields({address: BLOCKED_R, amount: '1', coinId: VRSC.id}),
      steps: ({setSource}) => {
        const {target, route} = direct(VRSC);
        setSource(sourceOf(VRSC, vrpcCard), target, route);
      },
    });
    noPreparation();
    expect(shownBlocked()).toBe(true);
  });

  it('scan without an amount: Amount opens Confirm', async () => {
    await render({
      initialState: {...sourceOf(VRSC, vrpcCard), ...direct(VRSC), ...getScanRequestFields({address: BLOCKED_R})},
      steps: ({setAmount}) => setAmount('1', '100000000', null, '1', false),
    });
    noPreparation();
    expect(shownBlocked()).toBe(true);
  });

  it('ETH scan: blocked before the network fee is ready, on the full step', async () => {
    mockNetworkFee = {loading: true, fee: null, error: null, retry: jest.fn()};
    await render({initialState: {
      ...sourceOf(ETH, ethCard),
      target: {id: ETH.id, isConversion: false},
      route: {key: 'direct', isCrossChain: false, addressType: 'ethereum'},
      ...getScanRequestFields({address: BLOCKED_ETH, amount: '0.1', coinId: ETH.id}),
    }});
    noPreparation();
    expect(shownBlocked()).toBe(true);
    expect(texts()).toContain('Couldn’t prepare transaction');
  });

  it('fixed invoice: Pay with opens Confirm, and Go Back leaves the invoice', async () => {
    mockCanGoBack = false;
    const onExit = jest.fn();
    await render({
      invoiceFlow: {onExit},
      initialState: {invoice: {anyAmount: false, anyDestination: false}},
      steps: ({setSource, setAmount, setRecipient}) => {
        const {target, route} = direct(VRSC);
        setSource(sourceOf(VRSC, vrpcCard), target, route);
        setAmount('1', '100000000', null, '1', false);
        setRecipient(BLOCKED_I);
      },
    });
    noPreparation();
    expect(shownBlocked()).toBe(true);
    pressGoBack();
    expect(onExit).toHaveBeenCalledTimes(1);
  });

  it('invoice with a VerusID name: checks the i-address Confirm resolves', async () => {
    getIdentityForCard.mockResolvedValue({result: {identity: {identityaddress: BLOCKED_I}}});
    await render({
      invoiceFlow: {onExit: jest.fn()},
      initialState: {invoice: {anyAmount: false, anyDestination: false}},
      steps: ({setSource, setAmount, setRecipient}) => {
        const {target, route} = direct(VRSC);
        setSource(sourceOf(VRSC, vrpcCard), target, route);
        setAmount('1', '100000000', null, '1', false);
        setRecipient('shop@');
      },
    });
    expect(getIdentityForCard).toHaveBeenCalledTimes(1);
    noPreparation();
    expect(shownBlocked()).toBe(true);
  });

  it('private card with a VerusID name: checks the resolved address before preparing', async () => {
    getIdentityForPrivate.mockResolvedValue({result: {status: 'active', identity: {identityaddress: BLOCKED_I}}});
    await render({initialState: {
      ...sourceOf(VRSC, privateCard),
      ...direct(VRSC),
      ...getScanRequestFields({address: 'shop@', amount: '1', coinId: VRSC.id}),
    }});
    expect(getIdentityForPrivate).toHaveBeenCalledTimes(1);
    noPreparation();
    expect(shownBlocked()).toBe(true);
  });

  it('VRPC send with a VerusID name: rejects the address its preparation resolved', async () => {
    preflightSend.mockResolvedValue({err: false, result: {
      fee: '0.0001', value: '1', toAddress: 'shop@', resolvedToAddress: BLOCKED_I,
    }});
    await render({initialState: {
      ...sourceOf(VRSC, vrpcCard),
      ...direct(VRSC),
      ...getScanRequestFields({address: 'shop@', amount: '1', coinId: VRSC.id}),
    }});
    expect(preflightSend).toHaveBeenCalledTimes(1);
    expect(shownBlocked()).toBe(true);
    // No review and no slider: only Go Back is offered.
    const footers = view.root.findAllByType('WizardFooter');
    expect(footers.map(node => node.props.children)).toEqual(['Go Back']);
  });

  it('prepares a payment to an address that is not blocked', async () => {
    await render({initialState: {
      ...sourceOf(VRSC, vrpcCard),
      ...direct(VRSC),
      ...getScanRequestFields({address: ALLOWED_R, amount: '1', coinId: VRSC.id}),
    }});
    expect(preflightSend).toHaveBeenCalledTimes(1);
    expect(preflightSend.mock.calls[0][2]).toBe(ALLOWED_R);
    expect(shownBlocked()).toBe(false);
  });
});
