import {fromBase58Check} from 'verus-typescript-primitives';
import {createPersistentCache} from './createPersistentCache';
const crypto = require('react-native-crypto');

// Saved VRPC answers that keep the time of their request, so their age also
// counts after a restart: currency lists (`listcurrencies`) and currency
// definitions read for static fields (`getcurrency`). Both are public chain
// data. Never save an answer here that holds an address, a balance or anything
// else that links to the wallet: this storage is not encrypted.
export const SAVED_VRPC_RESPONSE_CACHE_CAP = 500;
const SAVED_VRPC_RESPONSE_NAMESPACE = 'vrpc_saved';

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

const {
  cache: savedVrpcResponseCache,
  initialize: initSavedVrpcResponses,
  clear: clearSavedVrpcResponses,
} = createPersistentCache({
  namespace: SAVED_VRPC_RESPONSE_NAMESPACE,
  maxEntries: SAVED_VRPC_RESPONSE_CACHE_CAP,
  validateValue: value => typeof value === 'string' && parseSaved(value) != null,
  name: 'saved vrpc',
});

export {initSavedVrpcResponses, clearSavedVrpcResponses};

/**
 * One key per system, scope and request parameters. A currency list is saved
 * per server (`scope` is the endpoint). A currency definition is the same on
 * every server of a system, so its scope is a fixed word.
 * @param {string} systemId
 * @param {string} scope
 * @param {import('verus-typescript-primitives').ApiRequest} request
 */
export const getSavedVrpcResponseKey = (systemId, scope, request) =>
  crypto.createHash('sha256')
    .update(fromBase58Check(systemId).hash)
    .update(Buffer.from(String(scope), 'utf8'))
    .update(Buffer.from(JSON.stringify(request.prepare()), 'utf8'))
    .digest()
    .toString('hex');

// {savedAt, response}, or null when nothing usable is saved.
export const getSavedVrpcResponse = async key => {
  const value = await savedVrpcResponseCache.getItem(key);
  if (value == null) return null;
  try {
    return parseSaved(value);
  } catch (_) {
    return null;
  }
};

export const saveVrpcResponse = (key, response, savedAt = Date.now()) =>
  savedVrpcResponseCache.setItem(key, JSON.stringify({savedAt, response}));
