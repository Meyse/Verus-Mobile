/*
  R11: a legacy signed VerusPay invoice (wallet deeplink, no GenericRequest
  envelope) is verified in DeepLink.js, which then passes isSigned: true.
  The request header must show it as signed, like the invoice details do.
*/
import React from 'react';
import {act, create} from 'react-test-renderer';
import {primitives} from 'verusid-ts-client';

// The legacy signed invoice from the lead developer's review (testnet).
const R11_LINK =
  'i5jtwbp6zymeay9llnraglgjqgdrffsau4://x-callback-url/iEETy7La3FTN2Sd2hNRgepek5S8x8eeUeQ/hv7-_wTPpu-eojVjXjKBJP80KdufnpG2Ti0GcSiT9qqWRb31J8vKPbKB3ivQ6gFJAgXFLhQAAUEg6AJZSS2KsEkXYZGMzVKhPUn3In96dLENrqJRgd4ECyo0xDYfqo_OKgZGjhdVhoeSEP7q1gbus3jthYc34O47MP2JBP0GKwIUZ2wApWxV1eX5RD9lb54aqYh_Vw-m756iNWNeMoEk_zQp25-ekbZOLf4A4fUFAQEkZGVlcGxpbmstcWEtNWFmZTNmMTQ0NzdjODcxNzZlYjZiMTNh';
const VRSCTEST_ID = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';

const mockState = {
  authentication: {signedIn: false, activeAccount: null, accounts: []},
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
jest.mock('../../InvoicePaymentConfiguration/InvoicePaymentConfiguration', () => () => null);
jest.mock('../../../../components/AcknowledgeSheet', () => () => null);
jest.mock('../../components/RequestReview/DeepLinkRequestSheetScaffold', () => () => null);
jest.mock('../../components/RequestReview/DeepLinkVerusIdDetailsSheet', () => () => null);
jest.mock('../../components/RequestReview/DeepLinkRequesterSheet', () => () => null);

const InvoiceInfo = require('../InvoiceInfo').default;

const legacyProps = isSigned => {
  const invoice = primitives.VerusPayInvoice.fromWalletDeeplinkUri(R11_LINK);
  expect(invoice.isSigned()).toBe(true);
  return {
    detailsBufferString: invoice.details.toBuffer().toString('hex'),
    invoiceVersion: invoice.version.toString(),
    isSigned,
    ...(isSigned
      ? {
          sigtime: 1763400000,
          signerFqn: 'signer@',
          signerSystemID: invoice.system_id,
          signerIdentityID: invoice.signing_id,
        }
      : {}),
    currencyDefinition: {currencyid: VRSCTEST_ID, fullyqualifiedname: 'VRSCTEST'},
    amountDisplay: '0.00011014',
    destinationDisplay: 'RJi34RQHKHQwkYXa2tMdgbVj8r4WSPCM2V',
    acceptedSystemsDefinitions: {definitions: [], remainingSystems: []},
    coinObj: {id: 'VRSCTEST', system_id: VRSCTEST_ID, testnet: true},
    chainInfo: {longestchain: 1000},
    cancel: jest.fn(),
  };
};

const render = props => {
  let renderer;
  act(() => {
    renderer = create(<InvoiceInfo {...props} />);
  });
  return renderer;
};

const labels = renderer =>
  renderer.root
    .findAll(node => typeof node.props?.accessibilityLabel === 'string')
    .map(node => node.props.accessibilityLabel);

describe('InvoiceInfo legacy VerusPay invoice header', () => {
  it('shows a verified legacy signed invoice as signed, with the signer', () => {
    const renderer = render(legacyProps(true));

    expect(labels(renderer)).toContain('Request from signer@, verified');
    expect(labels(renderer)).not.toContain('Unsigned request');
    renderer.unmount();
  });

  it('shows an unsigned legacy invoice as unsigned', () => {
    const renderer = render(legacyProps(false));

    expect(labels(renderer)).toContain('Unsigned request');
    expect(labels(renderer).some(label => label.startsWith('Request from'))).toBe(false);
    renderer.unmount();
  });
});
