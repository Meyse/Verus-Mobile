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
const hourly = new Map();
const pending = new Map();

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

// Waits until no request is in flight, so a chart load ends with one write.
const scheduleWrite = () => {
  dirty = true;
  clearTimeout(writeTimer);
  writeTimer = setTimeout(() => {
    writeTimer = null;
    if (pending.size > 0) return; // The last request to finish schedules the write again.
    write().catch((error) => console.warn('Could not save the portfolio prices.', error.message));
  }, WRITE_DELAY_MS);
};

// Store only public samples. Balance amounts and account hashes never enter this cache.
// The key names list the wallet's coins, so the cache is in encrypted storage.
// A successful daily/hourly request is reused for its whole clock period.
export const cachedHistory = async ({
  key, start, end, stamp, memory = false, oncePerPeriod = false, fetchSamples, canFetch,
}) => {
  const entries = memory ? hourly : await read();
  const get = () => (memory ? entries.get(key) : entries[key]);
  const entry = get();
  if (entry?.stamp === stamp && (oncePerPeriod || entry.from <= start)) return entry.samples;
  if (!canFetch()) return entry?.samples || [];
  if (pending.has(key)) return pending.get(key);
  const version = generation;
  const promise = (async () => {
    const from = entry && entry.from <= start ? Math.max(start, entry.through) : start;
    const samples = await fetchSamples(from, end);
    if (!samples.length) throw new Error('Price history returned no usable samples.');
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
    if (dirty && pending.size === 0) scheduleWrite();
  });
  pending.set(key, promise);
  return promise;
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
  clearTimeout(writeTimer);
  writeTimer = null;
  dirty = false;
  await queue;
  stored = {};
  load = Promise.resolve(stored);
  await SecureStorage.removeItem(KEY);
};
