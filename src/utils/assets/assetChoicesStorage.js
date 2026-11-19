import AsyncStorage from '@react-native-async-storage/async-storage';
import store from '../../store';
import {modifyServiceStoredDataForUser} from '../../actions/actions/services/dispatchers/services';
import {captureSessionScope} from '../../actions/actions/updates/sessionRequests';
import {requestServiceStoredData} from '../auth/authBox';

// The asset choices of a profile (shown, removed, ignored, reviewed) are in
// the profile's password-encrypted service data, in the entry
// "wallet_asset_management" (PR 266 review R17). The record format is the
// same as before 2026-11-11.
//
// A choice goes to the screen first. The encrypted write runs after it, in
// the background, because one write encrypts the service data of all
// profiles again. Changes wait in memory, in order, until a write confirms
// them. A failed write keeps them, and the next change, sign-in or sign-out
// writes them again. If the app stops before a write ends, the last choice
// can be lost (owner decision, 2026-11-19).
export const ASSET_CHOICES_SERVICE_ID = 'wallet_asset_management';
const MAX_SESSION_ATTEMPTS = 3;
const FINISH_TIMEOUT = 20000;

// Builds from 2026-11-11 to 2026-11-19 kept the choices in this plain key.
// The first unlock moves them into the encrypted entry, then deletes the key.
const plainKey = accountHash => `assetChoices:v1:${accountHash}`;
const isRecord = value => value != null && typeof value === 'object' && !Array.isArray(value);

export const validateAssetChoices = (saved, legacy = false) => {
  if (saved?.version != null && saved.version !== 1) {
    const error = new Error('Asset preferences version unavailable');
    error.code = 'ASSET_CHOICES_VERSION';
    throw error;
  }
  if (!isRecord(saved) || (!legacy && saved.version !== 1) ||
      (!isRecord(saved.networks) && !(legacy && saved.networks == null)) ||
      Object.values(saved.networks || {}).some(network => !isRecord(network) ||
        ['preferences', 'removed', 'reviewed'].some(key =>
          network[key] != null && !isRecord(network[key])))) {
    throw new Error('Unable to read asset preferences');
  }
  return saved;
};

// Choices are stored. The discovery cache stays in memory (assetDiscoveryCache.js).
export const choicesOnly = ({snapshots, resolved, ...choices}) => choices;
export const choicesRecord = saved => ({
  ...saved,
  version: 1,
  networks: Object.fromEntries(Object.entries(saved.networks || {})
    .map(([networkKey, network]) => [networkKey, choicesOnly(network)])),
});

// Each change sets keys to values, so a change that is applied two times
// gives the same record.
const applyChanges = (saved, changes) => {
  const networks = {...(saved.networks || {})};
  for (const {networkKey, update} of changes) {
    networks[networkKey] = update(networks[networkKey] || {});
  }
  return choicesRecord({...saved, networks});
};

// One writer for each profile. Its chain runs reads and writes one at a time,
// so a read never sees a half-moved record and two writes never overlap.
const writers = new Map();
const newWriter = () => ({
  tail: Promise.resolve(),
  changes: [],
  migration: null,
  scheduled: null,
  closed: false,
});
const openWriter = accountHash => {
  let writer = writers.get(accountHash);
  if (!writer || writer.closed) {
    writer = newWriter();
    writers.set(accountHash, writer);
  }
  return writer;
};
const runInChain = (writer, operation) => {
  const result = writer.tail.then(operation);
  writer.tail = result.catch(() => {});
  return result;
};

const ownerSignedIn = accountHash => {
  const {authentication} = store.getState();
  return authentication.signedIn === true &&
    authentication.activeAccount?.accountHash === accountHash;
};

const sessionChanged = () => {
  const error = new Error('The active wallet changed.');
  error.code = 'SESSION_CHANGED';
  return error;
};

const writeEntry = async (accountHash, writer, update) => {
  for (let attempt = 1; ; attempt += 1) {
    // Checked before each entry into the service queue. A profile delete
    // closes the writer first, so no write enters the queue after the delete.
    if (writer.closed || !ownerSignedIn(accountHash)) throw sessionChanged();
    try {
      // The service queue reads the password inside the queue. A password
      // change holds the same queue, so a write never mixes two passwords.
      return await modifyServiceStoredDataForUser(
        saved => update(validateAssetChoices(saved, true)),
        ASSET_CHOICES_SERVICE_ID,
        accountHash,
        {sessionScope: captureSessionScope(store.getState(), accountHash)},
      );
    } catch (error) {
      // A password change starts a new session for the same profile. Write
      // again with the new password while that profile is signed in.
      if (error?.code !== 'SESSION_CHANGED' || attempt >= MAX_SESSION_ATTEMPTS ||
          writer.closed || !ownerSignedIn(accountHash)) {
        throw error;
      }
    }
  }
};

const flush = async (accountHash, writer) => {
  // Signed out or deleted: keep the changes. Sign-in writes them.
  if (writer.closed || !ownerSignedIn(accountHash)) return;
  const {migration} = writer;
  if (migration) {
    if (!migration.written) {
      await writeEntry(accountHash, writer, () => migration.record);
      migration.written = true;
    }
    // Delete the plain key only after the encrypted write is confirmed.
    // Changes wait until it is gone: otherwise the next unlock moves the old
    // plain record over them.
    await AsyncStorage.removeItem(plainKey(accountHash));
    if (writer.migration === migration) writer.migration = null;
  }
  const batch = writer.changes.slice();
  if (batch.length === 0) return;
  // All changes that wait go into one write (K3).
  await writeEntry(accountHash, writer, saved => applyChanges(saved, batch));
  writer.changes.splice(0, batch.length);
};

const scheduleFlush = (accountHash, writer) => {
  if (writer.scheduled) return writer.scheduled;
  const scheduled = runInChain(writer, () => {
    // Changes from now on go into the next write.
    if (writer.scheduled === scheduled) writer.scheduled = null;
    return flush(accountHash, writer);
  });
  writer.scheduled = scheduled;
  scheduled.catch(error => {
    if (error?.code === 'SESSION_CHANGED') return;
    console.warn('Could not save the asset choices. The next change tries again.', error?.message);
  });
  return scheduled;
};

const hasWork = writer => writer.migration != null || writer.changes.length > 0;

// Reads the saved choices of the signed-in profile. Changes that wait for a
// write are applied on top, so a new read never shows an older choice.
export const loadAssetChoices = accountHash => {
  const writer = openWriter(accountHash);
  const loading = runInChain(writer, async () => {
    if (!ownerSignedIn(accountHash)) throw sessionChanged();
    // Only an absent plain key reads the encrypted entry. A read error, an
    // unreadable record or a future version fails and keeps both records.
    const raw = await AsyncStorage.getItem(plainKey(accountHash));
    let saved;
    if (raw !== null) {
      saved = choicesRecord(validateAssetChoices(JSON.parse(raw)));
      if (!writer.migration) writer.migration = {record: saved, written: false};
    } else {
      saved = validateAssetChoices(
        await requestServiceStoredData(ASSET_CHOICES_SERVICE_ID), true);
    }
    if (!ownerSignedIn(accountHash)) throw sessionChanged();
    return applyChanges(saved, writer.changes);
  });
  // Move the plain record, or write changes that failed before.
  loading.then(() => {
    if (hasWork(writer)) scheduleFlush(accountHash, writer);
  }, () => {});
  return loading;
};

// The screen already shows the change. The write runs after it.
export const queueAssetChoicesChange = (accountHash, networkKey, update) => {
  // The profile is being deleted. Nothing may write after the delete.
  if (writers.get(accountHash)?.closed) return Promise.resolve();
  const writer = openWriter(accountHash);
  writer.changes.push({networkKey, update});
  return scheduleFlush(accountHash, writer);
};

const withTimeout = (promise, timeout) => {
  let timer;
  return Promise.race([
    promise.catch(() => {}),
    new Promise(resolve => { timer = setTimeout(resolve, timeout); }),
  ]).finally(() => clearTimeout(timer));
};

// Sign-out waits for the writes of the profile, so the last choice is saved
// while the password is still available.
export const finishAssetChoiceWrites = (accountHash, timeout = FINISH_TIMEOUT) => {
  const writer = writers.get(accountHash);
  if (!writer || writer.closed) return Promise.resolve();
  if (hasWork(writer)) scheduleFlush(accountHash, writer);
  return withTimeout(writer.tail, timeout);
};

// Profile delete: drop the changes that wait and wait for a write that runs,
// so no write can come after the delete.
export const closeAssetChoices = (accountHash, timeout = FINISH_TIMEOUT) => {
  const writer = writers.get(accountHash);
  if (!writer) return Promise.resolve();
  writer.closed = true;
  writer.changes = [];
  writer.migration = null;
  return withTimeout(writer.tail, timeout);
};

// The delete failed and the profile stays: accept changes again.
export const reopenAssetChoices = accountHash => {
  if (writers.get(accountHash)?.closed) writers.delete(accountHash);
};

// Profiles created in this session. The first hydration of one skips the
// storage reads; later ones read storage as usual.
const newProfiles = new Set();
export const markNewAssetChoices = accountHash => {
  newProfiles.add(accountHash);
  // A new profile can have the name of a profile deleted in this session.
  writers.delete(accountHash);
};
export const takeNewAssetChoices = accountHash => newProfiles.delete(accountHash);

// Deletes the plain key of builds from 2026-11-11 to 2026-11-19.
export const deleteAssetChoices = accountHash =>
  AsyncStorage.removeItem(plainKey(accountHash));
