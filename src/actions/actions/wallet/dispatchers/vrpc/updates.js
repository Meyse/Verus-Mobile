import BigNumber from "bignumber.js";
import { getAddressBalances, getAddressDeltas, getAddressMempool, getInfo, getTransaction } from "../../../../../utils/api/channels/vrpc/callCreators";
import { getCurrency } from "../../../../../utils/api/channels/verusid/requests/getCurrency";
import { RESERVE_TRANSFER_DESTINATION } from "verus-typescript-primitives";
import { satsToCoins } from "../../../../../utils/math";
import { standardizeVrpcTxObj } from "../../../../../utils/standardization/standardizeTxObj";
import {finiteBalance} from '../../../../../utils/assets/assetIdentity';

export const updateVrpcBalances = async (coinObj, channelId) => {
  const [channelName, iAddress, systemId] = channelId.split('.')

  const currencyId = coinObj.currency_id
  
  const res = await getAddressBalances(systemId, [iAddress])

  if (res.error) throw new Error(res.error.message)

  // A missing/malformed response is unavailable, not an empty wallet. Retain
  // the complete map for discovery on this exact address/system channel.
  const nativeBalance = finiteBalance(res.result?.balance);
  const currencyBalances = res.result?.currencybalance || {};
  if (nativeBalance == null || typeof currencyBalances !== 'object' ||
      Array.isArray(currencyBalances)) {
    throw new Error('Balance response unavailable');
  }
  const currencies = {};
  for (const [id, value] of Object.entries(currencyBalances)) {
    const balance = finiteBalance(value);
    if (balance == null) throw new Error('Currency balance unavailable');
    currencies[id] = balance.toString();
  }
  currencies[systemId] = satsToCoins(nativeBalance).toString();

  const confirmedBalance = currencies[currencyId] || '0';
  const mempoolRes = await getAddressMempool(systemId, [iAddress], false, 1);
  if (mempoolRes.error) throw new Error(mempoolRes.error.message);
  if (!Array.isArray(mempoolRes.result)) throw new Error('Mempool response unavailable');

  // Native deltas are signed satoshis. Reserve deltas are signed coin amounts.
  // Use satoshis for the system currency so currencyvalues cannot count it twice.
  for (const delta of mempoolRes.result) {
    if (delta?.satoshis == null || delta.satoshis === '' || typeof delta.satoshis === 'boolean' ||
        !BigNumber(delta.satoshis).isFinite() ||
        !BigNumber(delta.satoshis).isInteger()) {
      throw new Error('Mempool balance unavailable');
    }
    const reserves = delta.currencyvalues || {};
    if (typeof reserves !== 'object' || Array.isArray(reserves)) {
      throw new Error('Mempool currency balance unavailable');
    }
    const changes = {...reserves, [systemId]: satsToCoins(BigNumber(delta.satoshis)).toString()};
    for (const [id, value] of Object.entries(changes)) {
      if (value == null || value === '' || typeof value === 'boolean' ||
          !BigNumber(value).isFinite()) {
        throw new Error('Mempool currency balance unavailable');
      }
      currencies[id] = BigNumber(currencies[id] || 0).plus(value).toString();
    }
  }
  // Inconsistent chain/mempool snapshots must not replace a known balance.
  if (Object.values(currencies).some(value => finiteBalance(value) == null)) {
    throw new Error('Balance response inconsistent with mempool');
  }
  const totalBalance = currencies[currencyId] || '0';

  return {
    chainTicker: coinObj.id,
    channel: channelId,
    assetDiscovery: {systemId, address: iAddress, testnet: Boolean(coinObj.testnet), currencies},
    body: {
      confirmed: confirmedBalance,
      pending: BigNumber(totalBalance).minus(confirmedBalance).toString(),
      total: totalBalance,
    },
  };
}

// A transaction never changes, so each one is read for import data once.
const importLookups = new Map();
// Bounds the extra reads in one update. A long history fills in over later updates.
const MAX_IMPORT_LOOKUPS = 25;

const isReceipt = tx => !tx.sent && BigNumber(tx.amount).isGreaterThan(0);

// The chain pays conversion proceeds in a later import transaction, so the received
// delta shows no sign of the conversion. Only the transaction itself shows it.
const readImport = async (systemId, txid) => {
  if (importLookups.has(txid)) return importLookups.get(txid);

  const raw = await getTransaction(systemId, txid, 1);
  if (raw.error || raw.result?.txid !== txid) throw new Error('Transaction unavailable');

  const imported = raw.result.vout
    .map(output => output.scriptPubKey?.crosschainimport)
    .find(Boolean);
  const details = imported
    ? {sourceSystemId: imported.sourcesystemid, valueIn: Object.keys(imported.valuein || {})}
    : null;

  importLookups.set(txid, details);
  return details;
};

const resolveCurrencyName = async (systemId, currencyId, currencyNames) => {
  if (currencyNames[currencyId]) return currencyNames[currencyId];

  try {
    const currency = await getCurrency(systemId, currencyId);
    if (!currency.error && currency.result?.currencyid === currencyId && currency.result.fullyqualifiedname) {
      currencyNames[currencyId] = currency.result.fullyqualifiedname;
      return currencyNames[currencyId];
    }
  } catch (e) {
    // A name is optional. The currency ID stands in for it.
  }

  return currencyId;
};

export const updateVrpcTransactions = async (coinObj, channelId) => {
  const [channelName, iAddress, systemId] = channelId.split('.')

  const deltasRes = await getAddressDeltas(systemId, [iAddress], true, 1)
  const infoRes = await getInfo(systemId)
  const currencyId = coinObj.currency_id
  const isNative = currencyId === systemId

  if (deltasRes.error) throw new Error(deltasRes.error.message)

  let txs = deltasRes.result

  try {
    const mempoolRes = await getAddressMempool(systemId, [iAddress], true, 1)

    if (mempoolRes.error) throw new Error(mempoolRes.error.message)

    txs = [
      ...mempoolRes.result.map(x => {
        return {...x, mempool: true};
      }),
      ...txs,
    ];
  } catch(e) {
    console.error(e)
  }
  
  const grouped = new Map();
  const currencyNames = {};
  const confirmedTxids = new Set(txs.filter(tx => !tx.mempool).map(tx => tx.txid));

  // Group by identity, not index order. Keep spend metadata even when the
  // last delta is change. Prefer confirmed data if the two RPC snapshots overlap.
  for (const delta of txs) {
    Object.assign(currencyNames, delta.currencynames);
    if (delta.mempool && confirmedTxids.has(delta.txid)) continue;

    const previous = grouped.get(delta.txid);
    const value = isNative
      ? satsToCoins(BigNumber(delta.satoshis))
      : BigNumber(delta.currencyvalues?.[currencyId] || 0);
    grouped.set(delta.txid, {
      ...delta,
      sent: delta.sent || previous?.sent,
      timestamp: previous?.timestamp ?? delta.timestamp,
      amount: BigNumber(previous?.amount || 0).plus(value).toString(),
    });
  }

  // Newest first, so recent conversions are labeled before older ones.
  const unread = [...grouped.values()]
    .filter(tx => isReceipt(tx) && !importLookups.has(tx.txid))
    .sort((a, b) => (b.height || Number.MAX_SAFE_INTEGER) - (a.height || Number.MAX_SAFE_INTEGER))
    .slice(0, MAX_IMPORT_LOOKUPS);
  // A failed read leaves the row as a plain receipt. The next update tries again.
  await Promise.all(unread.map(tx => readImport(systemId, tx.txid).catch(() => {})));

  const reserveTransferAddress = RESERVE_TRANSFER_DESTINATION.getAddressString();
  const formattedDeltas = await Promise.all(
    [...grouped.values()].filter(tx => !BigNumber(tx.amount).isZero()).map(async tx => {
      // The address index only identifies the reserve-transfer output. Decode
      // its intent from the transaction; ordinary sends need no extra RPC.
      const hasReserveTransfer = tx.sent?.outputs?.some(output =>
        Array.isArray(output.addresses)
          ? output.addresses.includes(reserveTransferAddress)
          : output.addresses === reserveTransferAddress,
      );
      if (BigNumber(tx.amount).isNegative() && hasReserveTransfer) {
        try {
          const raw = await getTransaction(systemId, tx.txid, 1);
          if (raw.error || raw.result?.txid !== tx.txid) throw new Error('Transaction unavailable');
          const transfers = raw.result.vout
            .map(output => output.scriptPubKey?.reservetransfer)
            .filter(Boolean);
          // Do not summarize a multi-transfer transaction as one conversion.
          if (transfers.length === 1 && transfers[0].convert === true) {
            const transfer = transfers[0];
            const targetCurrencyId = transfer.destinationcurrencyid;
            if (targetCurrencyId) {
              tx.conversion = {
                targetCurrencyId,
                targetCurrencyName: await resolveCurrencyName(systemId, targetCurrencyId, currencyNames),
                destination: transfer.destination?.address,
              };
            }
          }
        } catch (e) {
          // Optional metadata must not remove an otherwise valid history row.
        }
      }

      // An import from the wallet's own system only carries reserve transfers
      // for conversions. An import from another system could be a plain bridge
      // arrival, so it is not labeled.
      const imported = isReceipt(tx) ? importLookups.get(tx.txid) : null;
      if (imported && imported.sourceSystemId === systemId) {
        tx.conversionProceeds = {};
        // The imported value lists the source currency. It also lists the fee
        // currency, so a single other currency is the only safe name.
        const sourceIds = imported.valueIn.filter(id => id !== currencyId);
        if (sourceIds.length === 1) {
          tx.conversionProceeds.sourceCurrencyId = sourceIds[0];
          tx.conversionProceeds.sourceCurrencyName =
            await resolveCurrencyName(systemId, sourceIds[0], currencyNames);
        }
      }

      return standardizeVrpcTxObj(
        tx,
        coinObj,
        infoRes.result ? infoRes.result.longestchain : null,
      );
    }),
  );

  return {
    chainTicker: coinObj.id,
    channel: channelId,
    body: formattedDeltas,
  };
};
