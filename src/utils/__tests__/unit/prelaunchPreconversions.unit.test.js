// TX2 (PR 266 review 1118): the decoded transfers of a confirmed transaction
// are cached once per transaction, and every query applies its own asset and
// address filter. The network is mocked at the request modules.
jest.mock('../../vrpc/vrpcInterface', () => ({__esModule: true, default: {getEndpoint: jest.fn()}}));
jest.mock('../../api/channels/vrpc/requests/getAddressDeltas', () => ({getAddressDeltas: jest.fn()}));
jest.mock('../../api/channels/vrpc/requests/getAddressMempool', () => ({getAddressMempool: jest.fn()}));
jest.mock('../../api/channels/vrpc/requests/getInfo', () => ({getInfo: jest.fn()}));
jest.mock('../../api/channels/vrpc/requests/getTransaction', () => ({getTransaction: jest.fn()}));

const {RESERVE_TRANSFER_DESTINATION} = require('verus-typescript-primitives');

const SYSTEM = 'iSystem';
const OWN = 'RmyAddress';
const OTHER_CARD = 'RotherCard';
const A = 'iCurrencyA';
const B = 'iCurrencyB';
const TXID = 'tx-preconvert-to-B';

// One confirmed transaction: 10 iVRSC pre-converted into B, paid to RmyAddress.
const transferToB = {
  txid: TXID,
  targetId: B,
  currencyId: 'iVRSC',
  destination: OWN,
  amount: '10',
};

let getTransaction;
let getOwnPreconversions;

const entry = id => [id, {currencydefinition: {currencyid: id, definitiontxid: `def-${id}`}}];
const targets = (...ids) => new Map(ids.map(entry));
const txCalls = () => getTransaction.mock.calls.filter(([, txid]) => txid === TXID).length;
const pick = items => items.map(({txid, targetId, currencyId, destination, amount}) => (
  {txid, targetId, currencyId, destination, amount}
));

beforeEach(() => {
  jest.resetModules();
  const {getAddressDeltas} = require('../../api/channels/vrpc/requests/getAddressDeltas');
  const {getAddressMempool} = require('../../api/channels/vrpc/requests/getAddressMempool');
  ({getTransaction} = require('../../api/channels/vrpc/requests/getTransaction'));
  const reserveTransfer = RESERVE_TRANSFER_DESTINATION.getAddressString();
  getAddressDeltas.mockResolvedValue({result: [
    {txid: TXID, height: 100, blocktime: 1, sent: {outputs: [{addresses: [reserveTransfer]}]}},
  ]});
  getAddressMempool.mockResolvedValue({result: []});
  getTransaction.mockImplementation(async (systemId, txid) => ({
    result: txid === TXID
      ? {
          txid: TXID,
          confirmations: 5,
          height: 100,
          vout: [{scriptPubKey: {reservetransfer: {
            preconvert: true,
            destinationcurrencyid: B,
            destination: {address: OWN},
            currencyvalues: {iVRSC: 10},
          }}}],
        }
      : {height: 50},
  }));
  ({getOwnPreconversions} = require('../../preconversion/prelaunchData'));
});

describe('getOwnPreconversions cache', () => {
  it('finds a transfer to B after an earlier query for A only', async () => {
    expect(await getOwnPreconversions(SYSTEM, [OWN], targets(A))).toEqual([]);
    const found = await getOwnPreconversions(SYSTEM, [OWN], targets(A, B));
    expect(pick(found)).toEqual([transferToB]);
  });

  it('finds a transfer to an address added after an earlier query', async () => {
    expect(await getOwnPreconversions(SYSTEM, [OTHER_CARD], targets(B))).toEqual([]);
    const found = await getOwnPreconversions(SYSTEM, [OTHER_CARD, OWN], targets(B));
    expect(pick(found)).toEqual([transferToB]);
  });

  it('still filters a cached transaction for a narrower query', async () => {
    await getOwnPreconversions(SYSTEM, [OWN], targets(A, B));
    expect(await getOwnPreconversions(SYSTEM, [OWN], targets(A))).toEqual([]);
    expect(await getOwnPreconversions(SYSTEM, [OTHER_CARD], targets(B))).toEqual([]);
  });

  it('reads a confirmed transaction from the network once', async () => {
    await getOwnPreconversions(SYSTEM, [OWN], targets(A));
    await getOwnPreconversions(SYSTEM, [OWN], targets(A, B));
    await getOwnPreconversions(SYSTEM, [OTHER_CARD, OWN], targets(B));
    expect(txCalls()).toBe(1);
  });
});
