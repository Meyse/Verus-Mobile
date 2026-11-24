import {assetKey, uniqueAssets} from './assetIdentity';

// Home sorts its asset rows in one of three ways (PR 266 review R2, owner
// pick B, 2026-11-19). "My order" is the default: a row never moves by itself.
export const HOME_SORT_CUSTOM = 'custom';
export const HOME_SORT_BALANCE = 'balance';
export const HOME_SORT_NAME = 'name';
export const HOME_SORTS = [HOME_SORT_CUSTOM, HOME_SORT_BALANCE, HOME_SORT_NAME];

// Saved values come from storage. A value that is not valid gives the default,
// so a damaged entry never blocks the asset choices.
export const readHomeSort = value => (HOME_SORTS.includes(value) ? value : HOME_SORT_CUSTOM);
// The saved direction of the Home sort. Only a stored `true` reverses; a
// missing or damaged value is "not reversed".
export const readSortReversed = value => value === true;
export const readAssetOrder = value => (Array.isArray(value)
  ? [...new Set(value.filter(key => typeof key === 'string' && key.length > 0))]
  : null);

// The keys of the wallet's assets in "My order". Saved keys come first, in
// their saved order. Assets without a saved place follow in the order of the
// wallet's coin list, which is the order they were added to this phone. A
// wallet without a saved order (every wallet before this build) therefore
// starts in that order. Keys of assets that are gone are dropped, so a removed
// asset leaves no gap.
export const orderedAssetKeys = (savedOrder, coins) => {
  const present = uniqueAssets(coins).map(assetKey);
  const presentSet = new Set(present);
  const saved = (readAssetOrder(savedOrder) || []).filter(key => presentSet.has(key));
  const savedSet = new Set(saved);
  return [...saved, ...present.filter(key => !savedSet.has(key))];
};

// The order after an asset is added: the asset goes to the end, also when it
// was in the wallet before.
export const orderWithAddedAsset = (savedOrder, coins, key) => [
  ...orderedAssetKeys(savedOrder, coins).filter(item => item !== key),
  key,
];

// Moves one key of the full order to the place of another key.
export const moveAssetKey = (keys, fromKey, toKey) => {
  const from = keys.indexOf(fromKey);
  const to = keys.indexOf(toKey);
  if (from < 0 || to < 0 || from === to) return keys;
  const next = [...keys];
  next.splice(from, 1);
  next.splice(to, 0, fromKey);
  return next;
};

export const orderAssets = (coins, savedOrder) => {
  const index = new Map(orderedAssetKeys(savedOrder, coins).map((key, place) => [key, place]));
  return [...coins].sort((left, right) =>
    (index.get(assetKey(left)) ?? Number.MAX_SAFE_INTEGER) -
    (index.get(assetKey(right)) ?? Number.MAX_SAFE_INTEGER));
};

const compareNames = (left, right) =>
  left.presentation.name.localeCompare(right.presentation.name, undefined, {sensitivity: 'base'});

// The Balance sort is the earlier Home rule: funded assets first, then the
// higher money value, then assets with a price, then the name.
const compareBalance = (a, b) => {
  const fundedOrder = Number(b.balance?.isGreaterThan(0) || false) - Number(a.balance?.isGreaterThan(0) || false);
  if (fundedOrder !== 0) return fundedOrder;
  if (a.fiatValue != null && b.fiatValue != null && a.fiatValue !== b.fiatValue) {
    return b.fiatValue - a.fiatValue;
  }
  if (a.fiatValue != null && b.fiatValue == null) return -1;
  if (a.fiatValue == null && b.fiatValue != null) return 1;
  return compareNames(a, b);
};

// Home rows: items with `coin`, `presentation`, `balance` and `fiatValue`.
// Ties keep "My order", so equal names or values never swap places.
// `reversed` gives the exact reverse of the list that the sort gives.
export const sortHomeAssets = (items, sort, orderKeys, reversed = false) => {
  const index = new Map(orderKeys.map((key, place) => [key, place]));
  const place = item => index.get(assetKey(item.coin)) ?? Number.MAX_SAFE_INTEGER;
  const mode = readHomeSort(sort);
  const sorted = [...items].sort((a, b) => {
    const result = mode === HOME_SORT_BALANCE ? compareBalance(a, b)
      : mode === HOME_SORT_NAME ? compareNames(a, b)
        : 0;
    return result !== 0 ? result : place(a) - place(b);
  });
  return readSortReversed(reversed) ? sorted.reverse() : sorted;
};
