import {fromBase58Check} from 'verus-typescript-primitives';
import {createPersistentCache} from './createPersistentCache';
const crypto = require('react-native-crypto');

// Saved VRPC answers that keep the time of their request, so their age also
// counts after a restart: currency lists (`listcurrencies`, F11), currency
// definitions read for their fixed fields (`getcurrency`, F10) and the last
// block height seen. All are public chain data. Never save an answer here that
// holds an address, a balance or anything else that links to the wallet: this
// storage is not encrypted.
//
// react-native-cache writes its whole namespace on every write, so each kind
// has its own namespace: a height or a definition never rewrites the lists.
export const SAVED_VRPC_LIST = 'list';
export const SAVED_VRPC_DEFINITION = 'definition';
export const SAVED_VRPC_HEIGHT = 'height';

const parseSaved = value => {
  const parsed = JSON.parse(value);
  return parsed != null &&
    typeof parsed === 'object' &&
    Number.isFinite(parsed.savedAt) &&
    parsed.response != null &&
    typeof parsed.response === 'object'
    ? parsed
    : null;
};

const createStore = (kind, maxEntries) => createPersistentCache({
  namespace: `vrpc_saved_${kind}`,
  maxEntries,
  validateValue: value => typeof value === 'string' && parseSaved(value) != null,
  name: `saved vrpc ${kind}`,
});

const stores = {
  [SAVED_VRPC_LIST]: createStore(SAVED_VRPC_LIST, 50),
  [SAVED_VRPC_DEFINITION]: createStore(SAVED_VRPC_DEFINITION, 500),
  [SAVED_VRPC_HEIGHT]: createStore(SAVED_VRPC_HEIGHT, 20),
};

export const initSavedVrpcResponses = () =>
  Promise.all(Object.values(stores).map(store => store.initialize()));

export const clearSavedVrpcResponses = () =>
  Promise.all(Object.values(stores).map(store => store.clear()));

/**
 * One key per system, scope and request parameters. A currency list is saved
 * per server (`scope` is the endpoint). A currency definition is the same on
 * every server of a system, so its scope is a fixed word.
 * @param {string} systemId
 * @param {string} scope
 * @param {{prepare: () => object}} request
 */
export const getSavedVrpcResponseKey = (systemId, scope, request) =>
  crypto.createHash('sha256')
    .update(fromBase58Check(systemId).hash)
    .update(Buffer.from(String(scope), 'utf8'))
    .update(Buffer.from(JSON.stringify(request.prepare()), 'utf8'))
    .digest()
    .toString('hex');

// {savedAt, response}, or null when nothing usable is saved.
export const getSavedVrpcResponse = async (kind, key) => {
  const value = await stores[kind].cache.getItem(key);
  if (value == null) return null;
  try {
    return parseSaved(value);
  } catch (_) {
    return null;
  }
};

export const saveVrpcResponse = (kind, key, response, savedAt = Date.now()) =>
  stores[kind].cache.setItem(key, JSON.stringify({savedAt, response}));
