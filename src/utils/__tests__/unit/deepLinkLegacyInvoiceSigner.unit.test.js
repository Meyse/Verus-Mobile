// RQ-1 / R11: DeepLink verifies a legacy signed VerusPay invoice and must
// pass the signer's ID to InvoiceInfo, so the requester card can open the
// signer. The signer ID comes from the invoice link, not from the test.
let mockState;

jest.mock('react-native', () => require('../../../tests/helpers/mockReactNative')({View: 'View'}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: effect => require('react').useEffect(effect, [effect]),
}));
jest.mock('react-native-paper', () => ({...jest.requireActual('react-native-paper'), Portal: 'Portal'}));
jest.mock('react-redux', () => require('../../../tests/helpers/mockReactRedux')({
  useSelector: selector => selector(mockState),
  useDispatch: () => jest.fn(),
}));
jest.mock('../../../hooks/useObjectSelector', () => ({useObjectSelector: selector => selector(mockState)}));
jest.mock('../../../store', () => ({getState: () => mockState}));
jest.mock('../../../components/AnimatedActivityIndicatorBox', () => 'Loading');
jest.mock('../../../containers/DeepLink/LoginRequestInfo/LoginRequestInfo', () => 'LoginRequestInfo');
jest.mock('../../../containers/DeepLink/InvoiceInfo/InvoiceInfo', () => 'InvoiceInfo');
jest.mock('../../../containers/DeepLink/GenericRequestHome/GenericRequestHome', () => 'GenericRequestHome');
jest.mock('../../../actions/actions/alert/dispatchers/alert', () => ({createAlert: jest.fn()}));
jest.mock('../../vrpc/vrpcInterface', () => ({initEndpoint: jest.fn()}));
jest.mock('../../api/channels/vrpc/callCreators', () => ({
  getInfo: async () => ({result: {longestchain: 1000}}),
  getBlock: async () => ({result: {time: 1763400000}}),
  verifyVerusPayInvoice: async () => true,
  extractVerusPayInvoiceSig: async () => ({height: 10}),
}));
jest.mock('../../api/channels/verusid/callCreators', () => ({
  getCurrency: async (_system, currencyId) => ({
    result: {currencyid: currencyId, fullyqualifiedname: 'VRSCTEST'},
  }),
  getIdentity: async () => ({result: {fullyqualifiedname: 'signer@'}}),
}));
jest.mock('../../CoinData/CoinDirectory', () => ({CoinDirectory: {
  getBasicCoinObj: () => ({
    id: 'VRSCTEST',
    system_id: 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq',
    currency_id: 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq',
    vrpc_endpoints: ['http://unused.invalid'],
  }),
}}));
jest.mock('../../deeplink/verusPayBurnChangePrice', () => ({
  validateVerusPayBurnChangePrice: jest.fn(),
  VERUSPAY_BURN_OWN_ADDRESS_DISPLAY: 'Your own address',
}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const {primitives} = require('verusid-ts-client');
const DeepLink = require('../../../containers/DeepLink/DeepLink').default;

// The legacy signed invoice from the lead developer's review (testnet).
const R11_LINK =
  'i5jtwbp6zymeay9llnraglgjqgdrffsau4://x-callback-url/iEETy7La3FTN2Sd2hNRgepek5S8x8eeUeQ/hv7-_wTPpu-eojVjXjKBJP80KdufnpG2Ti0GcSiT9qqWRb31J8vKPbKB3ivQ6gFJAgXFLhQAAUEg6AJZSS2KsEkXYZGMzVKhPUn3In96dLENrqJRgd4ECyo0xDYfqo_OKgZGjhdVhoeSEP7q1gbus3jthYc34O47MP2JBP0GKwIUZ2wApWxV1eX5RD9lb54aqYh_Vw-m756iNWNeMoEk_zQp25-ekbZOLf4A4fUFAQEkZGVlcGxpbmstcWEtNWFmZTNmMTQ0NzdjODcxNzZlYjZiMTNh';

it('passes the verified legacy invoice signer to InvoiceInfo', async () => {
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  const invoice = primitives.VerusPayInvoice.fromWalletDeeplinkUri(R11_LINK);
  expect(invoice.isSigned()).toBe(true);
  mockState = {
    deeplink: {
      id: primitives.VERUSPAY_INVOICE_VDXF_KEY.vdxfid,
      data: invoice.toJson(),
      requestId: 1,
    },
    authentication: {signedIn: false, accounts: [], activeAccount: null},
    alert: {active: false}, sendModal: {visible: false, type: null}, modal: {stack: []},
  };

  let view;
  await act(async () => {
    view = create(
      <DeepLink navigation={{dispatch: jest.fn(), addListener: jest.fn(() => jest.fn())}} />,
    );
  });

  const invoiceInfo = view.root.findByType('InvoiceInfo');
  expect(invoiceInfo.props.isSigned).toBe(true);
  expect(invoiceInfo.props.signerFqn).toBe('signer@');
  // The signing ID that the link carries, as an i-address.
  expect(invoiceInfo.props.signerIdentityID).toBe(invoice.signing_id);
  expect(invoiceInfo.props.signerIdentityID).toMatch(/^i[1-9A-HJ-NP-Za-km-z]{33}$/);
  act(() => view.unmount());
});
