import {address, networks} from '@bitgo/utxo-lib';
import {getSpendableUtxos} from '../../api/channels/vrpc/requests/getAddressUtxos';
import VrpcProvider from '../../vrpc/vrpcInterface';

jest.mock('../../vrpc/vrpcInterface', () => ({
  __esModule: true,
  default: {getEndpoint: jest.fn()},
}));

const SYSTEM = 'iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';
const SOURCE = 'RTqQe58LSj2yr5CrwYFwcsAQ1edQwmrkUU';
const SCRIPT = address.toOutputScript(SOURCE, networks.verus).toString('hex');
const confirmed = {
  address: SOURCE, txid: 'ab'.repeat(32), outputIndex: 0,
  script: SCRIPT, satoshis: 500000000, isspendable: true, height: 100,
};

describe('VRPC funding inputs', () => {
  let endpoint;

  beforeEach(() => {
    endpoint = {
      getAddressUtxos: jest.fn().mockResolvedValue({result: [confirmed]}),
      // Own change from a send that is still in the mempool.
      getAddressMempool: jest.fn().mockResolvedValue({result: [
        {address: SOURCE, txid: 'cd'.repeat(32), index: 0, satoshis: -500000000,
          spending: true, prevtxid: confirmed.txid, prevout: 0},
        {address: SOURCE, txid: 'cd'.repeat(32), index: 1, satoshis: 399990000, spending: false},
      ]}),
      getRawTransaction: jest.fn(),
      request: jest.fn().mockRejectedValue(new Error('mempool unavailable')),
    };
    VrpcProvider.getEndpoint.mockReturnValue(endpoint);
  });

  it('are the confirmed outputs of the address index and nothing from the mempool', async () => {
    const utxos = await getSpendableUtxos(SYSTEM, SYSTEM, [SOURCE]);

    expect(utxos).toEqual([confirmed]);
    expect(endpoint.getAddressMempool).not.toHaveBeenCalled();
    expect(endpoint.getRawTransaction).not.toHaveBeenCalled();
    expect(endpoint.request).not.toHaveBeenCalled();
  });
});
