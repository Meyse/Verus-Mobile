/*
  PR 266 review R10, option A (owner, 2026-11-19): a tagged VerusPay invoice
  shows the "Tagged invoice" notice on the request review. An untagged one
  shows none.
*/
import React from 'react';
import {act, create} from 'react-test-renderer';
import {primitives} from 'verusid-ts-client';
import BN from 'bn.js';

// The tagged testnet invoice from the lead developer's review (R11).
const TAGGED_LINK =
  'i5jtwbp6zymeay9llnraglgjqgdrffsau4://x-callback-url/iEETy7La3FTN2Sd2hNRgepek5S8x8eeUeQ/hv7-_wTPpu-eojVjXjKBJP80KdufnpG2Ti0GcSiT9qqWRb31J8vKPbKB3ivQ6gFJAgXFLhQAAUEg6AJZSS2KsEkXYZGMzVKhPUn3In96dLENrqJRgd4ECyo0xDYfqo_OKgZGjhdVhoeSEP7q1gbus3jthYc34O47MP2JBP0GKwIUZ2wApWxV1eX5RD9lb54aqYh_Vw-m756iNWNeMoEk_zQp25-ekbZOLf4A4fUFAQEkZGVlcGxpbmstcWEtNWFmZTNmMTQ0NzdjODcxNzZlYjZiMTNh';
const VRSCTEST_ID = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
const NOTICE =
  'This payment carries a public tag. Anyone with the invoice or the tag can find it and see which addresses paid. This lowers your privacy.';

const mockState = {
  authentication: {
    signedIn: false,
    activeAccount: {accountHash: 'fixture-hash', testnetOverrides: {VRSC: 'VRSCTEST'}},
    accounts: [],
  },
  coins: {activeCoinsForUser: []},
  coinMenus: {allSubWallets: {}},
  ledger: {rates: {}},
  settings: {generalWalletSettings: {}},
};

jest.mock('react-redux', () => ({
  useSelector: selector => selector(mockState),
  useDispatch: () => jest.fn(),
}));
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({children}) => children,
  useSafeAreaInsets: () => ({top: 0, bottom: 0, left: 0, right: 0}),
}));
jest.mock('lucide-react-native', () => new Proxy({}, {get: (_t, name) => String(name)}));
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'MCIcon');
jest.mock('../../../../utils/api/channels/verusid/callCreators', () => ({
  getIdentity: jest.fn(() => new Promise(() => {})),
  getFriendlyNameMap: jest.fn(() => Promise.resolve({})),
}));
jest.mock('../../../../actions/actionDispatchers', () => ({
  requestWalletUnlock: jest.fn(),
  WALLET_UNLOCK_CANCELLED: 'cancelled',
}));
jest.mock('../../../../actions/actions/alert/dispatchers/alert', () => ({
  createAlert: jest.fn(),
}));
jest.mock('../../../../utils/deeplink/paidInvoiceStorage', () => ({
  getPaidInvoiceKey: () => null,
  loadPaidInvoice: () => Promise.resolve(null),
  savePaidInvoice: () => Promise.resolve(),
}));
jest.mock('../InvoicePayFlow', () => () => null);
jest.mock('../../InvoicePaymentConfiguration/InvoicePaymentConfiguration', () => props =>
  props.renderFlow ? props.renderFlow({cards: [], loading: false}) : props.renderInvoice?.({}) ?? null);
jest.mock('../../../../components/AcknowledgeSheet', () => () => null);
jest.mock('../../components/RequestReview/DeepLinkRequestSheetScaffold', () => () => null);
jest.mock('../../components/RequestReview/DeepLinkVerusIdDetailsSheet', () => () => null);
jest.mock('../../components/RequestReview/DeepLinkRequesterSheet', () => () => null);

const InvoiceInfo = require('../InvoiceInfo').default;

const props = details => ({
  detailsBufferString: details.toBuffer().toString('hex'),
  invoiceVersion: primitives.VerusPayInvoice.fromWalletDeeplinkUri(TAGGED_LINK).version.toString(),
  isSigned: false,
  currencyDefinition: {currencyid: VRSCTEST_ID, fullyqualifiedname: 'VRSCTEST'},
  amountDisplay: '0.00011014',
  destinationDisplay: 'RJi34RQHKHQwkYXa2tMdgbVj8r4WSPCM2V',
  acceptedSystemsDefinitions: {definitions: [], remainingSystems: []},
  coinObj: {id: 'VRSCTEST', system_id: VRSCTEST_ID, testnet: true},
  chainInfo: {longestchain: 1000},
  cancel: jest.fn(),
});

const texts = renderer =>
  renderer.root
    .findAll(node => typeof node.props?.children === 'string')
    .map(node => node.props.children);

let mounted = [];
beforeEach(() => jest.useFakeTimers());
afterEach(() => {
  act(() => {
    mounted.forEach(renderer => renderer.unmount());
    jest.runOnlyPendingTimers();
  });
  mounted = [];
  jest.useRealTimers();
});

const render = details => {
  let renderer;
  act(() => {
    renderer = create(<InvoiceInfo {...props(details)} />);
  });
  mounted.push(renderer);
  return renderer;
};

describe('tagged invoice notice', () => {
  it('shows the notice for a tagged invoice', () => {
    const {details} = primitives.VerusPayInvoice.fromWalletDeeplinkUri(TAGGED_LINK);
    expect(details.isTagged()).toBe(true);

    const shown = texts(render(details));

    expect(shown).toContain('Tagged invoice');
    expect(shown).toContain(NOTICE);
  });

  it('shows no notice for the same invoice without its tag', () => {
    const {details} = primitives.VerusPayInvoice.fromWalletDeeplinkUri(TAGGED_LINK);
    details.flags = details.flags.sub(new BN(1024));
    expect(details.isTagged()).toBe(false);

    const shown = texts(render(details));

    expect(shown).not.toContain('Tagged invoice');
    expect(shown).not.toContain(NOTICE);
  });
});
