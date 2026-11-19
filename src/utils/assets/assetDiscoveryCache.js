// Found-asset snapshots and resolved currency data are a cache of chain reads.
// They hold addresses, balances and the currencies at them, so they stay in
// memory for this app run only and are never written to storage. After a
// restart, the first balance pass builds them again.
const caches = new Map();
const cacheKey = (accountHash, networkKey) => `${accountHash}:${networkKey}`;

export const loadAssetDiscoveryCache = async (accountHash, networkKey) =>
  caches.get(cacheKey(accountHash, networkKey)) || null;

export const saveAssetDiscoveryCache = async (accountHash, networkKey, {snapshots, resolved}) => {
  caches.set(cacheKey(accountHash, networkKey), {
    snapshots: snapshots || {},
    resolved: resolved || {},
  });
};

export const deleteAssetDiscoveryCache = async accountHash => {
  for (const key of [...caches.keys()]) {
    if (key.startsWith(`${accountHash}:`)) caches.delete(key);
  }
};
