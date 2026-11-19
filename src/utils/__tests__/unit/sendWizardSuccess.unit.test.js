// R4 (PR 266 review 1117): the Sent screen links the transaction to the
// chain's explorer, as upstream's result screen does, and only when the chain
// has one. Explorer bases are the public explorers named in CoinData.
let mockState;

jest.mock('react-redux', () => require('../../../tests/helpers/mockReactRedux')({
  useSelector: selector => selector(mockState),
}));
jest.mock('@react-navigation/native', () => ({
  useFocusEffect: () => {},
  useNavigation: () => ({navigate: jest.fn(), getParent: () => null}),
}));
jest.mock('../../../components/TransactionResult', () => 'TransactionResult');
jest.mock('../../../containers/SendWizard/components/TransferSummary', () => ({
  TransferConnector: 'TransferConnector',
  TransferNode: 'TransferNode',
}));
jest.mock('../../../containers/SendWizard/components/WizardUI', () => ({FlatRow: 'FlatRow'}));
jest.mock('../../preconversion/usePrelaunch', () => ({useChainHeight: () => null}));

const React = require('react');
const {act, create} = require('react-test-renderer');
const SendWizardSuccess = require('../../../containers/SendWizard/SendWizardSuccess').default;
const {SendWizardProvider} = require('../../../containers/SendWizard/SendWizardContext');

const TXID = '9f3c1e7a5d02b8c4aa61f93e47b24d08aa61f939f3c1e7a5d02b8c4e47b24d08';

describe('Sent screen explorer link (R4)', () => {
  let view;
  const renderSent = coin => {
    mockState = {
      authentication: {activeAccount: {keys: {}}},
      settings: {generalWalletSettings: {displayCurrency: 'USD'}},
      ledger: {rates: {}, balances: {}},
    };
    act(() => {
      view = create(
        <SendWizardProvider
          mode="send"
          initialState={{
            sourceCoin: coin,
            sourceSubWallet: {id: 'MAIN', api_channels: {}},
            channel: `vrpc.R9Address.${coin.id}`,
            target: {id: coin.id, isConversion: false},
            route: {key: 'direct'},
            amount: '0.01',
            recipientAddress: 'RRecipientAddress',
            txResult: {txid: TXID},
          }}>
          <SendWizardSuccess />
        </SendWizardProvider>,
      );
    });
  };
  const transactions = () => view.root.findByType('TransactionResult').props.transactions;

  afterEach(() => {
    if (view) act(() => view.unmount());
    view = null;
  });

  it('adds the explorer link for a VRSCTEST send', () => {
    renderSent({id: 'VRSCTEST', display_ticker: 'VRSCTEST', tags: []});
    expect(transactions()).toEqual([
      {txid: TXID, explorerUrl: `https://testex.verus.io/tx/${TXID}`},
    ]);
  });

  // A token has no explorer of its own: its Ethereum network has one. Listed
  // tokens (USDC) have no `network` and are mainnet; an imported token names
  // its network.
  it('links an ERC-20 send to the explorer of its Ethereum network', () => {
    renderSent({id: 'USDC', display_ticker: 'USDC', proto: 'erc20', system_id: '.eth', tags: []});
    expect(transactions()).toEqual([
      {txid: TXID, explorerUrl: `https://etherscan.io/tx/${TXID}`},
    ]);
    act(() => view.unmount());
    renderSent({
      id: '0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238',
      display_ticker: 'USDC',
      proto: 'erc20',
      system_id: '.eth',
      network: 'sepolia',
      testnet: true,
      tags: [],
    });
    expect(transactions()).toEqual([
      {txid: TXID, explorerUrl: `https://sepolia.etherscan.io/tx/${TXID}`},
    ]);
  });

  it('adds no link for a chain without an explorer', () => {
    renderSent({id: 'NOEXPLORER', display_ticker: 'NOEX', tags: []});
    expect(transactions()).toEqual([{txid: TXID}]);
  });
});
