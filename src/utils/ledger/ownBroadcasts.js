// Successful broadcasts per system (update, revoke, recover, transfer,
// registration payments, sends). Read gates use it to read again after the
// user's own transaction (PR 266 review F14). Memory only, no imports, so the
// VRPC interface can note a broadcast without an import cycle.
const ownBroadcasts = new Map();

export const noteOwnBroadcast = systemId => {
  if (systemId) ownBroadcasts.set(systemId, (ownBroadcasts.get(systemId) || 0) + 1);
};

export const ownBroadcastEpoch = systemId => ownBroadcasts.get(systemId) || 0;
