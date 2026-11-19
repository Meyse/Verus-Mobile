import BigNumber from 'bignumber.js';
import axios from 'axios';
import {ECPair, ECSignature, networks, Transaction} from 'bitgo-utxo-lib';
import {txPreflight} from '../../api/channels/electrum/requests/pushTx';
import {getUnspentFormatted} from '../../api/channels/electrum/requests/getUnspent';
import {requestPrivKey} from '../../auth/authBox';
import {CoinDirectory} from '../../CoinData/CoinDirectory';
import {coinsList} from '../../CoinData/CoinsList';
import {explorers} from '../../CoinData/CoinData';
import {electrumServers} from '../../CoinData/electrum/servers';
import {getRecommendedBTCFees} from '../../api/channels/general/callCreators';
import {deriveKeyPair} from '../../keys';
import {ELECTRUM} from '../../constants/intervalConstants';
import {networkFeeKind} from '../../../containers/SendWizard/networkFeeUtils';
import QrScanner from '../../QrScanner/QrScanner';

jest.mock('axios', () => {
  const axiosMock = {get: jest.fn(), post: jest.fn()};
  axiosMock.create = () => axiosMock;
  return {__esModule: true, default: axiosMock, ...axiosMock};
});
jest.mock('../../api/channels/electrum/requests/getUnspent', () => ({
  getUnspentFormatted: jest.fn(),
}));
jest.mock('../../auth/authBox', () => ({requestPrivKey: jest.fn()}));
jest.mock('../../../../env/index', () => ({
  CURRENCY_DEFINITION_STORAGE_INTERNAL_KEY: 'test-currency-definitions',
  KEY_DERIVATION_VERSION: 1,
  VRPC_API_KEYS: {},
}));

// Private key 1, compressed (Bitcoin wiki and bitcoinjs test vectors).
const PRIVATE_KEY_ONE_WIF = 'KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn';
const PRIVATE_KEY_ONE_UNCOMPRESSED_WIF = '5HpHagT65TZzG1PH3CSu63k8DbpvD8s5ip4nEB3kEsreAnchuDf';
const MAINNET_ADDRESS = '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH';
const TESTNET_ADDRESS = 'mrCDrCybB6J1vRfbwM5hemdJz73FwDBC8r';

// Testnet P2PKH address of hash160 243f1394...ce924.
const RECIPIENT = 'mipcBbFg9gMiCh81Kj8tqqdgoZub1ZJRfn';
const P2PKH = hash160 => `76a914${hash160}88ac`;
const OWN_HASH160 = '751e76e8199196d454941c45d1b3a323f1433bd6';

const MEMPOOL_RATES = {data: {fastestFee: 9, halfHourFee: 5, hourFee: 2}};

describe('Bitcoin Testnet4 coin', () => {
  beforeEach(() => {
    CoinDirectory.coins = JSON.parse(JSON.stringify(coinsList));
    CoinDirectory.updateCoinLists();
    axios.get.mockReset();
  });

  it('is offered to Testnet profiles only', () => {
    expect(CoinDirectory.testCoinList).toContain('TESTNET');
    expect(CoinDirectory.supportedCoinList).not.toContain('TESTNET');
    expect(CoinDirectory.enabledNameList).not.toContain('TESTNET');
  });

  it('derives the testnet address and keeps the BTC address for the same key', async () => {
    const testnet = await deriveKeyPair(PRIVATE_KEY_ONE_WIF, coinsList.TESTNET, ELECTRUM);
    const btc = await deriveKeyPair(PRIVATE_KEY_ONE_WIF, coinsList.BTC, ELECTRUM);

    expect(testnet.addresses).toEqual([TESTNET_ADDRESS]);
    expect(btc.addresses).toEqual([MAINNET_ADDRESS]);
  });

  it('uses the testnet4 servers and explorer, and leaves BTC unchanged', () => {
    const coin = CoinDirectory.findCoinObj('TESTNET');

    expect(coin.electrum_endpoints).toEqual([
      '134.199.227.217:50002:ssl',
      'bitcoin.stagemole.eu:5010:ssl',
      'testnet4.qtornado.com:51012:ssl',
    ]);
    expect(explorers.TESTNET).toBe('https://mempool.space/testnet4');

    expect(coinsList.BTC.bitgojs_network_key).toBe('bitcoin');
    expect(explorers.BTC).toBe('https://www.blockchain.com/btc');
    expect(electrumServers.btc.serverList).toEqual([
      'electrum1.cipig.net:10000:tcp',
      'electrum2.cipig.net:10000:tcp',
      'electrum3.cipig.net:10000:tcp',
    ]);
  });

  it('asks mempool.space for testnet4 rates and never uses mainnet rates for it', async () => {
    axios.get.mockResolvedValueOnce(MEMPOOL_RATES);
    await expect(getRecommendedBTCFees(true, 100)).resolves.toEqual({
      fastest: 9, average: 5, slowest: 2,
    });
    expect(axios.get).toHaveBeenLastCalledWith(
      'https://mempool.space/testnet4/api/v1/fees/recommended', {timeout: 10000},
    );

    axios.get.mockReset();
    axios.get.mockRejectedValue(new Error('offline'));
    await expect(getRecommendedBTCFees(true, 100)).resolves.toBe(false);
    expect(axios.get).toHaveBeenCalledTimes(1);
  });

  it('keeps the BTC fee URL and its blockchain.com fallback', async () => {
    axios.get.mockResolvedValueOnce(MEMPOOL_RATES);
    await getRecommendedBTCFees(false, 100);
    expect(axios.get).toHaveBeenLastCalledWith(
      'https://mempool.space/api/v1/fees/recommended', {timeout: 10000},
    );

    axios.get.mockReset();
    axios.get.mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({data: {priority: 7, regular: 3}});
    await expect(getRecommendedBTCFees(false, 100)).resolves.toEqual({
      fastest: 7, average: 3, slowest: 3,
    });
    expect(axios.get).toHaveBeenLastCalledWith(
      'https://api.blockchain.com/mempool/fees', {timeout: 10000},
    );
  });

  it('shows the BTC fee choice for BTC and Bitcoin Testnet4 only', () => {
    expect(networkFeeKind(true, 'electrum', coinsList.TESTNET)).toBe('btc');
    expect(networkFeeKind(true, 'electrum', coinsList.BTC)).toBe('btc');
    expect(networkFeeKind(true, 'electrum', coinsList.KMD)).toBeNull();
    expect(networkFeeKind(false, 'electrum', coinsList.TESTNET)).toBeNull();
  });

  it('signs a testnet4 send through the production preflight', async () => {
    const coin = CoinDirectory.findCoinObj('TESTNET');
    const keys = await deriveKeyPair(PRIVATE_KEY_ONE_WIF, coin, ELECTRUM);
    requestPrivKey.mockResolvedValue(keys.privKey);
    getUnspentFormatted.mockResolvedValue({
      utxoList: [{
        txid: 'a'.repeat(64), vout: 0, amountSats: 100000,
        reportedValueSats: 100000, verifiedValueSats: 100000,
        verifiedTxid: true, verifiedMerkle: true, interestSats: 0,
      }],
      unshieldedFunds: BigNumber(0),
    });
    const user = {id: 'profile', keys: {TESTNET: {electrum: keys}}};

    // The same network lookup as the Send wizard Confirm screen.
    const response = await txPreflight(coin, user, RECIPIENT, BigNumber('0.0005'), {
      defaultFee: {feePerByte: 2}, network: networks[coin.id.toLowerCase()],
    }, true);

    // Signed size: 10 + 148 per P2PKH input + 34 per output = 226 bytes.
    expect(response.err).toBe(false);
    expect(response.result.fee).toBe('0.00000452');
    const tx = Transaction.fromHex(response.result.params.rawtx, networks.testnet);
    expect(tx.outs.map(output => [output.script.toString('hex'), output.value])).toEqual([
      [P2PKH('243f1394f44554f4ce3fd68649c19adc483ce924'), 50000],
      [P2PKH(OWN_HASH160), 49548],
    ]);

    const [signature, publicKey] = [tx.ins[0].script.slice(1, 1 + tx.ins[0].script[0]),
      tx.ins[0].script.slice(2 + tx.ins[0].script[0])];
    const hash = tx.hashForSignature(0, Buffer.from(P2PKH(OWN_HASH160), 'hex'),
      Transaction.SIGHASH_ALL);
    const pair = ECPair.fromPublicKeyBuffer(publicKey, networks.testnet);
    expect(pair.getAddress()).toBe(TESTNET_ADDRESS);
    expect(pair.verify(hash, ECSignature.fromDER(signature.slice(0, -1)))).toBe(true);
  });

  // The device refused 225 sat for a 226 vB send: "min relay fee not met".
  // A signed input with a compressed key and a low-S signature is at most
  // 148 bytes, so the fee must cover 10 + 148 per input + 34 per output.
  // An uncompressed key (imported WIF) makes a 180-byte input.
  it.each([
    ['TESTNET', 1, 226, PRIVATE_KEY_ONE_WIF],
    ['BTC', 2, 374, PRIVATE_KEY_ONE_WIF],
    ['TESTNET', 1, 258, PRIVATE_KEY_ONE_UNCOMPRESSED_WIF],
  ])('pays at least the signed size at 1 sat/vB (%s, %i inputs, %i sat)', async (coinId, count, fee, wif) => {
    const coin = CoinDirectory.findCoinObj(coinId);
    const keys = await deriveKeyPair(wif, coin, ELECTRUM);
    requestPrivKey.mockResolvedValue(keys.privKey);
    getUnspentFormatted.mockResolvedValue({
      utxoList: Array.from({length: count}, (_, vout) => ({
        txid: 'a'.repeat(64), vout, amountSats: 30000,
        reportedValueSats: 30000, verifiedValueSats: 30000,
        verifiedTxid: true, verifiedMerkle: true, interestSats: 0,
      })),
      unshieldedFunds: BigNumber(0),
    });
    const network = networks[coin.id.toLowerCase()] || networks.bitcoin;
    const amount = count === 1 ? '0.0002' : '0.0005';
    const response = await txPreflight(coin, {id: 'profile', keys: {[coinId]: {electrum: keys}}},
      keys.addresses[0], BigNumber(amount), {defaultFee: {feePerByte: 1}, network}, true);

    expect(response.err).toBe(false);
    expect(response.result.fee).toBe(BigNumber(fee).dividedBy(1e8).toFixed());
    const tx = Transaction.fromHex(response.result.params.rawtx, network);
    expect(tx.ins).toHaveLength(count);
    expect(tx.outs).toHaveLength(2);
    expect(fee).toBeGreaterThanOrEqual(tx.byteLength());
  });

  it('takes the fee from a Max send and never leaves a dust or negative amount', async () => {
    const coin = CoinDirectory.findCoinObj('TESTNET');
    const keys = await deriveKeyPair(PRIVATE_KEY_ONE_WIF, coin, ELECTRUM);
    requestPrivKey.mockResolvedValue(keys.privKey);
    const user = {id: 'profile', keys: {TESTNET: {electrum: keys}}};
    const maxSend = sats => {
      getUnspentFormatted.mockResolvedValue({
        utxoList: [{
          txid: 'a'.repeat(64), vout: 0, amountSats: sats,
          reportedValueSats: sats, verifiedValueSats: sats,
          verifiedTxid: true, verifiedMerkle: true, interestSats: 0,
        }],
        unshieldedFunds: BigNumber(0),
      });
      return txPreflight(coin, user, RECIPIENT, BigNumber(sats).dividedBy(1e8), {
        defaultFee: {feePerByte: 1}, network: networks.testnet,
      }, true);
    };

    // One input, one output: 10 + 148 + 34 = 192 bytes at 1 sat/vB.
    const response = await maxSend(30000);
    expect(response.result.fee).toBe('0.00000192');
    expect(response.result.value).toBe('0.00029808');
    const tx = Transaction.fromHex(response.result.params.rawtx, networks.testnet);
    expect(tx.outs.map(output => output.value)).toEqual([29808]);
    expect(192).toBeGreaterThanOrEqual(tx.byteLength());

    // 700 - 192 = 508 sat is below the 546 sat dust limit.
    await expect(maxSend(700)).rejects.toThrow('Send at least 0.00000546 BTCTEST');
  });

  it('reads a bitcoin: payment link by the address network', () => {
    expect(QrScanner.processPaymentRequestURI(`bitcoin:${TESTNET_ADDRESS}?amount=0.001`))
      .toMatchObject({coinTicker: 'TESTNET', address: TESTNET_ADDRESS});
    expect(QrScanner.processPaymentRequestURI(`bitcoin:${MAINNET_ADDRESS}?amount=0.001`))
      .toMatchObject({coinTicker: 'BTC', address: MAINNET_ADDRESS});
    expect(QrScanner.processPaymentRequestURI(`bitcoin:${MAINNET_ADDRESS}`))
      .toMatchObject({coinTicker: 'BTC'});
  });

  it('moves change below dust to the fee and accepts the maximum custom rate', async () => {
    const coin = CoinDirectory.findCoinObj('TESTNET');
    const keys = await deriveKeyPair(PRIVATE_KEY_ONE_WIF, coin, ELECTRUM);
    requestPrivKey.mockResolvedValue(keys.privKey);
    const user = {id: 'profile', keys: {TESTNET: {electrum: keys}}};
    const send = (inputSats, amountSats, feePerByte, vout = 0) => {
      getUnspentFormatted.mockResolvedValue({
        utxoList: [{
          txid: 'a'.repeat(64), vout, amountSats: inputSats,
          reportedValueSats: inputSats, verifiedValueSats: inputSats,
          verifiedTxid: true, verifiedMerkle: true, interestSats: 0,
        }],
        unshieldedFunds: BigNumber(0),
      });
      return txPreflight(coin, user, RECIPIENT, BigNumber(amountSats).dividedBy(1e8), {
        defaultFee: {feePerByte}, network: networks.testnet,
      }, true);
    };

    // 100000 - 99229 - 226 = 545 sat change, below the 546 sat dust limit.
    const dust = await send(100000, 99229, 1);
    expect(dust.result.fee).toBe('0.00000771');
    expect(Transaction.fromHex(dust.result.params.rawtx, networks.testnet).outs
      .map(output => output.value)).toEqual([99229]);

    // Planned 226 bytes x 2500 sat/vB. Input 1 signs into 225 bytes.
    const maximum = await send(2000000, 100000, 2500, 1);
    expect(Transaction.fromHex(maximum.result.params.rawtx, networks.testnet).byteLength())
      .toBe(225);
    expect(maximum.err).toBe(false);
    expect(maximum.result.fee).toBe('0.00565');
  });
});
