import { unpackOutput } from "@bitgo/utxo-lib/dist/src/smart_transactions";
import { getAddressMempool } from "./getAddressMempool";
import { getTransaction } from "./getTransaction";
import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getAddressUtxos = (systemId, addresses, includeFriendlyNames) => {
  return VrpcProvider.getEndpoint(systemId).getAddressUtxos({
    addresses,
    friendlynames: includeFriendlyNames,
  });
}

// The address-unspent index can still contain inputs spent in the mempool.
// Only exclude spent outpoints; mempool outputs have no scripts for funding.
export const excludeMempoolSpentUtxos = (utxos, mempool, transactions = []) => {
  const spent = new Set(
    mempool.filter(entry => entry.spending === true &&
      typeof entry.prevtxid === 'string' && entry.prevtxid.length > 0 &&
      Number.isInteger(entry.prevout) && entry.prevout >= 0)
      .map(entry => `${entry.prevtxid}:${entry.prevout}`),
  );

  // Token-only spends have zero native value, so verusd omits prevtxid/prevout.
  // Read all inputs, including those not represented by the address deltas.
  for (const transaction of transactions) {
    for (const input of transaction.vin) {
      spent.add(`${input.txid}:${input.vout}`);
    }
  }

  return utxos.filter(utxo => !spent.has(`${utxo.txid}:${utxo.outputIndex}`));
}

export const getMempoolUnspentUtxos = async (systemId, addresses, utxos) => {
  const message = 'Unable to check pending transactions. Try again before sending.';

  try {
    const res = await getAddressMempool(systemId, addresses, undefined, undefined, true);
    if (res.error || !Array.isArray(res.result)) throw new Error(message);
    if (res.result.some(entry => entry == null || typeof entry.spending !== 'boolean' ||
      (entry.spending === true && (typeof entry.txid !== 'string' || entry.txid.length === 0)))) {
      throw new Error(message);
    }

    const txids = [...new Set(res.result.filter(entry => entry.spending).map(entry => entry.txid))];
    const transactions = await Promise.all(txids.map(async txid => {
      const tx = await getTransaction(systemId, txid, 1, true);
      if (tx.error || !tx.result || !Array.isArray(tx.result.vin) || tx.result.vin.length === 0 ||
        tx.result.vin.some(input => input == null || typeof input.txid !== 'string' ||
          input.txid.length === 0 || !Number.isInteger(input.vout) || input.vout < 0)) {
        throw new Error(message);
      }
      return tx.result;
    }));

    return excludeMempoolSpentUtxos(utxos, res.result, transactions);
  } catch (_) {
    throw new Error(message);
  }
}

export const getSpendableUtxosWithMempoolInfo = async (systemId, currency, addresses) => {
  const utxosRes = await getAddressUtxos(systemId, addresses);

  if (utxosRes.error) throw new Error(utxosRes.error.message);

  const utxoList = []

  utxosRes.result.forEach((inputUtxo) => {
    if (inputUtxo.isspendable && 
      (inputUtxo.satoshis != 0 || 
        (inputUtxo.currencyvalues != null && Object.keys(inputUtxo.currencyvalues).includes(currency))
      )) {
      const _script = Buffer.from(inputUtxo.script, 'hex')
      const _value = inputUtxo.satoshis

      try {
        unpackOutput({ value: _value, script: _script }, systemId, true)
        utxoList.push(inputUtxo)
      } catch (e) {
        console.warn(e.message)
      }
    }
  })

  const utxos = await getMempoolUnspentUtxos(systemId, addresses, utxoList);

  return {utxos, mempoolSpentUtxoCount: utxoList.length - utxos.length};
}

export const getSpendableUtxos = async (systemId, currency, addresses) => {
  const {utxos} = await getSpendableUtxosWithMempoolInfo(systemId, currency, addresses);
  return utxos;
}
