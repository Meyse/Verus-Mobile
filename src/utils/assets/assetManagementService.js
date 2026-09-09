import store from '../../store';
import {
  ASSETS_HYDRATED,
  ASSETS_HYDRATION_FAILED,
  ASSET_RESOLVED,
  ASSET_PREFERENCES_SAVED,
  ASSET_DISCOVERY_SAVED,
} from '../../reducers/assetManagement';
import {
  captureSessionScope,
  scopeSessionAction,
  sessionScopeIsCurrent,
} from '../../actions/actions/updates/sessionRequests';
import {modifyServiceStoredDataForUser} from '../../actions/actions/services/dispatchers/services';
import {requestServiceStoredData} from '../auth/authBox';
import {CoinDirectory} from '../CoinData/CoinDirectory';
import {coinsList} from '../CoinData/CoinsList';
import {addResolvedAsset, resolveAssetIdentifier} from '../CoinData/assetIdentifierService';
import {API_GET_BALANCES} from '../constants/intervalConstants';
import {
  assetKey,
  assetNetworkKey,
  getPositiveVrpcHoldings,
  isTestnetAccount,
  matchesVrpcHolding,
  sameAsset,
  ethereumNetwork,
} from './assetIdentity';

const STORAGE_ID = 'wallet_asset_management';
const RETRY_DELAY = 60000;
const MAX_LOOKUPS_PER_PASS = 12;
const hydrations = new Map();
const discoveryJobs = new Map();
let additionQueue = Promise.resolve();

export const captureAssetContext = () => {
  const state = store.getState();
  return {
    sessionScope: captureSessionScope(state),
    networkKey: assetNetworkKey(state.authentication.activeAccount),
  };
};

export const assetContextIsCurrent = context => {
  const state = store.getState();
  return state.authentication.signedIn &&
    context?.sessionScope?.accountHash != null &&
    sessionScopeIsCurrent(state, context.sessionScope) &&
    assetNetworkKey(state.authentication.activeAccount) === context.networkKey;
};

const assertCurrent = context => {
  if (!assetContextIsCurrent(context)) {
    const error = new Error('The active wallet changed.');
    error.code = 'SESSION_CHANGED';
    throw error;
  }
};

const contextKey = context =>
  `${context.sessionScope.accountHash}:${context.sessionScope.sessionEpoch}:${context.networkKey}`;

const dispatchForContext = (context, type, payload) => {
  assertCurrent(context);
  store.dispatch(scopeSessionAction({type, payload}, context.sessionScope));
};

export const loadAssetManagement = async (context = captureAssetContext()) => {
  assertCurrent(context);
  const current = store.getState().assetManagement;
  if (current.ready && current.networkKey === context.networkKey) return;
  const key = contextKey(context);
  if (hydrations.has(key)) return hydrations.get(key);
  const loading = (async () => {
    try {
      const saved = await requestServiceStoredData(STORAGE_ID);
      assertCurrent(context);
      if (saved.version != null && saved.version !== 1) {
        throw new Error('Asset preferences version unavailable');
      }
      dispatchForContext(context, ASSETS_HYDRATED, {
        ...(saved.networks?.[context.networkKey] || {}),
        networkKey: context.networkKey,
      });
    } catch (error) {
      if (assetContextIsCurrent(context)) {
        dispatchForContext(context, ASSETS_HYDRATION_FAILED);
      }
      throw error;
    } finally {
      hydrations.delete(key);
    }
  })();
  hydrations.set(key, loading);
  return loading;
};

const updateStoredAssets = (context, update) => {
  assertCurrent(context);
  return modifyServiceStoredDataForUser(
    saved => {
      assertCurrent(context);
      if (saved.version != null && saved.version !== 1) {
        throw new Error('Asset preferences version unavailable');
      }
      return {
        ...saved,
        version: 1,
        networks: {
          ...saved.networks,
          [context.networkKey]: update(saved.networks?.[context.networkKey] || {}),
        },
      };
    },
    STORAGE_ID,
    context.sessionScope.accountHash,
    context,
  );
};

export const setAssetHomeVisibility = async (
  coin,
  shown,
  context = captureAssetContext(),
) => {
  await loadAssetManagement(context);
  assertCurrent(context);
  const saved = await updateStoredAssets(context, current => ({
    ...current,
    preferences: {
      ...current.preferences,
      [assetKey(coin)]: {hidden: !shown},
    },
  }));
  dispatchForContext(context, ASSET_PREFERENCES_SAVED, {
    preferences: saved.networks[context.networkKey].preferences,
  });
};

// Only consider channels still belonging to the current wallet's cards.
export const currentAssetSnapshots = state => {
  const channels = new Set(Object.values(state.coinMenus.allSubWallets || {})
    .flatMap(cards => cards.map(card => card.api_channels?.[API_GET_BALANCES])));
  const testnet = isTestnetAccount(state.authentication.activeAccount);
  return Object.fromEntries(Object.entries(state.assetManagement.snapshots)
    .filter(([channel, snapshot]) => channels.has(channel) &&
      Boolean(snapshot.testnet) === testnet));
};

export const getNewAssetHoldings = state => {
  if (!state.assetManagement.ready) return [];
  const active = state.coins.activeCoinsForUser || [];
  return getPositiveVrpcHoldings(currentAssetSnapshots(state))
    .filter(holding => !active.some(coin => matchesVrpcHolding(coin, holding)))
    .map(holding => ({...holding, result: state.assetManagement.resolved[holding.key]}))
    .filter(holding => holding.result != null && !holding.result.catalogueMatch);
};

export const addManagedAsset = ({
  coin,
  result,
  automatic = false,
  context = captureAssetContext(),
}) => {
  const operation = additionQueue.catch(() => {}).then(async () => {
    await loadAssetManagement(context);
    assertCurrent(context);
    let state = store.getState();
    const existing = (state.coins.activeCoinsForUser || []).find(item =>
      coin ? sameAsset(item, coin) : result.kind === 'pbaas'
        ? matchesVrpcHolding(item, {
          currencyId: result.currencyDefinition.currencyid,
          testnet: result.testnet,
        })
        : item.proto === 'erc20' && ethereumNetwork(item) === result.network &&
          item.currency_id?.toLowerCase() === result.canonicalAddress.toLowerCase());
    if (existing) {
      if (!automatic) await setAssetHomeVisibility(existing, true, context);
      return existing;
    }
    const resolved = result || {
      kind: coin.proto === 'erc20' ? 'erc20' : 'catalogue',
      coinData: CoinDirectory.findCoinObj(coin.id),
      catalogueMatch: coin,
      network: ethereumNetwork(coin),
      canonicalAddress: coin.currency_id,
      testnet: Boolean(coin.testnet),
    };
    state = store.getState();
    const added = await addResolvedAsset({
      activeAccount: state.authentication.activeAccount,
      activeCoinList: state.coins.activeCoinList,
      activeCoins: state.coins.activeCoinsForUser,
      dispatch: store.dispatch,
      requestContext: {...context, assertCurrent: () => assertCurrent(context)},
      result: resolved,
    });
    assertCurrent(context);
    if (!automatic) await setAssetHomeVisibility(added, true, context);
    return added;
  });
  additionQueue = operation.catch(() => {});
  return operation;
};

const findCatalogueHolding = holding => {
  const entry = Object.values(coinsList).find(coin => matchesVrpcHolding(coin, holding));
  return entry ? CoinDirectory.findCoinObj(entry.id) : null;
};

const persistDiscovery = async context => {
  assertCurrent(context);
  const {revision, persistedRevision, snapshots, resolved} = store.getState().assetManagement;
  if (revision === persistedRevision) return;
  await updateStoredAssets(context, saved => ({...saved, snapshots, resolved}));
  dispatchForContext(context, ASSET_DISCOVERY_SAVED, {revision});
};

const discoverAssets = async (context, job) => {
  await loadAssetManagement(context);
  assertCurrent(context);
  const holdings = getPositiveVrpcHoldings(currentAssetSnapshots(store.getState()));
  let lookups = 0;
  for (const holding of holdings) {
    assertCurrent(context);
    const active = store.getState().coins.activeCoinsForUser || [];
    if (active.some(coin => matchesVrpcHolding(coin, holding))) continue;
    if ((job.retryAfter[holding.key] || 0) > Date.now()) continue;
    try {
      const catalogueCoin = findCatalogueHolding(holding);
      if (catalogueCoin) {
        await addManagedAsset({coin: catalogueCoin, automatic: true, context});
        continue;
      }
      if (store.getState().assetManagement.resolved[holding.key]) continue;
      if (lookups++ >= MAX_LOOKUPS_PER_PASS) break;
      const result = await resolveAssetIdentifier({
        activeCoins: [],
        identifier: holding.currencyId,
        pbaasCoin: {system_id: holding.systemId, testnet: holding.testnet},
        kind: 'pbaas',
      });
      assertCurrent(context);
      dispatchForContext(context, ASSET_RESOLVED, {key: holding.key, result});
    } catch (error) {
      assertCurrent(context);
      // Failed metadata/activation can retry on a later automatic balance update.
      // No wallet data or raw provider errors are logged or exposed here.
      job.retryAfter[holding.key] = Date.now() + RETRY_DELAY;
    }
  }
  await persistDiscovery(context);
};

export const scheduleAssetDiscovery = () => {
  const context = captureAssetContext();
  if (!assetContextIsCurrent(context)) return;
  const key = contextKey(context);
  let job = discoveryJobs.get(key);
  if (job?.running) {
    job.pending = true;
    return;
  }
  // Drop data from completed jobs for other wallet sessions.
  for (const [oldKey, oldJob] of discoveryJobs) {
    if (oldKey !== key && !oldJob.running) discoveryJobs.delete(oldKey);
  }
  job = job || {retryAfter: {}};
  job.running = true;
  discoveryJobs.set(key, job);
  (async () => {
    try {
      do {
        job.pending = false;
        await discoverAssets(context, job);
      } while (job.pending && assetContextIsCurrent(context));
    } catch (_) {
      // Keep saved choices and last available data when storage/session is unavailable.
    } finally {
      job.running = false;
      if (!assetContextIsCurrent(context)) discoveryJobs.delete(key);
    }
  })();
};
