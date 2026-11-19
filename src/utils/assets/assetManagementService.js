import {unstable_batchedUpdates} from 'react-native';
import store from '../../store';
import {
  ASSETS_HYDRATED,
  ASSETS_HYDRATION_FAILED,
  ASSET_RESOLVED,
  ASSET_PREFERENCES_SAVED,
  ASSET_DISCOVERY_SAVED,
  ASSET_REMOVALS_SAVED,
  ASSET_REVIEWS_SAVED,
  ASSET_ORDER_SAVED,
  ASSET_SORT_SAVED,
} from '../../reducers/assetManagement';
import {removeExistingCoin, setUserCoins} from '../../actions/actionCreators';
import {refreshLifecyclesAfterAssetChange} from '../../actions/actions/intervals/dispatchers/lifecycleManager';
import {
  captureSessionScope,
  scopeSessionAction,
  sessionScopeIsCurrent,
} from '../../actions/actions/updates/sessionRequests';
import {CoinDirectory} from '../CoinData/CoinDirectory';
import {addResolvedAsset, resolveAssetIdentifier} from '../CoinData/assetIdentifierService';
import {API_GET_BALANCES} from '../constants/intervalConstants';
import {removedAssetRecord} from './removedAssets';
import {orderWithAddedAsset, readAssetOrder, readHomeSort} from './assetOrder';
import {resolvedAssetCoin} from './assetPresentation';
import {
  loadAssetDiscoveryCache,
  saveAssetDiscoveryCache,
} from './assetDiscoveryCache';
import {
  ASSET_CHOICES_SERVICE_ID,
  choicesOnly,
  choicesRecord,
  loadAssetChoices,
  queueAssetChoicesChange,
  takeNewAssetChoices,
} from './assetChoicesStorage';
import {
  assetKey,
  assetNetworkKey,
  getPositiveVrpcHoldings,
  isAssetShown,
  isMainAsset,
  isTestnetAccount,
  matchesVrpcHolding,
  removalKey,
  sameAsset,
  ethereumNetwork,
} from './assetIdentity';

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

// Older builds kept the discovery cache inside the choices record. Copy it
// out before the next choices write drops it there.
const moveSavedDiscovery = async (saved, accountHash) => {
  try {
    for (const [networkKey, network] of Object.entries(saved.networks || {})) {
      if (network?.snapshots == null && network?.resolved == null) continue;
      if (await loadAssetDiscoveryCache(accountHash, networkKey)) continue;
      await saveAssetDiscoveryCache(accountHash, networkKey, network);
    }
  } catch (_) {
    // It is a cache. Discovery builds it again from the next balance updates.
  }
};

// The encrypted entry, or none. A wallet made in this session has none.
const hasSavedChoices = () =>
  store.getState().services.stored[ASSET_CHOICES_SERVICE_ID] != null;

export const loadAssetManagement = async (context = captureAssetContext()) => {
  assertCurrent(context);
  const current = store.getState().assetManagement;
  if (current.ready && current.networkKey === context.networkKey) return;
  const key = contextKey(context);
  if (hydrations.has(key)) return hydrations.get(key);
  const loading = (async () => {
    try {
      // A wallet made in this session has no saved choices or found assets.
      // Its first hydration reads no storage: during wallet setup each read
      // waits seconds, and Home's rows must be drawn when the coins fly in.
      const fresh = takeNewAssetChoices(context.sessionScope.accountHash) &&
        !hasSavedChoices();
      const saved = fresh
        ? choicesRecord({})
        : await loadAssetChoices(context.sessionScope.accountHash);
      assertCurrent(context);
      if (saved.version != null && saved.version !== 1) {
        throw new Error('Asset preferences version unavailable');
      }
      const {accountHash} = context.sessionScope;
      const network = saved.networks?.[context.networkKey] || {};
      if (!fresh) await moveSavedDiscovery(saved, accountHash);
      const discovery = (!fresh &&
        await loadAssetDiscoveryCache(accountHash, context.networkKey)) || network;
      dispatchForContext(context, ASSETS_HYDRATED, {
        ...choicesOnly(network),
        snapshots: discovery.snapshots,
        resolved: discovery.resolved,
        networkKey: context.networkKey,
      });
    } catch (error) {
      if (assetContextIsCurrent(context)) {
        dispatchForContext(context, ASSETS_HYDRATION_FAILED);
      }
      throw error;
    }
  })();
  // A fresh hydration can settle before this line runs, so clear the entry
  // after it is set, not in the loader.
  hydrations.set(key, loading);
  const clear = () => {
    if (hydrations.get(key) === loading) hydrations.delete(key);
  };
  loading.then(clear, clear);
  return loading;
};

// The screen shows the change at once. The encrypted write runs after it in
// the background (assetChoicesStorage.js); the user never waits for it.
const changeChoices = (context, update, publish) => {
  assertCurrent(context);
  const {preferences, removed, reviewed, order, sort} = store.getState().assetManagement;
  publish(update({preferences, removed, reviewed, order, sort}));
  queueAssetChoicesChange(context.sessionScope.accountHash, context.networkKey, update);
};

export const setAssetHomeVisibility = async (
  coin,
  shown,
  context = captureAssetContext(),
) => {
  await loadAssetManagement(context);
  assertCurrent(context);
  // The saved choice already says this, so there is nothing to write.
  if (isAssetShown(coin, store.getState().assetManagement.preferences) === shown) return;
  changeChoices(context, current => ({
    ...current,
    preferences: {
      ...current.preferences,
      [assetKey(coin)]: {hidden: !shown},
    },
  }), next => dispatchForContext(context, ASSET_PREFERENCES_SAVED, {
    preferences: next.preferences,
  }));
};

const setAssetRemoved = (key, removed, context) => {
  changeChoices(context, current => {
    const next = {...current.removed};
    if (removed) next[key] = removed;
    else delete next[key];
    return {...current, removed: next};
  }, next => dispatchForContext(context, ASSET_REMOVALS_SAVED, {
    removed: next.removed,
  }));
};

const restoreAssetPreferences = (coin, removedKey, context) => {
  changeChoices(context, current => {
    const removed = {...current.removed};
    delete removed[removedKey];
    return {
      ...current,
      removed,
      preferences: {
        ...current.preferences,
        [assetKey(coin)]: {hidden: false},
      },
    };
  }, next => {
    // Both changes come from one update, so the screens draw them once.
    unstable_batchedUpdates(() => {
      dispatchForContext(context, ASSET_PREFERENCES_SAVED, {
        preferences: next.preferences,
      });
      dispatchForContext(context, ASSET_REMOVALS_SAVED, {
        removed: next.removed,
      });
    });
  });
};

// Home stops asking about these found currencies once the user reviews or
// dismisses them; they stay under "New assets found" in Manage assets.
export const markFoundAssetsReviewed = async (
  currencyIds,
  context = captureAssetContext(),
) => {
  if (!currencyIds?.length) return;
  await loadAssetManagement(context);
  changeChoices(context, current => ({
    ...current,
    reviewed: {
      ...current.reviewed,
      ...Object.fromEntries(currencyIds.map(id => [id, true])),
    },
  }), next => dispatchForContext(context, ASSET_REVIEWS_SAVED, {
    reviewed: next.reviewed,
  }));
};

// "My order" (PR 266 review R2). The full list of the wallet's asset keys,
// hidden assets included, so a hidden asset keeps its place.
export const setAssetOrder = async (keys, context = captureAssetContext()) => {
  await loadAssetManagement(context);
  const order = readAssetOrder(keys) || [];
  changeChoices(context, current => ({...current, order}),
    next => dispatchForContext(context, ASSET_ORDER_SAVED, {order: next.order}));
};

// How Home sorts its rows. The choice stays with the asset choices.
export const setHomeSort = async (sort, context = captureAssetContext()) => {
  await loadAssetManagement(context);
  const next = readHomeSort(sort);
  if (store.getState().assetManagement.sort === next) return;
  changeChoices(context, current => ({...current, sort: next}),
    published => dispatchForContext(context, ASSET_SORT_SAVED, {sort: published.sort}));
};

// An asset that the wallet adds, or that the user adds back, goes to the end
// of "My order".
const appendToOrder = (coin, context) => {
  const key = assetKey(coin);
  const coins = (store.getState().coins.activeCoinsForUser || [])
    .filter(item => Boolean(item.testnet) === Boolean(coin.testnet));
  changeChoices(context, current => ({
    ...current,
    order: orderWithAddedAsset(current.order, [...coins, coin], key),
  }), next => dispatchForContext(context, ASSET_ORDER_SAVED, {order: next.order}));
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
    .filter(holding => !state.assetManagement.removed[holding.currencyId])
    .map(holding => ({...holding, result: state.assetManagement.resolved[holding.key]}))
    .filter(holding => holding.result != null);
};

// The found currencies Home still asks about.
export const getUnreviewedNewAssetHoldings = state =>
  getNewAssetHoldings(state).filter(
    holding => !state.assetManagement.reviewed?.[holding.currencyId],
  );

export const addManagedAsset = ({
  coin,
  result,
  automatic = false,
  context = captureAssetContext(),
}) => {
  const operation = additionQueue.catch(() => {}).then(async () => {
    await loadAssetManagement(context);
    assertCurrent(context);
    const removedKey = removalKey(coin || resolvedAssetCoin(result));
    const wasRemoved = Boolean(store.getState().assetManagement.removed[removedKey]);
    if (wasRemoved) {
      // Only the user brings a removed asset back.
      if (automatic) return null;
    }
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
      if (!automatic) {
        if (wasRemoved) {
          restoreAssetPreferences(existing, removedKey, context);
          appendToOrder(existing, context);
        } else await setAssetHomeVisibility(existing, true, context);
      }
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
    appendToOrder(added, context);
    if (!automatic) {
      if (wasRemoved) restoreAssetPreferences(added, removedKey, context);
      else await setAssetHomeVisibility(added, true, context);
    }
    return added;
  });
  additionQueue = operation.catch(() => {});
  return operation;
};

// Takes the asset out of this wallet. Its funds stay on the blockchain.
export const removeManagedAsset = ({coin, context = captureAssetContext()}) => {
  const operation = additionQueue.catch(() => {}).then(async () => {
    await loadAssetManagement(context);
    assertCurrent(context);
    const {activeAccount} = store.getState().authentication;
    if (isMainAsset(coin, activeAccount)) {
      throw new Error('The main coin stays in the wallet.');
    }
    // Mark it first, so a balance update during teardown cannot add it back.
    const key = removalKey(coin);
    setAssetRemoved(key, removedAssetRecord(coin), context);
    const nextCoins = await removeExistingCoin(
      coin.id,
      activeAccount.id,
      store.dispatch,
      false,
      {sessionScope: context.sessionScope, ownerAccountHash: activeAccount.accountHash},
    );
    assertCurrent(context);
    const setUserCoinsAction = setUserCoins(nextCoins, activeAccount.id);
    store.dispatch(scopeSessionAction(setUserCoinsAction, context.sessionScope));
    refreshLifecyclesAfterAssetChange(coin, setUserCoinsAction.payload.activeCoinsForUser);
  });
  additionQueue = operation.catch(() => {});
  return operation;
};

// Keeps a found currency out of "New assets found" without adding it.
export const ignoreAssetHolding = async (holding, context = captureAssetContext()) => {
  await loadAssetManagement(context);
  setAssetRemoved(holding.currencyId,
    removedAssetRecord(resolvedAssetCoin(holding.result), holding.systemId), context);
};

export const restoreManagedAsset = async ({entry, context = captureAssetContext()}) => {
  assertCurrent(context);
  const {coin, lookupSystemId} = entry;
  // Registered assets use the same add path as the catalogue.
  if (CoinDirectory.coinExistsInDirectory(coin.id)) {
    const registered = CoinDirectory.getBasicCoinObj(coin.id);
    if (Boolean(registered.testnet) === Boolean(coin.testnet)) {
      return addManagedAsset({coin: registered, context});
    }
  }
  // Ignored discoveries already have a resolved currency definition. Reuse it
  // on the same network and lookup system instead of repeating the RPC reads.
  await loadAssetManagement(context);
  assertCurrent(context);
  const cached = Object.values(store.getState().assetManagement.resolved || {}).find(result =>
    result.kind === 'pbaas' && coin.proto === 'vrsc' &&
    Boolean(result.testnet) === Boolean(coin.testnet) &&
    result.lookupSystemId === lookupSystemId &&
    result.currencyDefinition?.currencyid === coin.currency_id);
  if (cached) return addManagedAsset({result: cached, context});
  const result = await resolveAssetIdentifier({
    activeCoins: [],
    identifier: coin.currency_id,
    kind: coin.proto === 'erc20' ? 'erc20' : 'pbaas',
    pbaasCoin: {system_id: lookupSystemId, testnet: coin.testnet},
    ethereumCoin: {network: ethereumNetwork(coin)},
  });
  assertCurrent(context);
  return addManagedAsset({result, context});
};

const persistDiscovery = async context => {
  assertCurrent(context);
  const {revision, persistedRevision, snapshots, resolved} = store.getState().assetManagement;
  if (revision === persistedRevision) return;
  await saveAssetDiscoveryCache(
    context.sessionScope.accountHash,
    context.networkKey,
    {snapshots, resolved},
  );
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
    if (store.getState().assetManagement.removed[holding.currencyId]) continue;
    if ((job.retryAfter[holding.key] || 0) > Date.now()) continue;
    try {
      // Found currencies are never added by themselves, built-in ones
      // included: spam currencies can arrive too. They wait under "New assets
      // found" for the user (owner, 2026-10-26).
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
