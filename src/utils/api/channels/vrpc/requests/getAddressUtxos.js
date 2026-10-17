import { unpackOutput } from "@bitgo/utxo-lib/dist/src/smart_transactions";
import { getAddressMempool } from "./getAddressMempool";
import VrpcProvider from "../../../../vrpc/vrpcInterface"

export const getAddressUtxos = (systemId, addresses, includeFriendlyNames) => {
  return VrpcProvider.getEndpoint(systemId).getAddressUtxos({
    addresses,
    friendlynames: includeFriendlyNames,
  });
}

// The address-unspent index can still contain inputs spent in the mempool.
// Only exclude spent outpoints; mempool outputs have no scripts for funding.
export const excludeMempoolSpentUtxos = (utxos, mempool) => {
  const spent = new Set(
    mempool.filter(entry => entry.spending === true)
      .map(entry => `${entry.prevtxid}:${entry.prevout}`),
  );

  return utxos.filter(utxo => !spent.has(`${utxo.txid}:${utxo.outputIndex}`));
}

export const getMempoolUnspentUtxos = async (systemId, addresses, utxos) => {
  const message = 'Unable to check pending transactions. Try again before sending.';

  try {
    const res = await getAddressMempool(systemId, addresses, undefined, undefined, true);
    if (res.error || !Array.isArray(res.result)) throw new Error(message);
    if (res.result.some(entry => entry == null || typeof entry.spending !== 'boolean' ||
      (entry.spending === true && (typeof entry.prevtxid !== 'string' || entry.prevtxid.length === 0 ||
        !Number.isInteger(entry.prevout) || entry.prevout < 0)))) {
      throw new Error(message);
    }

    return excludeMempoolSpentUtxos(utxos, res.result);
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
