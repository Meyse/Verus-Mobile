import {getInfo} from '../api/channels/vrpc/requests/getInfo';
import {noteOwnBroadcast, ownBroadcastEpoch} from './ownBroadcasts';

export {noteOwnBroadcast, ownBroadcastEpoch};

// PR 266 review F14 (lead developer, 2026-11-20): VerusID status, identity
// content, registration confirmations and payer balances (confirmed-only)
// change only with a new block or with the user's own transaction. Screens
// that showed them read again on every focus or timer tick. A gate lets them
// read again only when the system's block height rose since their last read,
// or after this wallet broadcast a transaction on that system.

export const chainHeightOf = info => {
  const height = Number(info?.longestchain);
  return Number.isSafeInteger(height) ? height : null;
};

// One getinfo for the height. A failure gives null: a gate then reads only
// what it never read and what an own broadcast changed.
export const readChainHeight = async systemId => {
  try {
    const response = await getInfo(systemId);
    return {height: chainHeightOf(response?.result), info: response?.result || null};
  } catch (error) {
    return {height: null, info: null};
  }
};

export const createHeightReadGate = () => {
  // key -> {systemId, height, epoch} of the last successful read.
  const reads = new Map();

  return {
    // True when the key was never read, when the height rose since its last
    // read, or when this wallet broadcast on the system after that read.
    isDue(key, systemId, height) {
      const last = reads.get(key);
      if (last == null) return true;
      if (last.systemId !== systemId || last.epoch !== ownBroadcastEpoch(systemId)) return true;
      return Number.isSafeInteger(height) && height > last.height;
    },
    // Record a successful read. `epoch` is ownBroadcastEpoch(systemId) taken
    // before the read started, so a broadcast during the read is not missed.
    note(key, systemId, height, epoch) {
      const last = reads.get(key);
      const knownHeight = Number.isSafeInteger(height)
        ? height
        : (last?.systemId === systemId ? last.height : -1);
      reads.set(key, {systemId, height: knownHeight, epoch});
    },
    forget(key) {
      reads.delete(key);
    },
    // Keep only the keys the predicate accepts (unlinked VerusIDs, other
    // sessions).
    retain(keep) {
      for (const key of [...reads.keys()]) if (!keep(key)) reads.delete(key);
    },
    clear() {
      reads.clear();
    },
  };
};
