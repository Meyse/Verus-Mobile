import {
  SecureStorage,
  PORTFOLIO_PRICE_CACHE_STORAGE_INTERNAL_KEY as KEY,
} from '../keychain/secureStore';

// Each write encrypts the whole cache in JavaScript. Requests of one chart load
// finish close together, so one write follows the last of them.
const WRITE_DELAY_MS = 1000;
let stored;
let load;
let queue = Promise.resolve();
let generation = 0;
let dirty = false;
let writeTimer = null;
let activeLoads = 0;
const hourly = new Map();
const pending = new Map();
// A failed request is not tried again for a while, also for a wider range. The
// chart load asks twice in a row and again on each refresh; the price APIs are
// rate-limited.
export const RETRY_AFTER_MS = 10 * 60 * 1000;
const failures = new Map();

export const mergeSamples = (...lists) => [...new Map(lists.flat().map((p) => [p[0], p])).values()]
  .sort((a, b) => a[0] - b[0]);

const read = async () => {
  if (!load) {
    load = SecureStorage.getItem(KEY).then((value) => {
      stored = value ? JSON.parse(value) : {};
      return stored;
    }).catch((error) => {
      // It is a cache: an unreadable one is the same as none. The next write replaces it.
      console.warn('Could not read the saved portfolio prices.', error.message);
      stored = {};
      return stored;
    });
  }
  return load;
};

const write = () => {
  const next = queue.then(async () => {
    if (!dirty) return;
    dirty = false;
    try {
      await SecureStorage.setItem(KEY, JSON.stringify(stored));
    } catch (error) {
      dirty = true;
      throw error;
    }
  });
  queue = next.catch(() => {});
  return next;
};

const busy = () => pending.size > 0 || activeLoads > 0;

// Waits until no price load and no request is in flight, so a chart load ends
// with one write.
const scheduleWrite = () => {
  dirty = true;
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = null;
    if (busy()) return; // The last load or request to finish schedules the write again.
    write().catch((error) => console.warn('Could not save the portfolio prices.', error.message));
  }, WRITE_DELAY_MS);
};

// Store only public samples. Balance amounts and account hashes never enter this cache.
// The key names list the wallet's coins, so the cache is in encrypted storage.
// All wallets share an entry, so it is reused for its clock period only when it
// covers the requested start. Otherwise the request fetches from that start.
export const cachedHistory = async ({
  key, start, end, stamp, memory = false, fetchSamples, canFetch,
}) => {
  const entries = memory ? hourly : await read();
  const get = () => (memory ? entries.get(key) : entries[key]);
  const entry = get();
  if (entry?.stamp === stamp && entry.from <= start) return entry.samples;
  const failure = failures.get(key);
  // As after the failure itself, the caller then uses the saved samples, and the
  // chart marks the days they do not cover.
  if (failure && failure.start <= start && Date.now() - failure.at < RETRY_AFTER_MS) {
    throw new Error('Price history failed recently.');
  }
  if (!canFetch()) return entry?.samples || [];
  if (pending.has(key)) return pending.get(key);
  const version = generation;
  const promise = (async () => {
    const from = entry && entry.from <= start ? Math.max(start, entry.through) : start;
    let samples;
    try {
      samples = await fetchSamples(from, end);
      if (!samples.length) throw new Error('Price history returned no usable samples.');
    } catch (error) {
      // A request that stopped because Home lost focus did not fail.
      if (version === generation && canFetch()) {
        failures.set(key, {start, at: Date.now()});
      }
      throw error;
    }
    failures.delete(key);
    const merged = mergeSamples(entry?.samples || [], samples);
    const result = {
      samples: memory ? merged.filter((sample) => sample[0] >= start) : merged,
      from: Math.min(start, entry?.from ?? start),
      through: end,
      stamp,
    };
    if (version === generation) {
      if (memory) entries.set(key, result);
      else {
        entries[key] = result;
        dirty = true;
      }
    }
    return result.samples;
  })().finally(() => {
    if (pending.get(key) === promise) pending.delete(key);
    if (dirty && !busy()) scheduleWrite();
  });
  pending.set(key, promise);
  return promise;
};

// Wraps one price load (route lookup and its requests) so the write waits for all of it.
export const trackPriceLoad = (load) => async (...args) => {
  activeLoads += 1;
  try {
    return await load(...args);
  } finally {
    activeLoads -= 1;
    if (dirty && !busy()) scheduleWrite();
  }
};

// Saved data without a request. Both return undefined until the store is loaded.
export const loadPriceCache = () => read();
export const savedSamples = (keys) => stored
  && mergeSamples(...keys.map((key) => stored[key]?.samples || []));
export const savedNote = (key) => stored?.[key];
// A note is a small public fact beside the samples, such as where a coin's samples are.
export const saveNote = async (key, note) => {
  const entries = await read();
  if (JSON.stringify(entries[key]) === JSON.stringify(note)) return;
  entries[key] = note;
  scheduleWrite();
};

export const clearPortfolioPriceCache = async () => {
  generation += 1;
  hourly.clear();
  pending.clear();
  failures.clear();
  clearTimeout(writeTimer);
  writeTimer = null;
  dirty = false;
  await queue;
  stored = {};
  load = Promise.resolve(stored);
  await SecureStorage.removeItem(KEY);
};
