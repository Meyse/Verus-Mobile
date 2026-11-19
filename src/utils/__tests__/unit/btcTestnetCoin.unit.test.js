import axios from 'axios';
import {networks, Transaction} from 'bitgo-utxo-lib';
import {buildSignedTx} from '../../crypto/buildTx';
import {CoinDirectory} from '../../CoinData/CoinDirectory';
import {coinsList} from '../../CoinData/CoinsList';
import {explorers} from '../../CoinData/CoinData';
import {electrumServers} from '../../CoinData/electrum/servers';
import {getRecommendedBTCFees} from '../../api/channels/general/callCreators';
import {deriveKeyPair} from '../../keys';
import {ELECTRUM} from '../../constants/intervalConstants';
import {networkFeeKind} from '../../../containers/SendWizard/networkFeeUtils';

jest.mock('axios', () => {
  const axiosMock = {get: jest.fn(), post: jest.fn()};
  axiosMock.create = () => axiosMock;
  return {__esModule: true, default: axiosMock, ...axiosMock};
});
jest.mock('../../../../env/index', () => ({
  CURRENCY_DEFINITION_STORAGE_INTERNAL_KEY: 'test-currency-definitions',
  KEY_DERIVATION_VERSION: 1,
  VRPC_API_KEYS: {},
}));

// Private key 1, compressed (Bitcoin wiki and bitcoinjs test vectors).
const PRIVATE_KEY_ONE_WIF = 'KwDiBf89QgGbjEhKnhXJuH7LrciVrZi3qYjgd9M7rFU73sVHnoWn';
const MAINNET_ADDRESS = '1BgGZ9tcN4rm9KBzDn7KprQz87SZ26SAMH';
const TESTNET_ADDRESS = 'mrCDrCybB6J1vRfbwM5hemdJz73FwDBC8r';

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

    // The send signs with the network that pushTx picks by coin id.
    const rawtx = buildSignedTx(
      TESTNET_ADDRESS, TESTNET_ADDRESS, testnet.privKey, networks.testnet,
      [{txid: 'a'.repeat(64), vout: 0, value: 100000}], 0, 90000,
    );
    const outputs = Transaction.fromHex(rawtx, networks.testnet).outs;
    expect(outputs.map(output => output.script.toString('hex'))).toEqual([
      '76a914751e76e8199196d454941c45d1b3a323f1433bd688ac',
    ]);
    expect(outputs[0].value).toBe(90000);
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
});
