import {
  getBroadcastRejectionMessage,
  isRepeatedBroadcast,
  rememberBroadcast,
} from '../broadcastRejection';
import {getSendLimit} from '../../../utils/subwallet/privateWallet';
import {CONNECTION_FAILED_MESSAGE} from '../../../utils/network/connectionErrors';

// Funding uses confirmed outputs only. A second send before the next block
// reuses outputs that the first send already spends, and the node refuses it.
const NOT_CONFIRMED_YET =
  'Your previous transaction is not confirmed yet. Nothing new was sent. ' +
  'Wait for the next block, then check your transaction history before you send again.';

describe('node refusal of a send that reuses spent outputs', () => {
  it.each([
    '18: txn-mempool-conflict',
    '18: bad-txns-inputs-spent',
    '-25: Missing inputs',
    '16: bad-txns-inputs-missingorspent',
    '258: txn-already-in-mempool',
    '-27: transaction already in block chain',
    'txn-already-known',
  ])('says nothing new was sent and to wait one block for "%s"', nodeError => {
    expect(getBroadcastRejectionMessage(nodeError)).toBe(NOT_CONFIRMED_YET);
  });

  it('keeps the general text for other node refusals', () => {
    expect(getBroadcastRejectionMessage('16: bad-txns-failed-precheck'))
      .toBe('The network rejected this transaction. Nothing was sent.');
  });

  it('keeps the connection text for transport failures', () => {
    expect(getBroadcastRejectionMessage('Network Error')).toBe(CONNECTION_FAILED_MESSAGE);
  });
});

describe('a send repeated before the next block', () => {
  it('is recognized by the txid this app already broadcast', () => {
    const first = 'AB'.repeat(32);
    rememberBroadcast(first);

    expect(isRepeatedBroadcast(first.toLowerCase())).toBe(true);
    expect(isRepeatedBroadcast('cd'.repeat(32))).toBe(false);
    expect(isRepeatedBroadcast(undefined)).toBe(false);
  });
});

describe('amount a Verus card can send now', () => {
  const VRPC = 'vrpc.RXw9eszq5f7mnU9X4cPYRFR4cSybJ7m6pz.iJhCezBExJHvtyH3fGhNnt2NhU4Ztkf2yq';

  it('stops at the confirmed balance while an incoming payment confirms', () => {
    expect(getSendLimit({confirmed: '10', pending: '5', total: '15'}, VRPC)).toBe('10');
  });

  it('is zero when the whole balance is still incoming', () => {
    expect(getSendLimit({confirmed: '0', pending: '2', total: '2'}, VRPC)).toBe('0');
  });

  it('uses the total after an own send lowered it', () => {
    // 10 confirmed, 3 sent with a 0.0001 fee, still in the mempool.
    expect(getSendLimit({confirmed: '10', pending: '-3.0001', total: '6.9999'}, VRPC)).toBe('6.9999');
  });

  it('uses the confirmed balance on the private card', () => {
    expect(getSendLimit({confirmed: '2', pending: '1', total: '3'}, 'dlight_private.zs1abc')).toBe('2');
  });

  it('keeps the total on other channels', () => {
    expect(getSendLimit({confirmed: '1', pending: '0.5', total: '1.5'}, 'electrum.RAddr.BTC')).toBe('1.5');
    expect(getSendLimit({confirmed: '1', pending: '0', total: '1'}, 'eth.0xabc.ETH')).toBe('1');
  });

  it('is zero without a balance entry', () => {
    expect(getSendLimit(undefined, VRPC)).toBe('0');
  });
});
