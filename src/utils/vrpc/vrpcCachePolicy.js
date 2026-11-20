export const VRPC_ADDRESS_CACHE_REQUESTS = [
  'getaddressbalance',
  'getaddressdeltas',
  'getaddressmempool',
];

export const CACHED_VRPC_REQUESTS = [
  ...VRPC_ADDRESS_CACHE_REQUESTS,
  'getcurrency',
  'listcurrencies',
  'getinfo',
];

export const DEFAULT_VRPC_CACHE_MAX_AGE_MS = 60000;

export const VRPC_CACHE_MAX_AGE_MS = {
  getaddressbalance: 5000,
  getaddressdeltas: 10000,
  getaddressmempool: 10000,
  // F11: currency lists are expensive. They are saved with the time of the
  // request and asked again at most once per hour.
  listcurrencies: 60 * 60 * 1000,
  getinfo: 1000,
};

// Saved with their request time in storage (savedVrpcResponses.js), so their
// age also counts after a restart.
export const SAVED_VRPC_REQUESTS = ['listcurrencies'];

export const isVrpcResponseCacheable = command => {
  return CACHED_VRPC_REQUESTS.includes(command);
};

export const getVrpcCacheMaxAge = command => {
  return (
    VRPC_CACHE_MAX_AGE_MS[command] || DEFAULT_VRPC_CACHE_MAX_AGE_MS
  );
};

// `maxAgeMs` lets a display-only caller accept an older answer. A time after
// `now` (the clock moved back) never counts as fresh.
export const shouldUseCachedVrpcResponse = ({
  command,
  lastNetworkResponseAt,
  now = Date.now(),
  maxAgeMs = getVrpcCacheMaxAge(command),
}) => {
  const age = now - Number(lastNetworkResponseAt);
  return (
    isVrpcResponseCacheable(command) &&
    Number(lastNetworkResponseAt) > 0 &&
    age >= 0 &&
    age < maxAgeMs
  );
};
