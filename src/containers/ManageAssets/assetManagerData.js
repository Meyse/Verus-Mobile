import {CoinDirectory} from '../../utils/CoinData/CoinDirectory';
import {coinsList} from '../../utils/CoinData/CoinsList';
import {uniqueAssets} from '../../utils/assets/assetIdentity';
import {START_COINS} from '../../utils/constants/constants';
import {WYRE_SERVICE} from '../../utils/constants/intervalConstants';

const sortCoins = (coins, priorityIds = []) => {
  const priority = new Map(priorityIds.map((id, index) => [id, index]));

  return [...coins].sort((left, right) => {
    const leftRank = priority.has(left.id)
      ? priority.get(left.id)
      : Number.MAX_SAFE_INTEGER;
    const rightRank = priority.has(right.id)
      ? priority.get(right.id)
      : Number.MAX_SAFE_INTEGER;

    if (leftRank !== rightRank) return leftRank - rightRank;

    return (left.display_ticker || left.display_name || left.id).localeCompare(
      right.display_ticker || right.display_name || right.id,
    );
  });
};

const getStarterIds = (testAccount, testnetOverrides) =>
  START_COINS.map(coinId =>
    testAccount ? testnetOverrides?.[coinId] : coinId,
  ).filter(Boolean);

const getCatalogueIds = ({activeAccount, testAccount}) => {
  if (testAccount) return CoinDirectory.testCoinList;

  return activeAccount?.disabledServices?.[WYRE_SERVICE]
    ? CoinDirectory.enabledNameList
    : CoinDirectory.supportedCoinList;
};

const getCatalogueCoin = coinId => {
  try {
    return CoinDirectory.getBasicCoinObj(coinId);
  } catch (error) {
    console.warn(`Unable to load asset catalogue entry ${coinId}`, error);
    return null;
  }
};

export const buildAssetManagerData = ({
  activeAccount,
  activeCoins,
  testAccount,
}) => {
  const starterIds = getStarterIds(
    testAccount,
    activeAccount?.testnetOverrides,
  );
  const catalogue = sortCoins(
    uniqueAssets(
      getCatalogueIds({activeAccount, testAccount})
        .filter(id => Object.prototype.hasOwnProperty.call(coinsList, id))
        .map(getCatalogueCoin)
        .filter(Boolean),
    ),
    starterIds,
  );
  const activeAssets = sortCoins(uniqueAssets((activeCoins || [])
    .filter(coin => Boolean(coin.testnet) === testAccount)), starterIds);
  return {activeAssets, catalogue};
};
