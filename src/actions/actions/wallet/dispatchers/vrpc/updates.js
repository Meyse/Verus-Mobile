import BigNumber from "bignumber.js";
import { getAddressBalances, getAddressDeltas, getAddressMempool, getInfo } from "../../../../../utils/api/channels/vrpc/callCreators";
import { satsToCoins } from "../../../../../utils/math";
import { standardizeVrpcTxObj } from "../../../../../utils/standardization/standardizeTxObj";
import {finiteBalance} from '../../../../../utils/assets/assetIdentity';

export const updateVrpcBalances = async (coinObj, channelId, {vrpcRefresh} = {}) => {
  const [, iAddress, systemId] = channelId.split('.')

  const currencyId = coinObj.currency_id

  // The balance is the confirmed chain balance, as upstream reads it: one
  // getaddressbalance and no mempool read (owner, 2026-11-19, PR 266 review
  // R13). Unconfirmed transactions show only as "Pending" history rows.
  const res = await (vrpcRefresh
    ? vrpcRefresh.getBalance(channelId)
    : getAddressBalances(systemId, [iAddress]));
  if (res.error) throw new Error(res.error.message);

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

  const balance = currencies[currencyId] || '0';

  return {
    chainTicker: coinObj.id,
    channel: channelId,
    assetDiscovery: {systemId, address: iAddress, testnet: Boolean(coinObj.testnet), currencies},
    body: {
      confirmed: balance,
      pending: '0',
      total: balance,
    },
  };
}

export const updateVrpcTransactions = async (coinObj, channelId, {vrpcRefresh} = {}) => {
  const [, iAddress, systemId] = channelId.split('.');

  // These reads have independent inputs. A coordinated refresh supplies them
  // from one planned batch; standalone callers can start all three immediately.
  // Mempool remains best effort so a temporary failure does not hide history.
  const [deltasRes, infoRes, mempoolRes] = await (vrpcRefresh
    ? vrpcRefresh.getTransactions(channelId)
    : Promise.all([
      getAddressDeltas(systemId, [iAddress], true, 1),
      getInfo(systemId),
      Promise.resolve()
        .then(() => getAddressMempool(systemId, [iAddress], true, 1))
        .catch(error => ({error})),
    ]));

  const currencyId = coinObj.currency_id;
  const isNative = currencyId === systemId;

  if (deltasRes.error) throw new Error(deltasRes.error.message);

  let txs = deltasRes.result;

  try {
    if (mempoolRes.error) throw new Error(mempoolRes.error.message);

    txs = [
      ...mempoolRes.result.map(delta => ({...delta, mempool: true})),
      ...txs,
    ];
  } catch (error) {
    console.error(error);
  }

  const grouped = new Map();
  const confirmedTxids = new Set(txs.filter(tx => !tx.mempool).map(tx => tx.txid));

  // Group by identity, not index order. Keep spend metadata even when the
  // last delta is change. Prefer confirmed data if the two RPC snapshots overlap.
  for (const delta of txs) {
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

  const formattedDeltas = [...grouped.values()]
    .filter(tx => !BigNumber(tx.amount).isZero())
    .map(tx =>
      standardizeVrpcTxObj(
        tx,
        coinObj,
        infoRes.result ? infoRes.result.longestchain : null,
        systemId,
      ),
    );

  return {
    chainTicker: coinObj.id,
    channel: channelId,
    body: formattedDeltas,
  };
};
