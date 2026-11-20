import BigNumber from 'bignumber.js';
import {RESERVE_TRANSFER_DESTINATION} from 'verus-typescript-primitives';
import VrpcProvider from '../vrpc/vrpcInterface';
import {getAddressDeltas} from '../api/channels/vrpc/requests/getAddressDeltas';
import {getAddressMempool} from '../api/channels/vrpc/requests/getAddressMempool';
import {getDisplayInfo} from '../api/channels/vrpc/requests/getInfo';
import {getTransaction} from '../api/channels/vrpc/requests/getTransaction';

// Pre-launch facts change slowly. Short caches keep Home, the asset screen and
// the wizard from asking the same server again while one person moves
// between them.
const HEIGHT_TTL = 30 * 1000;
const FETCH_CONCURRENCY = 4;

const heights = new Map();
// "systemId:currencyId" → true (pre-launch) or false, from the last check.
const prelaunchStates = new Map();
// The own pre-conversions of the last asset-screen read, so Home can show
// their total without reading them (audit row 3). The key holds the card
// addresses, so another profile never sees them. Memory only: they link to
// the wallet.
const savedPreconversions = new Map();
const preconversionKey = (systemId, currencyId, addresses) =>
  `${systemId}:${currencyId}:${[...new Set(addresses || [])].sort().join(',')}`;
// Decoded (unfiltered) transfers of confirmed transactions never change.
const confirmedTransfers = new Map();
const definitionHeights = new Map();

const remember = (cache, key, ttl, load) => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.at < ttl) return cached.promise;
  const entry = {at: Date.now(), promise: null, value: undefined};
  entry.promise = Promise.resolve().then(load);
  cache.set(key, entry);
  entry.promise.then(
    value => {
      entry.value = value;
    },
    () => {
      if (cache.get(key) === entry) cache.delete(key);
    },
  );
  return entry.promise;
};

// The last loaded value, without a request, so a screen can draw its final
// layout at once when another screen already loaded it.
const peek = (cache, key) => cache.get(key)?.value;
export const peekChainHeight = systemId => peek(heights, systemId);
export const peekPrelaunchState = (systemId, currencyId) =>
  prelaunchStates.has(`${systemId}:${currencyId}`)
    ? prelaunchStates.get(`${systemId}:${currencyId}`)
    : null;
export const peekSavedPreconversions = (systemId, currencyId, addresses) =>
  savedPreconversions.get(preconversionKey(systemId, currencyId, addresses)) ?? null;
export const savePreconversions = (systemId, currencyId, addresses, preconversions) => {
  if (preconversions == null) return;
  savedPreconversions.set(preconversionKey(systemId, currencyId, addresses), preconversions);
};

const resultOf = response => {
  if (response?.error) throw new Error(response.error.message || 'Request failed.');
  return response?.result;
};


// For launch countdowns only. It can be up to one minute old (F10), so never
// use it to build or check a transaction.
export const getChainHeight = systemId =>
  remember(heights, systemId, HEIGHT_TTL, async () => {
    const info = resultOf(await getDisplayInfo(systemId));
    const height = Number(info?.longestchain || info?.blocks);
    if (!Number.isFinite(height) || height <= 0) throw new Error('Block height unavailable.');
    return height;
  });

// Currency ID → {currencydefinition} for the given currencies of this system
// that are still before their start block (PR 266 audit row 3). It reads each
// currency's saved definition (F10) and the block height, never the list of
// all pre-launch currencies (`listcurrencies`). A start block at or below any
// known height means launched: a launch never goes back, so an older height
// is enough and no height is read. The definition has `currencynames`.
export const getPrelaunchEntries = async (systemId, currencyIds) => {
  const endpoint = VrpcProvider.getEndpoint(systemId);
  const definitions = (await Promise.all(
    [...new Set(currencyIds)].map(currencyId =>
      endpoint.getCurrencyDefinition(currencyId)
        .then(response => {
          const result = resultOf(response);
          return result?.currencyid === currencyId ? result : null;
        })
        .catch(() => null),
    ),
  )).filter(Boolean);
  const startBlock = definition => Number(definition.startblock);
  const known = peekChainHeight(systemId);
  const height = definitions.some(definition =>
    Number.isFinite(startBlock(definition)) && startBlock(definition) > (known || 0))
    ? await getChainHeight(systemId)
    : known;
  const entries = new Map();
  definitions.forEach(definition => {
    const prelaunch = Number.isFinite(startBlock(definition)) && startBlock(definition) > height;
    prelaunchStates.set(`${systemId}:${definition.currencyid}`, prelaunch);
    if (prelaunch) entries.set(definition.currencyid, {currencydefinition: definition});
  });
  return entries;
};

const reserveTransferAddress = RESERVE_TRANSFER_DESTINATION.getAddressString();

const paysReserveTransfer = delta =>
  (delta?.sent?.outputs || []).some(output =>
    [].concat(output?.addresses || []).includes(reserveTransferAddress),
  );

// Every pre-conversion inside one verbose transaction, unfiltered. This is a
// fact of the transaction, so a confirmed one can be cached for any query.
const decodePreconversions = transaction =>
  (transaction?.vout || []).flatMap((output, index) => {
    const transfer = output?.scriptPubKey?.reservetransfer;
    if (!transfer?.preconvert || transfer.refund) return [];
    return Object.entries(transfer.currencyvalues || {})
      .filter(([, amount]) => BigNumber(amount).isGreaterThan(0))
      .map(([currencyId, amount]) => ({
        txid: transaction.txid,
        vout: index,
        targetId: transfer.destinationcurrencyid,
        currencyId,
        destination: transfer.destination?.address,
        amount: BigNumber(amount).toFixed(),
      }));
  });

// Only transfers that pay one of `addresses` count: the new currency, and any
// refund, go to that address.
const matchesQuery = ({targetIds, addresses}) => transfer =>
  targetIds.has(transfer.targetId) && addresses.includes(transfer.destination);

// The block of a currency's definition. No pre-conversion can be older.
const getDefinitionHeight = async (systemId, entry) => {
  const txid = entry?.currencydefinition?.definitiontxid;
  if (!txid) return null;
  const key = `${systemId}:${txid}`;
  if (!definitionHeights.has(key)) {
    definitionHeights.set(
      key,
      getTransaction(systemId, txid, 1)
        .then(response => {
          const height = Number(resultOf(response)?.height);
          return Number.isFinite(height) && height > 0 ? height : null;
        })
        .catch(() => {
          definitionHeights.delete(key);
          return null;
        }),
    );
  }
  return definitionHeights.get(key);
};

// The cache holds the unfiltered transfers per transaction. Each query applies
// its own assets and addresses, so a query for other assets or addresses
// never reuses another query's filtered result.
const loadTransfers = async (systemId, txid, mempool, match) => {
  const key = `${systemId}:${txid}`;
  let transfers = mempool ? null : confirmedTransfers.get(key);
  if (!transfers) {
    const transaction = resultOf(await getTransaction(systemId, txid, 1, mempool));
    transfers = decodePreconversions(transaction);
    if (!mempool && Number(transaction?.confirmations) > 0) {
      confirmedTransfers.set(key, transfers);
    }
  }
  return transfers.filter(matchesQuery(match));
};

const mapLimited = async (items, limit, task) => {
  const results = [];
  let next = 0;
  const workers = Array.from({length: Math.min(limit, items.length)}, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  });
  await Promise.all(workers);
  return results;
};

// The pre-conversions that `addresses` sent to the given pre-launch
// currencies, read from the blockchain, so they show on every device and after
// a restore. Unconfirmed ones come first, as `pending`.
export const getOwnPreconversions = async (systemId, addresses, prelaunchEntries) => {
  const targets = new Map(
    [...prelaunchEntries].filter(([currencyId]) => currencyId),
  );
  const ownAddresses = [...new Set((addresses || []).filter(Boolean))];
  if (targets.size === 0 || ownAddresses.length === 0) return [];

  const [deltasResponse, mempoolResponse] = await Promise.all([
    getAddressDeltas(systemId, ownAddresses, false, 1),
    getAddressMempool(systemId, ownAddresses, false, 1, true).catch(() => null),
  ]);
  const deltas = resultOf(deltasResponse) || [];
  const mempool = mempoolResponse?.error ? [] : mempoolResponse?.result || [];
  const definitionHeightList = await Promise.all(
    [...targets.values()].map(entry => getDefinitionHeight(systemId, entry)),
  );
  const oldest = definitionHeightList.some(height => height == null)
    ? null
    : Math.min(...definitionHeightList);

  const candidates = new Map();
  for (const delta of deltas) {
    if (!paysReserveTransfer(delta)) continue;
    if (oldest != null && Number(delta.height) < oldest) continue;
    candidates.set(delta.txid, {
      txid: delta.txid,
      pending: false,
      height: delta.height,
      timestamp: delta.blocktime || delta.timestamp || null,
    });
  }
  for (const delta of mempool) {
    if (!paysReserveTransfer(delta) || candidates.has(delta.txid)) continue;
    candidates.set(delta.txid, {
      txid: delta.txid,
      pending: true,
      height: null,
      timestamp: delta.timestamp || null,
    });
  }

  const match = {targetIds: new Set(targets.keys()), addresses: ownAddresses};
  const found = await mapLimited([...candidates.values()], FETCH_CONCURRENCY, async candidate => {
    try {
      const transfers = await loadTransfers(systemId, candidate.txid, candidate.pending, match);
      return transfers.map(transfer => ({...candidate, ...transfer}));
    } catch (error) {
      return [];
    }
  });

  return found
    .flat()
    .sort((first, second) =>
      first.pending !== second.pending
        ? first.pending ? -1 : 1
        : Number(second.timestamp || 0) - Number(first.timestamp || 0),
    );
};

// Total pre-converted per paid currency: [{currencyId, amount}].
export const totalPreconverted = preconversions => {
  const totals = new Map();
  (preconversions || []).forEach(item => {
    totals.set(
      item.currencyId,
      BigNumber(totals.get(item.currencyId) || 0).plus(item.amount),
    );
  });
  return [...totals.entries()].map(([currencyId, amount]) => ({
    currencyId,
    amount: amount.toFixed(),
  }));
};
