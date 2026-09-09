import BigNumber from "bignumber.js";
import { getAddressBalances, getAddressDeltas, getAddressMempool, getInfo } from "../../../../../utils/api/channels/vrpc/callCreators";
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

  const totalBalance = currencies[currencyId] || '0';

  return {
    chainTicker: coinObj.id,
    channel: channelId,
    assetDiscovery: {systemId, address: iAddress, testnet: Boolean(coinObj.testnet), currencies},
    body: {
      confirmed: totalBalance,
      pending: '0',
      total: totalBalance,
    },
  };
}

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
  
  const formattedDeltas = []

  // Format address deltas to account for change
  for (let i = 0; i < txs.length; i++) {
    let deltaValue = BigNumber(0)

    const {currencyvalues, satoshis, txid} = txs[i];

    if (isNative) deltaValue = satsToCoins(BigNumber(satoshis))
    else if (currencyvalues && currencyvalues[currencyId]) {
      deltaValue = BigNumber(currencyvalues[currencyId])
    }

    // Deltas are returned in array where those that share txids are next to
    // eachother
    for (
      let j = i + 1;
      j < txs.length && txs[j].txid === txid;
      j++
    ) {
      i++;

      if (isNative) deltaValue = deltaValue.plus(satsToCoins(BigNumber(txs[j].satoshis)))
      else if (txs[j].currencyvalues && txs[j].currencyvalues[currencyId]) {
        deltaValue = deltaValue.plus(txs[j].currencyvalues[currencyId])
      }
    }

    if (!deltaValue.isEqualTo(0)) {
      formattedDeltas.push(
        standardizeVrpcTxObj(
          {
            ...txs[i],
            amount: deltaValue.toString(),
          },
          coinObj,
          infoRes.result ? infoRes.result.longestchain : null,
        ),
      );
    }
  }

  return {
    chainTicker: coinObj.id,
    channel: channelId,
    body: formattedDeltas,
  };
};
