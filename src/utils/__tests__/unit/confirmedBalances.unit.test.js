// PR 266 review R13 (owner, 2026-11-19): every balance shows confirmed funds
// only, as upstream does. Values come from the owner's decision and from the
// node and Electrum answers below, not from the code under test.

jest.mock('../../api/channels/vrpc/callCreators', () => ({
  getAddressBalances: jest.fn(),
  getAddressDeltas: jest.fn(),
  getAddressMempool: jest.fn(),
  getInfo: jest.fn(),
}));

const {updateVrpcBalances} = require('../../../actions/actions/wallet/dispatchers/vrpc/updates');
const {getAddressBalances, getAddressMempool} = require('../../api/channels/vrpc/callCreators');
const {getManagedAssetBalance} = require('../../assets/assetIdentity');
const {getSendLimit, getSpendableBalance} = require('../../subwallet/privateWallet');
const {
  formatPendingMark,
  getPendingBalance,
  getShownBalance,
} = require('../../ledger/shownBalance');
const {API_GET_BALANCES} = require('../../constants/intervalConstants');

const SYSTEM = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
const ADDRESS = 'RXw9eszq5f7mnU9X4cPYRFR4cSybJ7m6pz';
const CHANNEL = `vrpc.${ADDRESS}.${SYSTEM}`;
const VRSCTEST = {id: 'VRSCTEST', currency_id: SYSTEM, testnet: true, proto: 'vrsc'};
const TOKEN = {id: 'TOKEN', currency_id: 'iToken', testnet: true, proto: 'vrsc'};

// getaddressbalance: 10 VRSCTEST and 4 TOKEN, confirmed.
const nodeBalance = {result: {balance: 1000000000, currencybalance: {iToken: '4'}}};
// Mempool of the same address: 0.5 incoming from another wallet, and an own
// send of 1 that spends the 10 output and returns 8.9999 change.
const nodeMempool = {result: [
  {txid: 'incoming', address: ADDRESS, satoshis: 50000000},
  {txid: 'own-send', address: ADDRESS, satoshis: -1000000000, prevtxid: 'confirmed', prevout: 0},
  {txid: 'own-send', address: ADDRESS, satoshis: 899990000},
]};

const card = (id, channel) => ({id, api_channels: {[API_GET_BALANCES]: channel}});

beforeEach(() => {
  jest.clearAllMocks();
  getAddressBalances.mockResolvedValue(nodeBalance);
  getAddressMempool.mockResolvedValue(nodeMempool);
});

describe('Verus balance', () => {
  it('is getaddressbalance while an incoming payment and an own send are unconfirmed', async () => {
    const result = await updateVrpcBalances(VRSCTEST, CHANNEL);

    expect(result.body).toEqual({confirmed: '10', pending: '0', total: '10'});
    expect(getAddressMempool).not.toHaveBeenCalled();
  });

  it('keeps confirmed values in the discovery snapshot that Home reads first', async () => {
    const result = await updateVrpcBalances(TOKEN, CHANNEL);

    expect(result.body.confirmed).toBe('4');
    expect(result.assetDiscovery.currencies).toEqual({[SYSTEM]: '10', iToken: '4'});

    const snapshots = {[CHANNEL]: result.assetDiscovery};
    expect(getManagedAssetBalance(VRSCTEST, [card('MAIN', CHANNEL)], {}, snapshots).total.toString())
      .toBe('10');
  });

  it('gives Home, Available and MAX the same value', async () => {
    const result = await updateVrpcBalances(VRSCTEST, CHANNEL);
    const ledger = {[CHANNEL]: {VRSCTEST: result.body}};
    const home = getManagedAssetBalance(VRSCTEST, [card('MAIN', CHANNEL)], ledger,
      {[CHANNEL]: result.assetDiscovery}).total.toString();

    expect(home).toBe('10');
    expect(getSendLimit(result.body)).toBe('10');
    expect(getSpendableBalance(result.body).toString()).toBe('10');
  });
});

describe('Electrum balance', () => {
  const ELECTRUM = 'electrum.mtestaddress.BTCTEST';
  const BTC = {id: 'BTCTEST', currency_id: 'BTCTEST', testnet: true};

  it('shows the server confirmed value on Home, Available and MAX with an unconfirmed payment', () => {
    // blockchain.address.get_balance: confirmed 0.01, unconfirmed +0.002.
    const entry = {confirmed: '0.01', pending: '0.002', total: '0.012'};
    const ledger = {[ELECTRUM]: {BTCTEST: entry}};

    expect(getManagedAssetBalance(BTC, [card('MAIN', ELECTRUM)], ledger).total.toString()).toBe('0.01');
    expect(getSendLimit(entry)).toBe('0.01');
    expect(getPendingBalance(entry).toString()).toBe('0.002');
  });

  it('keeps an unconfirmed payment out of Home but not out of the empty check', () => {
    const entry = {confirmed: '0', pending: '0.002', total: '0.002'};
    const ledger = {[ELECTRUM]: {BTCTEST: entry}};
    const cards = [card('MAIN', ELECTRUM)];

    expect(getManagedAssetBalance(BTC, cards, ledger).total.isZero()).toBe(true);
    expect(getManagedAssetBalance(BTC, cards, ledger, {}, {withPending: true}).total.toString())
      .toBe('0.002');
  });
});

describe('private card balance', () => {
  it('shows confirmed notes and reports change that still confirms', () => {
    const entry = {confirmed: '2', pending: '1', total: '3'};

    expect(getShownBalance(entry)).toBe('2');
    expect(getSendLimit(entry)).toBe('2');
    expect(getPendingBalance(entry).toString()).toBe('1');
  });
});

describe('pending mark on the asset screen', () => {
  it('reads like the mockup, in coin units, with the sign of the change', () => {
    expect(formatPendingMark('0.5')).toBe('+0.5 pending');
    expect(formatPendingMark('-0.00012345')).toBe('−0.00012345 pending');
  });

  it('shows nothing for Verus, Ethereum or a missing entry', () => {
    expect(getPendingBalance({confirmed: '10', pending: '0', total: '10'})).toBeNull();
    expect(getPendingBalance(undefined)).toBeNull();
    expect(formatPendingMark(null)).toBeNull();
  });
});
