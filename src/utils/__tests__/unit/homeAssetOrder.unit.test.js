// PR 266 review R2 (owner pick B, 2026-11-19): Home keeps "My order" by
// default, so a row does not move when a balance or a price changes.
const BigNumber = require('bignumber.js');
const {
  HOME_SORT_BALANCE,
  HOME_SORT_CUSTOM,
  HOME_SORT_NAME,
  orderWithAddedAsset,
  orderedAssetKeys,
  readAssetOrder,
  readHomeSort,
  sortHomeAssets,
} = require('../../assets/assetOrder');
const {assetManagement, ASSETS_HYDRATED} = require('../../../reducers/assetManagement');

const coin = id => ({id, currency_id: id, proto: 'vrsc', system_id: 'iSystem', testnet: true});
const key = id => `testnet:vrsc:iSystem:${id}`;
const VRSC = coin('VRSCTEST');
const ZETA = coin('zeta');
const ALPHA = coin('Alpha');
const BETA = coin('beta');
// The wallet's coin list, in the order the assets were added.
const COINS = [VRSC, ZETA, ALPHA, BETA];

const row = (item, name, balance, fiatValue) => ({
  coin: item,
  presentation: {name},
  balance: balance == null ? null : BigNumber(balance),
  fiatValue,
});
const names = rows => rows.map(item => item.presentation.name);

describe('Home asset order (R2)', () => {
  it('keeps "My order" when balances and prices change', () => {
    const order = orderedAssetKeys([key('beta'), key('VRSCTEST')], COINS);
    const before = [
      row(VRSC, 'Verus Testnet', 100, 86.2),
      row(ZETA, 'zeta', 1, 0.08),
      row(ALPHA, 'Alpha', 0, 0),
      row(BETA, 'beta', 2, 0.05),
    ];
    // beta's price jumps above Verus Testnet; the rows stay in place.
    const after = before.map(item => (item.coin === BETA ? {...item, fiatValue: 500} : item));

    expect(names(sortHomeAssets(before, HOME_SORT_CUSTOM, order)))
      .toEqual(['beta', 'Verus Testnet', 'zeta', 'Alpha']);
    expect(names(sortHomeAssets(after, HOME_SORT_CUSTOM, order)))
      .toEqual(['beta', 'Verus Testnet', 'zeta', 'Alpha']);
  });

  it('sorts by balance: funded first, then the higher value, then a known price', () => {
    const order = orderedAssetKeys(null, COINS);
    const rows = [
      row(VRSC, 'Verus Testnet', 0, 0),
      row(ZETA, 'zeta', 3, null),
      row(ALPHA, 'Alpha', 1, 0.5),
      row(BETA, 'beta', 2, 4),
    ];
    expect(names(sortHomeAssets(rows, HOME_SORT_BALANCE, order)))
      .toEqual(['beta', 'Alpha', 'zeta', 'Verus Testnet']);
  });

  it('sorts by name without case, and equal names keep "My order"', () => {
    const order = orderedAssetKeys([key('beta'), key('zeta')], COINS);
    const rows = [
      row(VRSC, 'Verus Testnet', 0, 0),
      row(ZETA, 'Same', 0, 0),
      row(ALPHA, 'alpha', 0, 0),
      row(BETA, 'same', 0, 0),
    ];
    const sorted = sortHomeAssets(rows, HOME_SORT_NAME, order);
    expect(sorted.map(item => item.coin.id)).toEqual(['Alpha', 'beta', 'zeta', 'VRSCTEST']);
  });

  it('starts a wallet without a saved order in the order of its coin list', () => {
    // Every wallet from before this build has no saved order.
    expect(orderedAssetKeys(null, COINS)).toEqual(COINS.map(item => key(item.id)));
    expect(orderedAssetKeys(undefined, COINS)).toEqual(COINS.map(item => key(item.id)));

    const state = assetManagement(undefined, {
      type: ASSETS_HYDRATED,
      payload: {networkKey: 'testnet:VRSCTEST:GETH', preferences: {}, removed: {}, reviewed: {}},
    });
    expect(state.order).toBeNull();
    expect(state.sort).toBe(HOME_SORT_CUSTOM);
  });

  it('reads a damaged saved order or sort as the default', () => {
    expect(readHomeSort('value')).toBe(HOME_SORT_CUSTOM);
    expect(readHomeSort(undefined)).toBe(HOME_SORT_CUSTOM);
    expect(readHomeSort(HOME_SORT_NAME)).toBe(HOME_SORT_NAME);
    expect(readAssetOrder({0: 'a'})).toBeNull();
    expect(readAssetOrder(['a', 4, '', 'a', 'b'])).toEqual(['a', 'b']);
  });

  it('puts a new asset at the end and leaves no gap for a removed one', () => {
    const saved = [key('beta'), key('zeta'), key('VRSCTEST'), key('Alpha')];
    // zeta is removed from the wallet: the others close up.
    const afterRemove = orderedAssetKeys(saved, [VRSC, ALPHA, BETA]);
    expect(afterRemove).toEqual([key('beta'), key('VRSCTEST'), key('Alpha')]);

    // A new asset goes to the end.
    const GAMMA = coin('gamma');
    expect(orderWithAddedAsset(saved, [VRSC, ZETA, ALPHA, BETA, GAMMA], key('gamma')))
      .toEqual([...saved, key('gamma')]);
    // zeta added back goes to the end too, not to its old place.
    expect(orderWithAddedAsset(saved, [VRSC, ALPHA, BETA, ZETA], key('zeta')))
      .toEqual([key('beta'), key('VRSCTEST'), key('Alpha'), key('zeta')]);
    // A wallet without a saved order: the coin list order, then the new asset.
    expect(orderWithAddedAsset(null, [ZETA, VRSC, ALPHA], key('zeta')))
      .toEqual([key('VRSCTEST'), key('Alpha'), key('zeta')]);
  });
});
